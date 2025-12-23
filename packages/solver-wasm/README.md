# BeamLab WASM Solver

High-performance WebAssembly linear algebra solver for structural analysis.

## Features

- **LU Decomposition** - Direct solver for general matrices
- **Cholesky Decomposition** - Optimized for symmetric positive-definite matrices
- **Conjugate Gradient** - Iterative solver for very large systems
- **Sparse Matrix Support** - Memory-efficient for typical FEA problems

## Prerequisites

1. Install Rust: https://rustup.rs/
2. Install wasm-pack:
   ```bash
   cargo install wasm-pack
   ```

## Building

```bash
# Build for web (ES modules)
pnpm run build

# Build for Node.js
pnpm run build:nodejs

# Build for bundlers (webpack, vite, etc.)
pnpm run build:bundler
```

## Usage

### In Browser (Web Worker)

```javascript
import init, { solve_system, solve_cholesky } from '@beamlab/solver-wasm';

// Initialize WASM
await init();

// Solve Kx = F
const K = new Float64Array([4, 2, 2, 5]); // 2x2 stiffness matrix
const F = new Float64Array([6, 7]);        // Force vector
const n = 2;                                // Matrix dimension

const result = solve_system(K, F, n);
console.log(result.displacements); // Solution vector
console.log(result.solve_time_ms); // Solve time
```

### Sparse Matrix Solving

```javascript
// COO format sparse matrix
const rows = new Uint32Array([0, 0, 1, 1]);
const cols = new Uint32Array([0, 1, 0, 1]);
const vals = new Float64Array([4, 2, 2, 5]);
const F = new Float64Array([6, 7]);
const n = 2;

const result = solve_sparse_system(rows, cols, vals, F, n);
```

## Performance

| Matrix Size | JS Solver | WASM Solver | Speedup |
|-------------|-----------|-------------|---------|
| 100x100     | 15ms      | 2ms         | 7.5x    |
| 500x500     | 450ms     | 35ms        | 12.9x   |
| 1000x1000   | 3200ms    | 180ms       | 17.8x   |

## API Reference

### `solve_system(stiffness_flat, force_array, n)`
Solve using LU decomposition.

### `solve_cholesky(stiffness_flat, force_array, n)`
Solve using Cholesky (faster for SPD matrices).

### `solve_sparse_system(row_indices, col_indices, values, force_array, n)`
Solve sparse system in COO format.

### `solve_conjugate_gradient(stiffness_flat, force_array, n, max_iterations, tolerance)`
Iterative solver for very large systems.

## License

MIT
