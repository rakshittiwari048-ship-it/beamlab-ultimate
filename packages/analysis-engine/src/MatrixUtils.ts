import * as math from 'mathjs';
import type { Matrix } from 'mathjs';

// ============================================================================
// MATRIX UTILITIES FOR STRUCTURAL ENGINEERING
// ============================================================================

/**
 * Node interface for matrix calculations
 */
export interface NodeCoord {
  x: number;
  y: number;
  z: number;
}

/**
 * MatrixUtils - Structural Engineering Matrix Operations
 * 
 * Provides essential matrix operations for 3D frame analysis:
 * - Member length calculation
 * - Rotation matrices (3x3) for coordinate transformation
 * - Transformation matrices (12x12) for DOF mapping
 * - Local stiffness matrices (12x12) for 3D frame elements
 * 
 * Uses mathjs for all matrix operations to ensure numerical stability.
 */
export class MatrixUtils {
  
  // ============================================================================
  // 1. MEMBER LENGTH
  // ============================================================================
  
  /**
   * Calculate the length of a member between two nodes
   * 
   * @param nodeA - Start node coordinates {x, y, z}
   * @param nodeB - End node coordinates {x, y, z}
   * @returns Member length (scalar)
   * 
   * @example
   * const L = MatrixUtils.getMemberLength(
   *   { x: 0, y: 0, z: 0 },
   *   { x: 3, y: 4, z: 0 }
   * ); // Returns 5
   */
  static getMemberLength(nodeA: NodeCoord, nodeB: NodeCoord): number {
    const dx = nodeB.x - nodeA.x;
    const dy = nodeB.y - nodeA.y;
    const dz = nodeB.z - nodeA.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  // ============================================================================
  // 2. ROTATION MATRIX (3x3)
  // ============================================================================
  
  /**
   * Calculate the 3x3 rotation matrix for a member in 3D space
   * 
   * The rotation matrix transforms vectors from local to global coordinates.
   * Local axes: x' along member, y' perpendicular in vertical plane, z' perpendicular
   * 
   * @param nodeA - Start node coordinates
   * @param nodeB - End node coordinates  
   * @param betaAngle - Roll angle about member axis (radians), default 0
   * @returns 3x3 rotation matrix [R] where {global} = [R] * {local}
   * 
   * Reference: Matrix Structural Analysis, 2nd Ed. - McGuire, Gallagher, Ziemian
   */
  static getRotationMatrix(nodeA: NodeCoord, nodeB: NodeCoord, betaAngle: number = 0): Matrix {
    const L = this.getMemberLength(nodeA, nodeB);
    
    if (L < 1e-10) {
      throw new Error('Member length is zero or nearly zero');
    }
    
    // Direction cosines of member axis (local x-axis)
    const lx = (nodeB.x - nodeA.x) / L;
    const ly = (nodeB.y - nodeA.y) / L;
    const lz = (nodeB.z - nodeA.z) / L;
    
    // Check if member is vertical (parallel to global Y-axis)
    const isVertical = Math.abs(lx) < 1e-10 && Math.abs(lz) < 1e-10;
    
    let r: number[][];
    
    if (isVertical) {
      // Special case: vertical member
      // Local x' points up or down, local y' points along global X
      // Local z' points along global Z (or opposite)
      const sign = ly > 0 ? 1 : -1;
      
      r = [
        [0, sign, 0],
        [-sign * Math.cos(betaAngle), 0, Math.sin(betaAngle)],
        [sign * Math.sin(betaAngle), 0, Math.cos(betaAngle)]
      ];
    } else {
      // General case: non-vertical member
      // Reference vector for local y-axis is global Y (vertical)
      const D = Math.sqrt(lx * lx + lz * lz);
      
      // Without roll (beta = 0):
      // Local x' = member axis direction
      // Local y' = perpendicular to x' in vertical plane
      // Local z' = horizontal, perpendicular to x'
      
      const cosBeta = Math.cos(betaAngle);
      const sinBeta = Math.sin(betaAngle);
      
      // Row 1: local x-axis direction cosines
      const r11 = lx;
      const r12 = ly;
      const r13 = lz;
      
      // Row 2: local y-axis direction cosines (without beta rotation)
      // Then apply beta rotation
      const r21_0 = -lx * ly / D;
      const r22_0 = D;
      const r23_0 = -ly * lz / D;
      
      // Row 3: local z-axis direction cosines (without beta rotation)
      const r31_0 = -lz / D;
      const r32_0 = 0;
      const r33_0 = lx / D;
      
      // Apply beta rotation about local x-axis
      // [R_beta] rotates y' and z' about x'
      const r21 = r21_0 * cosBeta + r31_0 * sinBeta;
      const r22 = r22_0 * cosBeta + r32_0 * sinBeta;
      const r23 = r23_0 * cosBeta + r33_0 * sinBeta;
      
      const r31 = -r21_0 * sinBeta + r31_0 * cosBeta;
      const r32 = -r22_0 * sinBeta + r32_0 * cosBeta;
      const r33 = -r23_0 * sinBeta + r33_0 * cosBeta;
      
      r = [
        [r11, r12, r13],
        [r21, r22, r23],
        [r31, r32, r33]
      ];
    }
    
    return math.matrix(r);
  }
  
  // ============================================================================
  // 3. TRANSFORMATION MATRIX (12x12)
  // ============================================================================
  
  /**
   * Build the 12x12 transformation matrix from a 3x3 rotation matrix
   * 
   * For a 3D frame element with 6 DOFs per node (3 translations + 3 rotations),
   * the transformation matrix is a block diagonal matrix:
   * 
   *     [R  0  0  0]
   * T = [0  R  0  0]
   *     [0  0  R  0]
   *     [0  0  0  R]
   * 
   * Where R is the 3x3 rotation matrix
   * 
   * @param rotationMatrix - 3x3 rotation matrix from getRotationMatrix()
   * @returns 12x12 transformation matrix
   */
  static getTransformationMatrix(rotationMatrix: Matrix): Matrix {
    // Convert to 2D array for easier manipulation
    const R = rotationMatrix.toArray() as number[][];
    
    // Initialize 12x12 zero matrix
    const T: number[][] = Array(12).fill(null).map(() => Array(12).fill(0));
    
    // Place R in four 3x3 diagonal blocks
    for (let block = 0; block < 4; block++) {
      const offset = block * 3;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          T[offset + i][offset + j] = R[i][j];
        }
      }
    }
    
