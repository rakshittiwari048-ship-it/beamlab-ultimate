//! BeamLab WASM Linear Solver
//!
//! High-performance linear algebra solver for structural analysis.
//! Uses nalgebra for sparse matrix operations and exposes functions
//! to JavaScript via WebAssembly.
//!
//! # Features
//! - Sparse matrix representation for memory efficiency
//! - LU decomposition for direct solving
//! - Cholesky decomposition for symmetric positive-definite matrices
//! - Iterative conjugate gradient solver for very large systems

use nalgebra::{DMatrix, DVector};
use nalgebra_sparse::{CooMatrix, CsrMatrix};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

// ============================================================================
// INITIALIZATION
// ============================================================================

/// Initialize panic hook for better error messages in browser console
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/// Result of the linear solver
#[derive(Serialize, Deserialize)]
pub struct SolverResult {
    /// Displacement vector
    pub displacements: Vec<f64>,
    /// Whether the solve was successful
    pub success: bool,
    /// Error message if solve failed
    pub error: Option<String>,
    /// Solve time in milliseconds
    pub solve_time_ms: f64,
    /// Solver method used
    pub method: String,
    /// Matrix condition number estimate (if available)
    pub condition_number: Option<f64>,
}

/// Sparse matrix entry in COO format
#[derive(Serialize, Deserialize)]
pub struct SparseEntry {
    pub row: usize,
    pub col: usize,
    pub value: f64,
}

/// Input format for sparse matrix
#[derive(Serialize, Deserialize)]
pub struct SparseMatrixInput {
    pub rows: usize,
    pub cols: usize,
    pub entries: Vec<SparseEntry>,
}

// ============================================================================
// MAIN SOLVER FUNCTIONS
// ============================================================================

