#!/usr/bin/env python3
"""
solver.py - High-Performance Structural Solver using SciPy Sparse

This is the core solver for large structural analysis problems (2000+ nodes).
Uses industry-standard scipy.sparse.linalg for optimal performance.

Features:
- Sparse matrix assembly using COO format (fast construction)
- CSR conversion for efficient matrix-vector products
- Direct solver (SuperLU) for robust solutions
- Iterative solver (CG with ILU preconditioner) for very large systems
- Progress reporting via JSON to stdout
- Memory-efficient for large problems

Usage:
    python solver.py input.json
    python solver.py --stdin < input.json

Input JSON format:
{
    "nodes": [{"id": "n1", "x": 0, "y": 0, "z": 0}, ...],
    "members": [{"id": "m1", "startNodeId": "n1", "endNodeId": "n2", ...}, ...],
    "supports": [{"nodeId": "n1", "dx": true, ...}, ...],
    "loads": [{"nodeId": "n2", "fy": -10000}, ...]
}

Output JSON format:
{
    "success": true,
    "displacements": [...],
    "reactions": [...],
    "nodalDisplacements": {...},
    "timing": {...},
    "solverInfo": {...}
}
"""

import json
import sys
import time
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
from scipy import sparse
from scipy.sparse import linalg as spla
import warnings

# Suppress scipy warnings for cleaner output
warnings.filterwarnings('ignore', category=sparse.SparseEfficiencyWarning)

# ============================================================================
# DATA STRUCTURES
# ============================================================================

@dataclass
class Node:
    id: str
    x: float
    y: float
    z: float
    index: int  # 0-based index for DOF mapping


@dataclass
class Member:
    id: str
    start_node_id: str
    end_node_id: str
    E: float   # Elastic modulus (Pa)
    A: float   # Cross-sectional area (m²)
    Iy: float  # Moment of inertia about y-axis (m⁴)
    Iz: float  # Moment of inertia about z-axis (m⁴)
    G: float   # Shear modulus (Pa)
    J: float   # Torsional constant (m⁴)
    beta: float = 0.0  # Roll angle (radians)


@dataclass
class Support:
    node_id: str
    dx: bool
    dy: bool
    dz: bool
    rx: bool
    ry: bool
    rz: bool


@dataclass
class Load:
    node_id: str
    fx: float = 0.0
    fy: float = 0.0
    fz: float = 0.0
    mx: float = 0.0
    my: float = 0.0
    mz: float = 0.0


# ============================================================================
# PROGRESS REPORTING
# ============================================================================

def report_progress(stage: str, progress: int, message: str):
    """Send progress update to stdout as JSON."""
    progress_msg = {
        "type": "progress",
        "data": {
            "stage": stage,
            "progress": progress,
            "message": message
        }
    }
    print(json.dumps(progress_msg), flush=True)


def report_error(error: str, details: Optional[str] = None):
    """Send error to stdout as JSON."""
    error_msg = {
        "type": "error",
        "data": {
            "success": False,
            "error": error,
            "details": details
        }
    }
    print(json.dumps(error_msg), flush=True)
    sys.exit(1)


# ============================================================================
# MATRIX UTILITIES
# ============================================================================

def get_member_length(node_a: Node, node_b: Node) -> float:
    """Calculate member length."""
    dx = node_b.x - node_a.x
    dy = node_b.y - node_a.y
    dz = node_b.z - node_a.z
    return np.sqrt(dx*dx + dy*dy + dz*dz)


def get_direction_cosines(node_a: Node, node_b: Node, L: float) -> Tuple[float, float, float]:
    """Calculate direction cosines."""
    cx = (node_b.x - node_a.x) / L
    cy = (node_b.y - node_a.y) / L
    cz = (node_b.z - node_a.z) / L
    return cx, cy, cz


