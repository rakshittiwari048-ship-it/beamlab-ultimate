/**
 * SparseMatrix.ts
 * 
 * Efficient sparse matrix implementation using Dictionary of Keys (DOK) for assembly
 * and Compressed Sparse Row (CSR) format for computation.
 * 
 * Optimized for structural stiffness matrices which are:
 * - Symmetric
 * - Sparse (typically 0.1-2% non-zero for large structures)
 * - Positive definite
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Compressed Sparse Row (CSR) format
 * 
 * For a matrix with n rows and nnz non-zero elements:
 * - values[nnz]: Non-zero values, row by row
 * - colIndices[nnz]: Column index for each value
 * - rowPtrs[n+1]: Index in values where each row starts (rowPtrs[n] = nnz)
 * 
 * To iterate row i: for j = rowPtrs[i] to rowPtrs[i+1]-1
 *   value = values[j], col = colIndices[j]
 */
export interface CSRMatrix {
  /** Number of rows */
  rows: number;
  /** Number of columns */
  cols: number;
  /** Number of non-zero elements */
  nnz: number;
  /** Non-zero values in row-major order */
  values: Float64Array;
  /** Column index for each non-zero value */
  colIndices: Uint32Array;
  /** Start index in values[] for each row (length = rows + 1) */
  rowPtrs: Uint32Array;
}

/**
 * Sparse matrix statistics
 */
export interface SparseStats {
  rows: number;
  cols: number;
  nnz: number;
  density: number;
  memoryBytes: number;
  denseMemoryBytes: number;
  memorySavings: number;
}

// ============================================================================
// SPARSE MATRIX BUILDER (Dictionary of Keys)
// ============================================================================

/**
 * SparseMatrixBuilder uses Dictionary of Keys (DOK) format for efficient assembly.
 * After assembly, convert to CSR for computation.
 */
export class SparseMatrixBuilder {
  private rows: number;
  private cols: number;
  private data: Map<string, number>;
  
  /**
   * Create a new sparse matrix builder
   * @param rows Number of rows
   * @param cols Number of columns (defaults to rows for square matrices)
   */
  constructor(rows: number, cols?: number) {
    this.rows = rows;
    this.cols = cols ?? rows;
    this.data = new Map();
  }
  
  /**
   * Generate key for a (row, col) pair
   */
  private key(row: number, col: number): string {
    return `${row},${col}`;
  }
  
  /**
   * Set value at (row, col)
   * @param row Row index (0-based)
   * @param col Column index (0-based)
   * @param value Value to set
   */
  set(row: number, col: number, value: number): void {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      throw new RangeError(`Index out of bounds: (${row}, ${col}) for ${this.rows}x${this.cols} matrix`);
    }
    
    if (Math.abs(value) < 1e-15) {
      // Don't store zeros
      this.data.delete(this.key(row, col));
    } else {
      this.data.set(this.key(row, col), value);
    }
  }
  
  /**
   * Get value at (row, col)
   */
  get(row: number, col: number): number {
    return this.data.get(this.key(row, col)) ?? 0;
  }
  
  /**
   * Add value to existing value at (row, col)
   * Efficient for stiffness matrix assembly
   */
  add(row: number, col: number, value: number): void {
    if (Math.abs(value) < 1e-15) return;
    
    const key = this.key(row, col);
    const existing = this.data.get(key) ?? 0;
    const newValue = existing + value;
    
    if (Math.abs(newValue) < 1e-15) {
      this.data.delete(key);
    } else {
      this.data.set(key, newValue);
    }
  }
  
  /**
   * Add a dense submatrix at the specified global indices
   * Optimal for adding member stiffness matrices
   * 
   * @param subMatrix Dense submatrix (array of arrays)
   * @param globalIndices Array mapping local indices to global indices
   */
  addSubmatrix(subMatrix: number[][], globalIndices: number[]): void {
    const n = globalIndices.length;
    
    for (let i = 0; i < n; i++) {
      const globalI = globalIndices[i];
      for (let j = 0; j < n; j++) {
        const globalJ = globalIndices[j];
        const value = subMatrix[i][j];
        
        if (Math.abs(value) > 1e-15) {
          this.add(globalI, globalJ, value);
        }
      }
    }
  }
  
  /**
   * Get number of non-zero elements
   */
  getNnz(): number {
    return this.data.size;
  }
  
  /**
   * Get matrix dimensions
   */
  getDimensions(): { rows: number; cols: number } {
    return { rows: this.rows, cols: this.cols };
  }
  
  /**
   * Get sparsity statistics
   */
  getStats(): SparseStats {
    const nnz = this.data.size;
    const total = this.rows * this.cols;
    const density = nnz / total;
    
    // Memory: Float64 (8 bytes) per value + 2x Uint32 (4 bytes) for indices
    const memoryBytes = nnz * (8 + 4 + 4) + (this.rows + 1) * 4;
    const denseMemoryBytes = total * 8;
    
    return {
      rows: this.rows,
      cols: this.cols,
      nnz,
      density,
      memoryBytes,
      denseMemoryBytes,
      memorySavings: 1 - memoryBytes / denseMemoryBytes,
    };
  }
  
  /**
   * Convert to CSR format
   * Call this after assembly is complete
   */
  toCSR(): CSRMatrix {
    const nnz = this.data.size;
    
    // Collect all entries and sort by row, then column
    const entries: Array<{ row: number; col: number; value: number }> = [];
    
    for (const [key, value] of this.data) {
      const [row, col] = key.split(',').map(Number);
      entries.push({ row, col, value });
    }
    
    // Sort by row first, then by column
    entries.sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });
    
    // Build CSR arrays
    const values = new Float64Array(nnz);
    const colIndices = new Uint32Array(nnz);
    const rowPtrs = new Uint32Array(this.rows + 1);
    
    let currentRow = 0;
    rowPtrs[0] = 0;
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      // Fill in row pointers for any skipped rows
      while (currentRow < entry.row) {
        currentRow++;
        rowPtrs[currentRow] = i;
      }
      
      values[i] = entry.value;
      colIndices[i] = entry.col;
    }
    
    // Fill remaining row pointers
    while (currentRow < this.rows) {
      currentRow++;
      rowPtrs[currentRow] = nnz;
    }
    
    return {
      rows: this.rows,
      cols: this.cols,
      nnz,
      values,
      colIndices,
      rowPtrs,
    };
  }
  
  /**
   * Convert to dense array (for debugging or small matrices)
   */
  toDense(): number[][] {
    const result: number[][] = Array(this.rows)
      .fill(null)
      .map(() => Array(this.cols).fill(0));
    
    for (const [key, value] of this.data) {
      const [row, col] = key.split(',').map(Number);
      result[row][col] = value;
    }
    
    return result;
  }
  
  /**
   * Clear all entries
   */
  clear(): void {
    this.data.clear();
  }
}