/// Solve a linear system Kx = F using dense LU decomposition
///
/// # Arguments
/// * `stiffness_flat` - Flattened stiffness matrix (row-major, n x n)
/// * `force_array` - Force vector (length n)
/// * `n` - Matrix dimension
///
/// # Returns
/// * JsValue containing SolverResult with displacement vector
#[wasm_bindgen]
pub fn solve_system(
    stiffness_flat: &[f64],
    force_array: &[f64],
    n: usize,
) -> Result<JsValue, JsValue> {
    let start = js_sys::Date::now();

    // Validate inputs
    if stiffness_flat.len() != n * n {
        return Err(JsValue::from_str(&format!(
            "Stiffness matrix size mismatch: expected {} elements, got {}",
            n * n,
            stiffness_flat.len()
        )));
    }

    if force_array.len() != n {
        return Err(JsValue::from_str(&format!(
            "Force vector size mismatch: expected {} elements, got {}",
            n,
            force_array.len()
        )));
    }

    // Create dense matrix from flat array
    let k_matrix = DMatrix::from_row_slice(n, n, stiffness_flat);
    let f_vector = DVector::from_column_slice(force_array);

    // Try LU decomposition
    let result = match k_matrix.clone().lu().solve(&f_vector) {
        Some(x) => {
            let solve_time = js_sys::Date::now() - start;
            SolverResult {
                displacements: x.iter().copied().collect(),
                success: true,
                error: None,
                solve_time_ms: solve_time,
                method: "LU Decomposition".to_string(),
                condition_number: estimate_condition_number(&k_matrix),
            }
        }
        None => {
            // Try pseudo-inverse as fallback
            match solve_with_svd(&k_matrix, &f_vector) {
                Ok(x) => {
                    let solve_time = js_sys::Date::now() - start;
                    SolverResult {
                        displacements: x,
                        success: true,
                        error: Some("Used SVD fallback - matrix may be singular".to_string()),
                        solve_time_ms: solve_time,
                        method: "SVD Pseudo-inverse".to_string(),
                        condition_number: None,
                    }
                }
                Err(e) => SolverResult {
                    displacements: vec![],
                    success: false,
                    error: Some(e),
                    solve_time_ms: js_sys::Date::now() - start,
                    method: "Failed".to_string(),
                    condition_number: None,
                },
            }
        }
    };

    serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Solve a linear system using sparse matrix format
///
/// More memory-efficient for large sparse systems (typical in FEA)
#[wasm_bindgen]
pub fn solve_sparse_system(
    row_indices: &[usize],
    col_indices: &[usize],
    values: &[f64],
    force_array: &[f64],
    n: usize,
) -> Result<JsValue, JsValue> {
    let start = js_sys::Date::now();

    // Validate inputs
    if row_indices.len() != col_indices.len() || row_indices.len() != values.len() {
        return Err(JsValue::from_str(
            "Sparse matrix arrays must have same length",
        ));
    }

    // Build COO matrix
    let mut coo = CooMatrix::new(n, n);
    for i in 0..values.len() {
        if row_indices[i] < n && col_indices[i] < n {
            coo.push(row_indices[i], col_indices[i], values[i]);
        }
    }

    // Convert to CSR for efficient solving
    let csr: CsrMatrix<f64> = CsrMatrix::from(&coo);

    // Convert sparse to dense for solving (nalgebra-sparse doesn't have direct solvers)
    // For production, consider using a sparse direct solver like cholmod
    let dense = sparse_to_dense(&csr, n);
    let f_vector = DVector::from_column_slice(force_array);

    let result = match dense.clone().lu().solve(&f_vector) {
        Some(x) => {
            let solve_time = js_sys::Date::now() - start;
            let nnz = values.len();
            let sparsity = 1.0 - (nnz as f64 / (n * n) as f64);

            SolverResult {
                displacements: x.iter().copied().collect(),
                success: true,
                error: None,
                solve_time_ms: solve_time,
                method: format!("Sparse LU (sparsity: {:.1}%)", sparsity * 100.0),
                condition_number: None, // Skip for sparse - expensive
            }
        }
        None => SolverResult {
            displacements: vec![],
            success: false,
            error: Some("Sparse matrix is singular".to_string()),
            solve_time_ms: js_sys::Date::now() - start,
            method: "Failed".to_string(),
            condition_number: None,
        },
    };

    serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Solve symmetric positive-definite system using Cholesky decomposition
///
/// Faster than LU for SPD matrices (common in structural analysis)
#[wasm_bindgen]
pub fn solve_cholesky(
    stiffness_flat: &[f64],
    force_array: &[f64],
    n: usize,
) -> Result<JsValue, JsValue> {
    let start = js_sys::Date::now();

    let k_matrix = DMatrix::from_row_slice(n, n, stiffness_flat);
    let f_vector = DVector::from_column_slice(force_array);

    let result = match k_matrix.clone().cholesky() {
        Some(chol) => {
            let x = chol.solve(&f_vector);
            let solve_time = js_sys::Date::now() - start;

            SolverResult {
                displacements: x.iter().copied().collect(),
                success: true,
                error: None,
                solve_time_ms: solve_time,
                method: "Cholesky Decomposition".to_string(),
                condition_number: None,
            }
        }
        None => {
            // Matrix not positive-definite, fall back to LU
            solve_system(stiffness_flat, force_array, n)?;
            return solve_system(stiffness_flat, force_array, n);
        }
    };

    serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Iterative Conjugate Gradient solver for very large systems
///
/// Memory efficient for very large matrices but may not converge for all systems
#[wasm_bindgen]
pub fn solve_conjugate_gradient(
    stiffness_flat: &[f64],
    force_array: &[f64],
    n: usize,
    max_iterations: usize,
    tolerance: f64,
) -> Result<JsValue, JsValue> {
    let start = js_sys::Date::now();

    let k_matrix = DMatrix::from_row_slice(n, n, stiffness_flat);
    let b = DVector::from_column_slice(force_array);

    // Initial guess (zero vector)
    let mut x = DVector::zeros(n);
    let mut r = &b - &k_matrix * &x;
    let mut p = r.clone();
    let mut rs_old = r.dot(&r);

    let mut iterations = 0;
    let mut converged = false;

    for i in 0..max_iterations {
        iterations = i + 1;
        let ap = &k_matrix * &p;
        let alpha = rs_old / p.dot(&ap);

        x += alpha * &p;
        r -= alpha * &ap;

        let rs_new = r.dot(&r);

        if rs_new.sqrt() < tolerance {
            converged = true;
            break;
        }

        let beta = rs_new / rs_old;
        p = &r + beta * &p;
        rs_old = rs_new;
    }

    let solve_time = js_sys::Date::now() - start;

    let result = SolverResult {
        displacements: x.iter().copied().collect(),
        success: converged,
        error: if converged {
            None
        } else {
            Some(format!(
                "CG did not converge after {} iterations",
                iterations
            ))
        },
        solve_time_ms: solve_time,
        method: format!("Conjugate Gradient ({} iters)", iterations),
        condition_number: None,
    };

    serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/// Estimate condition number using power iteration
fn estimate_condition_number(matrix: &DMatrix<f64>) -> Option<f64> {
    let n = matrix.nrows();
    if n > 100 {
        // Skip for large matrices - too expensive
        return None;
    }

    // Get largest eigenvalue via power iteration
    let mut v = DVector::from_element(n, 1.0);
    let mut lambda_max = 0.0;

    for _ in 0..50 {
        let w = matrix * &v;
        lambda_max = w.norm();
        if lambda_max < 1e-10 {
            return None;
        }
        v = &w / lambda_max;
    }

    // Get smallest eigenvalue (inverse power iteration)
    if let Some(lu) = matrix.clone().lu().try_inverse() {
        let mut v = DVector::from_element(n, 1.0);
        let mut lambda_min_inv = 0.0;

        for _ in 0..50 {
            let w = &lu * &v;
            lambda_min_inv = w.norm();
            if lambda_min_inv < 1e-10 {
                return None;
            }
            v = &w / lambda_min_inv;
        }

        let lambda_min = 1.0 / lambda_min_inv;
        Some(lambda_max / lambda_min)
    } else {
        None
    }
}

/// Solve using SVD (for near-singular matrices)
fn solve_with_svd(matrix: &DMatrix<f64>, b: &DVector<f64>) -> Result<Vec<f64>, String> {
    let svd = matrix.clone().svd(true, true);

    let u = svd.u.ok_or("SVD failed to compute U")?;
    let v_t = svd.v_t.ok_or("SVD failed to compute V^T")?;
    let singular_values = svd.singular_values;

    // Compute pseudo-inverse solution: x = V * S^-1 * U^T * b
    let ut_b = u.transpose() * b;

    let mut s_inv_ut_b = DVector::zeros(singular_values.len());
    let threshold = singular_values[0] * 1e-10; // Truncation threshold

    for i in 0..singular_values.len() {
        if singular_values[i] > threshold {
            s_inv_ut_b[i] = ut_b[i] / singular_values[i];
        }
    }

    let x = v_t.transpose() * s_inv_ut_b;
    Ok(x.iter().copied().collect())
}

/// Convert sparse CSR matrix to dense
fn sparse_to_dense(csr: &CsrMatrix<f64>, n: usize) -> DMatrix<f64> {
    let mut dense = DMatrix::zeros(n, n);

    for (i, row) in csr.row_iter().enumerate() {
        for (&col, &val) in row.col_indices().iter().zip(row.values().iter()) {
            dense[(i, col)] = val;
        }
    }

    dense
}

// ============================================================================
// HELPER FUNCTIONS FOR JAVASCRIPT
// ============================================================================

/// Get solver version
#[wasm_bindgen]
pub fn get_solver_version() -> String {
    "0.1.0".to_string()
}

/// Check if WASM module is loaded correctly
#[wasm_bindgen]
pub fn health_check() -> bool {
    true
}

/// Benchmark matrix multiplication (for performance testing)
#[wasm_bindgen]
pub fn benchmark_multiply(size: usize) -> f64 {
    let start = js_sys::Date::now();

    let a = DMatrix::<f64>::new_random(size, size);
    let b = DMatrix::<f64>::new_random(size, size);
    let _c = &a * &b;

    js_sys::Date::now() - start
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_solve() {
        // 2x2 system: [2 1; 1 3] * x = [4; 5]
        // Solution: x = [1; 1]
        let k = vec![2.0, 1.0, 1.0, 3.0];
        let f = vec![4.0, 5.0];

        let k_matrix = DMatrix::from_row_slice(2, 2, &k);
        let f_vector = DVector::from_column_slice(&f);

        let x = k_matrix.lu().solve(&f_vector).unwrap();

        assert!((x[0] - 1.4).abs() < 1e-10);
        assert!((x[1] - 1.2).abs() < 1e-10);
    }

    #[test]
    fn test_cholesky() {
        // Symmetric positive-definite matrix
        let k = vec![4.0, 2.0, 2.0, 5.0];
        let f = vec![6.0, 7.0];

        let k_matrix = DMatrix::from_row_slice(2, 2, &k);
        let f_vector = DVector::from_column_slice(&f);

        let chol = k_matrix.cholesky().unwrap();
        let x = chol.solve(&f_vector);

        // Verify solution
        let f_check = DMatrix::from_row_slice(2, 2, &k) * &x;
        assert!((f_check[0] - 6.0).abs() < 1e-10);
        assert!((f_check[1] - 7.0).abs() < 1e-10);
    }
}