def get_rotation_matrix(node_a: Node, node_b: Node, beta: float = 0.0) -> np.ndarray:
    """
    Calculate 3x3 rotation matrix from local to global coordinates.
    Uses the standard 3D frame element formulation.
    """
    L = get_member_length(node_a, node_b)
    cx, cy, cz = get_direction_cosines(node_a, node_b, L)
    
    # Check if member is vertical
    if abs(cx) < 1e-10 and abs(cz) < 1e-10:
        # Vertical member
        if cy > 0:
            R = np.array([
                [0, 1, 0],
                [-1, 0, 0],
                [0, 0, 1]
            ])
        else:
            R = np.array([
                [0, -1, 0],
                [1, 0, 0],
                [0, 0, 1]
            ])
    else:
        # Non-vertical member
        D = np.sqrt(cx*cx + cz*cz)
        R = np.array([
            [cx, cy, cz],
            [-cx*cy/D, D, -cy*cz/D],
            [-cz/D, 0, cx/D]
        ])
    
    # Apply roll angle if specified
    if abs(beta) > 1e-10:
        cos_b = np.cos(beta)
        sin_b = np.sin(beta)
        R_roll = np.array([
            [1, 0, 0],
            [0, cos_b, sin_b],
            [0, -sin_b, cos_b]
        ])
        R = R @ R_roll
    
    return R


def get_transformation_matrix(R: np.ndarray) -> np.ndarray:
    """Build 12x12 transformation matrix from 3x3 rotation matrix."""
    T = np.zeros((12, 12))
    for i in range(4):
        T[i*3:i*3+3, i*3:i*3+3] = R
    return T


def get_local_stiffness_matrix(
    E: float, Iy: float, Iz: float, A: float, L: float, G: float, J: float
) -> np.ndarray:
    """
    Calculate 12x12 local stiffness matrix for 3D frame element.
    
    DOF order per node: [u, v, w, θx, θy, θz]
    - u: axial (x)
    - v: transverse y
    - w: transverse z
    - θx: torsion
    - θy: rotation about y
    - θz: rotation about z
    """
    k = np.zeros((12, 12))
    
    # Axial stiffness
    EA_L = E * A / L
    k[0, 0] = EA_L
    k[0, 6] = -EA_L
    k[6, 0] = -EA_L
    k[6, 6] = EA_L
    
    # Torsional stiffness
    GJ_L = G * J / L
    k[3, 3] = GJ_L
    k[3, 9] = -GJ_L
    k[9, 3] = -GJ_L
    k[9, 9] = GJ_L
    
    # Bending about z-axis (in x-y plane)
    L2 = L * L
    L3 = L2 * L
    EIz = E * Iz
    
    k[1, 1] = 12 * EIz / L3
    k[1, 5] = 6 * EIz / L2
    k[1, 7] = -12 * EIz / L3
    k[1, 11] = 6 * EIz / L2
    
    k[5, 1] = 6 * EIz / L2
    k[5, 5] = 4 * EIz / L
    k[5, 7] = -6 * EIz / L2
    k[5, 11] = 2 * EIz / L
    
    k[7, 1] = -12 * EIz / L3
    k[7, 5] = -6 * EIz / L2
    k[7, 7] = 12 * EIz / L3
    k[7, 11] = -6 * EIz / L2
    
    k[11, 1] = 6 * EIz / L2
    k[11, 5] = 2 * EIz / L
    k[11, 7] = -6 * EIz / L2
    k[11, 11] = 4 * EIz / L
    
    # Bending about y-axis (in x-z plane)
    EIy = E * Iy
    
    k[2, 2] = 12 * EIy / L3
    k[2, 4] = -6 * EIy / L2
    k[2, 8] = -12 * EIy / L3
    k[2, 10] = -6 * EIy / L2
    
    k[4, 2] = -6 * EIy / L2
    k[4, 4] = 4 * EIy / L
    k[4, 8] = 6 * EIy / L2
    k[4, 10] = 2 * EIy / L
    
    k[8, 2] = -12 * EIy / L3
    k[8, 4] = 6 * EIy / L2
    k[8, 8] = 12 * EIy / L3
    k[8, 10] = 6 * EIy / L2
    
    k[10, 2] = -6 * EIy / L2
    k[10, 4] = 2 * EIy / L
    k[10, 8] = 6 * EIy / L2
    k[10, 10] = 4 * EIy / L
    
    return k