// ============================================================================
// CSR MATRIX OPERATIONS
// ============================================================================

/**
 * Sparse matrix-vector multiplication: y = A * x
 * 
 * This is the core operation for iterative solvers.
 * Complexity: O(nnz) - only touches non-zero elements
 */
export function csrMatVec(A: CSRMatrix, x: Float64Array | number[]): Float64Array {
  const y = new Float64Array(A.rows);
  
  for (let i = 0; i < A.rows; i++) {
    let sum = 0;
    const rowStart = A.rowPtrs[i];
    const rowEnd = A.rowPtrs[i + 1];
    
    for (let j = rowStart; j < rowEnd; j++) {
      sum += A.values[j] * x[A.colIndices[j]];
    }
    
    y[i] = sum;
  }
  
  return y;
}

/**
 * Extract diagonal elements from CSR matrix
 */
export function csrGetDiagonal(A: CSRMatrix): Float64Array {
  const diag = new Float64Array(Math.min(A.rows, A.cols));
  
  for (let i = 0; i < diag.length; i++) {
    const rowStart = A.rowPtrs[i];
    const rowEnd = A.rowPtrs[i + 1];
    
    for (let j = rowStart; j < rowEnd; j++) {
      if (A.colIndices[j] === i) {
        diag[i] = A.values[j];
        break;
      }
    }
  }
  
  return diag;
}

/**
 * Get value at (row, col) from CSR matrix
 * Uses binary search for efficiency
 */
export function csrGet(A: CSRMatrix, row: number, col: number): number {
  const rowStart = A.rowPtrs[row];
  const rowEnd = A.rowPtrs[row + 1];
  
  // Binary search for column
  let left = rowStart;
  let right = rowEnd - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midCol = A.colIndices[mid];
    
    if (midCol === col) {
      return A.values[mid];
    } else if (midCol < col) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return 0;
}

/**
 * Extract a submatrix from CSR (for partitioning)
 * 
 * @param A Original CSR matrix
 * @param rowIndices Indices of rows to extract
 * @param colIndices Indices of columns to extract
 * @returns New CSR matrix with only specified rows/cols
 */
export function csrExtractSubmatrix(
  A: CSRMatrix,
  rowIndices: number[],
  colIndices: number[]
): CSRMatrix {
  const builder = new SparseMatrixBuilder(rowIndices.length, colIndices.length);
  
  // Create reverse mapping for columns
  const colMap = new Map<number, number>();
  colIndices.forEach((origCol, newCol) => colMap.set(origCol, newCol));
  
  // Extract values
  for (let newRow = 0; newRow < rowIndices.length; newRow++) {
    const origRow = rowIndices[newRow];
    const rowStart = A.rowPtrs[origRow];
    const rowEnd = A.rowPtrs[origRow + 1];
    
    for (let j = rowStart; j < rowEnd; j++) {
      const origCol = A.colIndices[j];
      const newCol = colMap.get(origCol);
      
      if (newCol !== undefined) {
        builder.set(newRow, newCol, A.values[j]);
      }
    }
  }
  
  return builder.toCSR();
}

/**
 * Print CSR matrix info (for debugging)
 */
export function csrPrintInfo(A: CSRMatrix, name: string = 'Matrix'): void {
  const density = A.nnz / (A.rows * A.cols) * 100;
  console.log(`${name}: ${A.rows}x${A.cols}, nnz=${A.nnz}, density=${density.toFixed(2)}%`);
}