    return math.matrix(T);
  }
  
  // ============================================================================
  // 4. LOCAL STIFFNESS MATRIX (12x12 for 3D Frame)
  // ============================================================================
  
  /**
   * Generate the 12x12 local stiffness matrix for a 3D frame element
   * 
   * DOF order per node: [ux, uy, uz, θx, θy, θz]
   * Element DOFs: [node_i: 1-6, node_j: 7-12]
   * 
   * Includes:
   * - Axial stiffness (EA/L)
   * - Bending stiffness about both axes (EI/L³)
   * - Torsional stiffness (GJ/L)
   * - Shear deformation is NOT included (Euler-Bernoulli beam)
   * 
   * @param E - Elastic modulus (Pa or kN/m²)
   * @param Iy - Moment of inertia about local y-axis (m⁴)
   * @param Iz - Moment of inertia about local z-axis (m⁴)
   * @param A - Cross-sectional area (m²)
   * @param L - Member length (m)
   * @param G - Shear modulus (Pa or kN/m²), default E/(2*(1+0.3))
   * @param J - Torsional constant (m⁴), default min(Iy, Iz)
   * @returns 12x12 local stiffness matrix in member coordinates
   * 
   * Reference: Cook, Malkus, Plesha - "Concepts and Applications of FEA"
   */
  static getLocalStiffnessMatrix(
    E: number,
    Iy: number,
    Iz: number,
    A: number,
    L: number,
    G?: number,
    J?: number
  ): Matrix {
    // Default shear modulus (assuming Poisson's ratio ≈ 0.3 for steel)
    const shearModulus = G ?? E / (2 * (1 + 0.3));
    
    // Default torsional constant (approximation)
    const torsionalConstant = J ?? Math.min(Iy, Iz);
    
    // Validate inputs
    if (L <= 0) throw new Error('Member length must be positive');
    if (E <= 0) throw new Error('Elastic modulus must be positive');
    if (A <= 0) throw new Error('Cross-sectional area must be positive');
    if (Iy <= 0 || Iz <= 0) throw new Error('Moments of inertia must be positive');
    
    // Stiffness coefficients
    const EA_L = E * A / L;
    const GJ_L = shearModulus * torsionalConstant / L;
    
    // Bending about local z-axis (using Iy for in-plane bending)
    const EIz_L3 = E * Iz / (L * L * L);
    const EIz_L2 = E * Iz / (L * L);
    const EIz_L = E * Iz / L;
    
    // Bending about local y-axis (using Iz for out-of-plane bending)
    const EIy_L3 = E * Iy / (L * L * L);
    const EIy_L2 = E * Iy / (L * L);
    const EIy_L = E * Iy / L;
    
    // Initialize 12x12 stiffness matrix
    const k: number[][] = Array(12).fill(null).map(() => Array(12).fill(0));
    
    // ========== Axial terms (DOFs 1, 7) ==========
    k[0][0] = EA_L;
    k[0][6] = -EA_L;
    k[6][0] = -EA_L;
    k[6][6] = EA_L;
    
    // ========== Torsional terms (DOFs 4, 10) ==========
    k[3][3] = GJ_L;
    k[3][9] = -GJ_L;
    k[9][3] = -GJ_L;
    k[9][9] = GJ_L;
    
    // ========== Bending in x-y plane (local z bending) ==========
    // Shear in y (DOFs 2, 8) and rotation about z (DOFs 6, 12)
    k[1][1] = 12 * EIz_L3;
    k[1][5] = 6 * EIz_L2;
    k[1][7] = -12 * EIz_L3;
    k[1][11] = 6 * EIz_L2;
    
    k[5][1] = 6 * EIz_L2;
    k[5][5] = 4 * EIz_L;
    k[5][7] = -6 * EIz_L2;
    k[5][11] = 2 * EIz_L;
    
    k[7][1] = -12 * EIz_L3;
    k[7][5] = -6 * EIz_L2;
    k[7][7] = 12 * EIz_L3;
    k[7][11] = -6 * EIz_L2;
    
    k[11][1] = 6 * EIz_L2;
    k[11][5] = 2 * EIz_L;
    k[11][7] = -6 * EIz_L2;
    k[11][11] = 4 * EIz_L;
    
    // ========== Bending in x-z plane (local y bending) ==========
    // Shear in z (DOFs 3, 9) and rotation about y (DOFs 5, 11)
    k[2][2] = 12 * EIy_L3;
    k[2][4] = -6 * EIy_L2;
    k[2][8] = -12 * EIy_L3;
    k[2][10] = -6 * EIy_L2;
    
    k[4][2] = -6 * EIy_L2;
    k[4][4] = 4 * EIy_L;
    k[4][8] = 6 * EIy_L2;
    k[4][10] = 2 * EIy_L;
    
    k[8][2] = -12 * EIy_L3;
    k[8][4] = 6 * EIy_L2;
    k[8][8] = 12 * EIy_L3;
    k[8][10] = 6 * EIy_L2;
    
    k[10][2] = -6 * EIy_L2;
    k[10][4] = 2 * EIy_L;
    k[10][8] = 6 * EIy_L2;
    k[10][10] = 4 * EIy_L;
    
    return math.matrix(k);
  }
  
  // ============================================================================
  // HELPER METHODS
  // ============================================================================
  
  /**
   * Transform local stiffness matrix to global coordinates
   * 
   * [K_global] = [T]^T * [K_local] * [T]
   * 
   * @param kLocal - 12x12 local stiffness matrix
   * @param T - 12x12 transformation matrix
   * @returns 12x12 global stiffness matrix
   */
  static transformToGlobal(kLocal: Matrix, T: Matrix): Matrix {
    const TT = math.transpose(T);
    return math.multiply(math.multiply(TT, kLocal), T) as Matrix;
  }
  
  /**
   * Get complete member stiffness matrix in global coordinates
   * 
   * Convenience method that combines all steps:
   * 1. Calculate member length
   * 2. Get rotation matrix
   * 3. Build transformation matrix
   * 4. Generate local stiffness matrix
   * 5. Transform to global coordinates
   * 
   * @param nodeA - Start node
   * @param nodeB - End node
   * @param E - Elastic modulus
   * @param Iy - Moment of inertia about y
   * @param Iz - Moment of inertia about z
   * @param A - Cross-sectional area
   * @param betaAngle - Member roll angle (radians)
   * @param G - Shear modulus (optional)
   * @param J - Torsional constant (optional)
   * @returns 12x12 global stiffness matrix
   */
  static getGlobalStiffnessMatrix(
    nodeA: NodeCoord,
    nodeB: NodeCoord,
    E: number,
    Iy: number,
    Iz: number,
    A: number,
    betaAngle: number = 0,
    G?: number,
    J?: number
  ): Matrix {
    const L = this.getMemberLength(nodeA, nodeB);
    const R = this.getRotationMatrix(nodeA, nodeB, betaAngle);
    const T = this.getTransformationMatrix(R);
    const kLocal = this.getLocalStiffnessMatrix(E, Iy, Iz, A, L, G, J);
    return this.transformToGlobal(kLocal, T);
  }
  
  /**
   * Print matrix to console for debugging
   */
  static printMatrix(m: Matrix, label: string = 'Matrix', precision: number = 4): void {
    console.log(`\n${label}:`);
    const arr = m.toArray() as number[][];
    arr.forEach((row, i) => {
      const formatted = row.map(v => v.toFixed(precision).padStart(12)).join(' ');
      console.log(`  [${i.toString().padStart(2)}] ${formatted}`);
    });
  }
}

export default MatrixUtils;