# ============================================================================
# SPARSE MATRIX ASSEMBLY
# ============================================================================

class SparseAssembler:
    """
    Assembles global stiffness matrix using COO format for efficiency.
    COO (Coordinate) format is optimal for incremental assembly,
    then converts to CSR for efficient solving.
    """
    
    def __init__(self, num_dofs: int):
        self.num_dofs = num_dofs
        self.rows: List[int] = []
        self.cols: List[int] = []
        self.values: List[float] = []
    
    def add_element(self, dof_map: List[int], k_local: np.ndarray, T: np.ndarray):
        """Add element contribution to global matrix."""
        # Transform to global: K_global = T^T @ K_local @ T
        k_global = T.T @ k_local @ T
        
        # Add to COO lists
        for i in range(12):
            for j in range(12):
                if abs(k_global[i, j]) > 1e-15:
                    self.rows.append(dof_map[i])
                    self.cols.append(dof_map[j])
                    self.values.append(k_global[i, j])
    
    def to_csr(self) -> sparse.csr_matrix:
        """Convert to CSR format for efficient solving."""
        coo = sparse.coo_matrix(
            (self.values, (self.rows, self.cols)),
            shape=(self.num_dofs, self.num_dofs)
        )
        return coo.tocsr()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get matrix statistics."""
        nnz = len(self.values)
        density = nnz / (self.num_dofs ** 2)
        memory_saved = (self.num_dofs ** 2 - nnz) * 8 / (1024 ** 2)  # MB
        return {
            "size": self.num_dofs,
            "nnz": nnz,
            "density": density,
            "memorySavedMB": memory_saved
        }


# ============================================================================
# SOLVER
# ============================================================================

class StructuralSolver:
    """
    High-performance structural solver using scipy.sparse.
    
    Solver selection:
    - Direct (SuperLU): Default, robust for most problems
    - Iterative (CG): For very large sparse systems (>10000 DOFs)
    """
    
    def __init__(self, nodes: List[Node], members: List[Member], 
                 supports: List[Support], loads: List[Load]):
        self.nodes = {n.id: n for n in nodes}
        self.node_list = nodes
        self.members = members
        self.supports = {s.node_id: s for s in supports}
        self.loads = loads
        
        self.num_nodes = len(nodes)
        self.num_dofs = self.num_nodes * 6
        
        # Timing
        self.timing: Dict[str, float] = {}
    
    def solve(self, use_iterative: bool = False) -> Dict[str, Any]:
        """
        Solve the structural system.
        
        Args:
            use_iterative: Use iterative solver (CG) instead of direct (SuperLU)
        
        Returns:
            Solution dictionary with displacements, reactions, and timing info
        """
        total_start = time.perf_counter()
        
        # Stage 1: Assembly
        report_progress("assembling", 10, f"Assembling {len(self.members)} members...")
        
        assembly_start = time.perf_counter()
        K = self._assemble_global_stiffness()
        self.timing["assembly"] = (time.perf_counter() - assembly_start) * 1000
        
        report_progress("assembling", 40, 
            f"Assembled matrix: {K.shape[0]} DOFs, {K.nnz} non-zeros")
        
        # Build force vector
        F = self._build_force_vector()
        
        # Stage 2: Apply boundary conditions
        report_progress("solving", 50, "Applying boundary conditions...")
        
        bc_start = time.perf_counter()
        free_dofs, constrained_dofs = self._identify_dofs()
        
        if len(free_dofs) == 0:
            report_error("Structure is fully constrained - no free DOFs")
        
        # Extract reduced system
        K_reduced = K[np.ix_(free_dofs, free_dofs)]
        F_reduced = F[free_dofs]
        self.timing["boundary_conditions"] = (time.perf_counter() - bc_start) * 1000
        
        # Stage 3: Solve
        report_progress("solving", 60, 
            f"Solving {len(free_dofs)} equations...")
        
        solve_start = time.perf_counter()
        
        solver_info = {}
        if use_iterative or len(free_dofs) > 10000:
            # Use iterative solver with ILU preconditioner
            u_reduced, solver_info = self._solve_iterative(K_reduced, F_reduced)
        else:
            # Use direct solver (SuperLU)
            u_reduced, solver_info = self._solve_direct(K_reduced, F_reduced)
        
        self.timing["solve"] = (time.perf_counter() - solve_start) * 1000
        
        report_progress("solving", 85, 
            f"Solved using {solver_info.get('method', 'unknown')}")
        
        # Stage 4: Post-processing
        report_progress("postprocessing", 90, "Calculating reactions...")
        
        post_start = time.perf_counter()
        
        # Expand solution to full DOF vector
        u_full = np.zeros(self.num_dofs)
        u_full[free_dofs] = u_reduced
        
        # Calculate reactions
        reactions = K @ u_full - F
        
        # Build result dictionaries
        nodal_displacements = self._build_nodal_displacements(u_full)
        nodal_reactions = self._build_nodal_reactions(reactions, constrained_dofs)
        
        self.timing["postprocessing"] = (time.perf_counter() - post_start) * 1000
        self.timing["total"] = (time.perf_counter() - total_start) * 1000
        
        report_progress("postprocessing", 100, "Complete!")
        
        # Build result
        result = {
            "success": True,
            "displacements": u_full.tolist(),
            "reactions": reactions.tolist(),
            "nodalDisplacements": nodal_displacements,
            "nodalReactions": nodal_reactions,
            "timing": self.timing,
            "solverInfo": solver_info,
            "matrixStats": self._get_matrix_stats(K)
        }
        
        return result
    
    def _assemble_global_stiffness(self) -> sparse.csr_matrix:
        """Assemble global stiffness matrix in sparse format."""
        assembler = SparseAssembler(self.num_dofs)
        
        for i, member in enumerate(self.members):
            # Get nodes
            node_a = self.nodes.get(member.start_node_id)
            node_b = self.nodes.get(member.end_node_id)
            
            if not node_a or not node_b:
                continue
            
            # Calculate member length
            L = get_member_length(node_a, node_b)
            if L < 1e-10:
                continue
            
            # Calculate local stiffness matrix
            k_local = get_local_stiffness_matrix(
                member.E, member.Iy, member.Iz, 
                member.A, L, member.G, member.J
            )
            
            # Calculate transformation matrix
            R = get_rotation_matrix(node_a, node_b, member.beta)
            T = get_transformation_matrix(R)
            
            # Get DOF mapping
            dof_map = self._get_member_dof_map(node_a, node_b)
            
            # Add to global matrix
            assembler.add_element(dof_map, k_local, T)
            
            # Report progress periodically
            if (i + 1) % 500 == 0:
                progress = 10 + int(30 * (i + 1) / len(self.members))
                report_progress("assembling", progress, 
                    f"Processed {i + 1}/{len(self.members)} members...")
        
        return assembler.to_csr()
    
    def _get_member_dof_map(self, node_a: Node, node_b: Node) -> List[int]:
        """Get DOF indices for a member (12 DOFs total)."""
        dof_map = []
        for node in [node_a, node_b]:
            base = node.index * 6
            dof_map.extend([base + i for i in range(6)])
        return dof_map
    
    def _build_force_vector(self) -> np.ndarray:
        """Build the global force vector from loads."""
        F = np.zeros(self.num_dofs)
        
        for load in self.loads:
            node = self.nodes.get(load.node_id)
            if not node:
                continue
            
            base = node.index * 6
            F[base + 0] = load.fx
            F[base + 1] = load.fy
            F[base + 2] = load.fz
            F[base + 3] = load.mx
            F[base + 4] = load.my
            F[base + 5] = load.mz
        
        return F
    
    def _identify_dofs(self) -> Tuple[List[int], List[int]]:
        """Identify free and constrained DOFs based on supports."""
        free_dofs = []
        constrained_dofs = []
        
        for node in self.node_list:
            base = node.index * 6
            support = self.supports.get(node.id)
            
            if support:
                constraints = [
                    support.dx, support.dy, support.dz,
                    support.rx, support.ry, support.rz
                ]
                for i, is_constrained in enumerate(constraints):
                    if is_constrained:
                        constrained_dofs.append(base + i)
                    else:
                        free_dofs.append(base + i)
            else:
                free_dofs.extend([base + i for i in range(6)])
        
        return free_dofs, constrained_dofs
    
    def _solve_direct(self, K: sparse.csr_matrix, F: np.ndarray) -> Tuple[np.ndarray, Dict]:
        """Solve using direct method (SuperLU via spsolve)."""
        try:
            u = spla.spsolve(K, F)
            return u, {
                "method": "direct-superlu",
                "success": True
            }
        except Exception as e:
            report_error(f"Direct solver failed: {str(e)}")
            return np.zeros(len(F)), {"method": "direct-superlu", "success": False}
    
    def _solve_iterative(self, K: sparse.csr_matrix, F: np.ndarray) -> Tuple[np.ndarray, Dict]:
        """Solve using Conjugate Gradient with ILU preconditioner."""
        # Build ILU preconditioner
        try:
            ilu = spla.spilu(K.tocsc())
            M = spla.LinearOperator(K.shape, ilu.solve)
        except Exception:
            M = None  # Fall back to no preconditioner
        
        # Solve with CG
        iterations = [0]
        
        def callback(xk):
            iterations[0] += 1
        
        try:
            u, info = spla.cg(K, F, M=M, tol=1e-8, maxiter=2000, callback=callback)
            
            return u, {
                "method": "iterative-cg",
                "success": info == 0,
                "iterations": iterations[0],
                "converged": info == 0
            }
        except Exception as e:
            report_error(f"Iterative solver failed: {str(e)}")
            return np.zeros(len(F)), {"method": "iterative-cg", "success": False}
    
    def _build_nodal_displacements(self, u: np.ndarray) -> Dict[str, Dict[str, float]]:
        """Build nodal displacement dictionary."""
        result = {}
        for node in self.node_list:
            base = node.index * 6
            result[node.id] = {
                "dx": u[base + 0],
                "dy": u[base + 1],
                "dz": u[base + 2],
                "rx": u[base + 3],
                "ry": u[base + 4],
                "rz": u[base + 5]
            }
        return result
    
    def _build_nodal_reactions(self, reactions: np.ndarray, 
                                constrained_dofs: List[int]) -> Dict[str, Dict[str, float]]:
        """Build nodal reactions dictionary (only at supports)."""
        result = {}
        constrained_set = set(constrained_dofs)
        
        for node in self.node_list:
            base = node.index * 6
            # Only include if any DOF is constrained
            if any(base + i in constrained_set for i in range(6)):
                result[node.id] = {
                    "fx": reactions[base + 0] if base + 0 in constrained_set else 0,
                    "fy": reactions[base + 1] if base + 1 in constrained_set else 0,
                    "fz": reactions[base + 2] if base + 2 in constrained_set else 0,
                    "mx": reactions[base + 3] if base + 3 in constrained_set else 0,
                    "my": reactions[base + 4] if base + 4 in constrained_set else 0,
                    "mz": reactions[base + 5] if base + 5 in constrained_set else 0
                }
        return result
    
    def _get_matrix_stats(self, K: sparse.csr_matrix) -> Dict[str, Any]:
        """Get matrix statistics."""
        return {
            "size": K.shape[0],
            "nnz": K.nnz,
            "density": K.nnz / (K.shape[0] ** 2),
            "memorySavedMB": (K.shape[0] ** 2 - K.nnz) * 8 / (1024 ** 2)
        }


# ============================================================================
# INPUT PARSING
# ============================================================================

def parse_input(data: Dict[str, Any]) -> Tuple[List[Node], List[Member], List[Support], List[Load]]:
    """Parse JSON input into typed objects."""
    
    # Parse nodes
    nodes = []
    for i, n in enumerate(data.get("nodes", [])):
        nodes.append(Node(
            id=n["id"],
            x=float(n["x"]),
            y=float(n["y"]),
            z=float(n["z"]),
            index=i
        ))
    
    # Parse members
    members = []
    for m in data.get("members", []):
        members.append(Member(
            id=m["id"],
            start_node_id=m["startNodeId"],
            end_node_id=m["endNodeId"],
            E=float(m["E"]),
            A=float(m["A"]),
            Iy=float(m["Iy"]),
            Iz=float(m["Iz"]),
            G=float(m.get("G", m["E"] / 2.6)),  # Default G if not provided
            J=float(m.get("J", m["Iy"] + m["Iz"])),  # Default J if not provided
            beta=float(m.get("beta", 0.0))
        ))
    
    # Parse supports
    supports = []
    for s in data.get("supports", []):
        supports.append(Support(
            node_id=s["nodeId"],
            dx=bool(s.get("dx", False)),
            dy=bool(s.get("dy", False)),
            dz=bool(s.get("dz", False)),
            rx=bool(s.get("rx", False)),
            ry=bool(s.get("ry", False)),
            rz=bool(s.get("rz", False))
        ))
    
    # Parse loads
    loads = []
    for l in data.get("loads", []):
        loads.append(Load(
            node_id=l["nodeId"],
            fx=float(l.get("fx", 0)),
            fy=float(l.get("fy", 0)),
            fz=float(l.get("fz", 0)),
            mx=float(l.get("mx", 0)),
            my=float(l.get("my", 0)),
            mz=float(l.get("mz", 0))
        ))
    
    return nodes, members, supports, loads


# ============================================================================
# MAIN
# ============================================================================

def main():
    """Main entry point."""
    # Parse command line arguments
    if len(sys.argv) < 2 and sys.stdin.isatty():
        print("Usage: python solver.py <input.json>", file=sys.stderr)
        print("       python solver.py --stdin < input.json", file=sys.stderr)
        sys.exit(1)
    
    # Read input
    try:
        if len(sys.argv) >= 2 and sys.argv[1] != "--stdin":
            with open(sys.argv[1], 'r') as f:
                input_data = json.load(f)
        else:
            input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        report_error(f"Invalid JSON input: {str(e)}")
    except FileNotFoundError:
        report_error(f"Input file not found: {sys.argv[1]}")
    
    # Validate input
    if not input_data.get("nodes"):
        report_error("No nodes provided in input")
    if not input_data.get("members"):
        report_error("No members provided in input")
    if not input_data.get("supports"):
        report_error("No supports provided in input")
    if not input_data.get("loads"):
        report_error("No loads provided in input")
    
    # Parse input
    report_progress("initializing", 5, "Parsing input data...")
    nodes, members, supports, loads = parse_input(input_data)
    
    report_progress("initializing", 8, 
        f"Loaded {len(nodes)} nodes, {len(members)} members")
    
    # Create solver
    solver = StructuralSolver(nodes, members, supports, loads)
    
    # Determine solver type
    use_iterative = input_data.get("config", {}).get("useIterative", False)
    if len(nodes) > 2000:
        use_iterative = True
    
    # Solve
    result = solver.solve(use_iterative=use_iterative)
    
    # Output result
    print(json.dumps({"type": "result", "data": result}))


if __name__ == "__main__":
    main()
