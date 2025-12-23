"""
solver.py

Advanced Beam Solver with Hand Calculation Steps

Features:
- Returns step-by-step hand calculations (not just final values)
- Generates 100 data points for smooth shear/moment diagrams
- Uses SymPy for symbolic math and derivations
- Supports point loads, distributed loads, and moments

Author: BeamLab Team
"""

import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple, Union
from enum import Enum
import sympy as sp
from sympy import symbols, Rational, sqrt, simplify, Piecewise, integrate, Abs


# ============================================================================
# ENUMS & DATA TYPES
# ============================================================================

class LoadType(Enum):
    """Types of loads that can be applied to a beam"""
    POINT_LOAD = "point"
    DISTRIBUTED_LOAD = "distributed"
    MOMENT = "moment"
    TRIANGULAR_LOAD = "triangular"


class SupportType(Enum):
    """Types of supports"""
    PINNED = "pinned"      # Rx, Ry (no moment)
    ROLLER = "roller"      # Ry only
    FIXED = "fixed"        # Rx, Ry, Mz


@dataclass
class Load:
    """Represents a load on the beam"""
    load_type: LoadType
    magnitude: float       # kN or kN/m
    position: float        # meters from left support
    end_position: Optional[float] = None  # For distributed loads
    
    def __post_init__(self):
        if isinstance(self.load_type, str):
            self.load_type = LoadType(self.load_type)


@dataclass
class Support:
    """Represents a support on the beam"""
    support_type: SupportType
    position: float        # meters from left end
    
    def __post_init__(self):
        if isinstance(self.support_type, str):
            self.support_type = SupportType(self.support_type)


@dataclass 
class DiagramData:
    """Data points for shear/moment diagrams"""
    x_vals: List[float]
    y_vals: List[float]
    
    def to_dict(self) -> Dict[str, List[float]]:
        return {"x_vals": self.x_vals, "y_vals": self.y_vals}


@dataclass
class AnalysisResult:
    """Complete analysis result with hand calculation steps"""
    # Final values
    max_shear: float
    min_shear: float
    max_moment: float
    min_moment: float
    max_deflection: float
    
    # Reactions
    reactions: Dict[str, float]
    
    # Step-by-step calculations
    steps: List[str]
    
    # Diagram data (100 points each)
    shear_diagram: DiagramData
    moment_diagram: DiagramData
    deflection_diagram: DiagramData
    
    # Symbolic equations (as strings for display)
    shear_equation: str
    moment_equation: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "max_shear": {"result": self.max_shear, "unit": "kN"},
            "min_shear": {"result": self.min_shear, "unit": "kN"},
            "max_moment": {"result": self.max_moment, "unit": "kNm"},
            "min_moment": {"result": self.min_moment, "unit": "kNm"},
            "max_deflection": {"result": self.max_deflection, "unit": "mm"},
            "reactions": self.reactions,
            "steps": self.steps,
            "shear_diagram": self.shear_diagram.to_dict(),
            "moment_diagram": self.moment_diagram.to_dict(),
            "deflection_diagram": self.deflection_diagram.to_dict(),
            "equations": {
                "shear": self.shear_equation,
                "moment": self.moment_equation
            }
        }


# ============================================================================
# BEAM SOLVER CLASS
# ============================================================================

class BeamSolver:
    """
    Advanced beam solver that returns hand calculation steps.
    
    Supports:
    - Simply supported beams
    - Cantilever beams
    - Continuous beams (basic)
    - Point loads, distributed loads, moments
    
    Usage:
        solver = BeamSolver(length=10.0, E=200e3, I=1e8)
        solver.add_support(SupportType.PINNED, 0)
        solver.add_support(SupportType.ROLLER, 10)
        solver.add_load(LoadType.POINT_LOAD, magnitude=50, position=5)
        result = solver.solve()
    """
    
    # Number of points for diagram generation
    NUM_POINTS = 100
    
    def __init__(
        self,
        length: float,
        E: float = 200e3,  # MPa (Steel default)
        I: float = 1e8,    # mm^4 (moment of inertia)
    ):
        """
        Initialize beam solver.
        
        Args:
            length: Beam length in meters
            E: Young's modulus in MPa
            I: Moment of inertia in mm^4
        """
        self.length = length
        self.E = E  # MPa
        self.I = I  # mm^4
        self.EI = E * I * 1e-12  # Convert to kN·m²
        
        self.loads: List[Load] = []
        self.supports: List[Support] = []
        self.steps: List[str] = []
        
        # Symbolic variable for position along beam
        self.x = symbols('x', real=True, positive=True)
        
    def add_load(
        self,
        load_type: Union[LoadType, str],
        magnitude: float,
        position: float,
        end_position: Optional[float] = None
    ) -> 'BeamSolver':
        """Add a load to the beam (chainable)"""
        if isinstance(load_type, str):
            load_type = LoadType(load_type)
        self.loads.append(Load(load_type, magnitude, position, end_position))
        return self
        
    def add_support(
        self,
        support_type: Union[SupportType, str],
        position: float
    ) -> 'BeamSolver':
        """Add a support to the beam (chainable)"""
        if isinstance(support_type, str):
            support_type = SupportType(support_type)
        self.supports.append(Support(support_type, position))
        return self
    
    def _add_step(self, step: str):
        """Add a calculation step"""
        self.steps.append(step)
        
    def _format_number(self, value: float, decimals: int = 2) -> str:
        """Format number for display"""
        return f"{value:.{decimals}f}"
    
    # ========================================================================
    # REACTION CALCULATIONS
    # ========================================================================
    
    def _calculate_reactions_simply_supported(self) -> Dict[str, float]:
        """
        Calculate reactions for simply supported beam.
        Returns dict with Ra, Rb (vertical reactions at left and right supports)
        """
        L = self.length
        
        self._add_step(f"═══════════════════════════════════════════════════════")
        self._add_step(f"STEP 1: CALCULATE SUPPORT REACTIONS")
        self._add_step(f"═══════════════════════════════════════════════════════")
        self._add_step(f"Beam Length L = {self._format_number(L)} m")
        self._add_step(f"")
        
        # Sum of moments about left support (to find Rb)
        self._add_step(f"Taking moments about left support (A):")
        self._add_step(f"ΣM_A = 0")
        
        total_moment_about_A = 0.0
        moment_terms = []
        
        for i, load in enumerate(self.loads):
            if load.load_type == LoadType.POINT_LOAD:
                # Point load: M = P * a
                P = load.magnitude
                a = load.position
                moment = P * a
                total_moment_about_A += moment
                moment_terms.append(f"P{i+1}×a{i+1} = {self._format_number(P)}×{self._format_number(a)} = {self._format_number(moment)} kN·m")
                
            elif load.load_type == LoadType.DISTRIBUTED_LOAD:
                # UDL: M = w * length * centroid_distance
                w = load.magnitude
                start = load.position
                end = load.end_position or L
                length = end - start
                centroid = start + length / 2
                total_force = w * length
                moment = total_force * centroid
                total_moment_about_A += moment
                moment_terms.append(
                    f"w{i+1}×L{i+1}×x̄{i+1} = {self._format_number(w)}×{self._format_number(length)}×{self._format_number(centroid)} = {self._format_number(moment)} kN·m"
                )
                
            elif load.load_type == LoadType.MOMENT:
                # Applied moment
                M = load.magnitude
                total_moment_about_A += M
                moment_terms.append(f"M{i+1} = {self._format_number(M)} kN·m")
        
        for term in moment_terms:
            self._add_step(f"  • {term}")
        
        # Calculate Rb
        Rb = total_moment_about_A / L
        self._add_step(f"")
        self._add_step(f"R_B × L = {self._format_number(total_moment_about_A)} kN·m")
        self._add_step(f"R_B = {self._format_number(total_moment_about_A)} / {self._format_number(L)}")
        self._add_step(f"R_B = {self._format_number(Rb)} kN ↑")
        
        # Sum of vertical forces to find Ra
        self._add_step(f"")
        self._add_step(f"Applying vertical equilibrium:")
        self._add_step(f"ΣF_y = 0")
        
        total_vertical_load = 0.0
        for load in self.loads:
            if load.load_type == LoadType.POINT_LOAD:
                total_vertical_load += load.magnitude
            elif load.load_type == LoadType.DISTRIBUTED_LOAD:
                length = (load.end_position or L) - load.position
                total_vertical_load += load.magnitude * length
        
        Ra = total_vertical_load - Rb
        self._add_step(f"R_A + R_B = Total Load")
        self._add_step(f"R_A = {self._format_number(total_vertical_load)} - {self._format_number(Rb)}")
        self._add_step(f"R_A = {self._format_number(Ra)} kN ↑")
        self._add_step(f"")
        
        return {"Ra": Ra, "Rb": Rb}
    
    def _calculate_reactions_cantilever(self) -> Dict[str, float]:
        """
        Calculate reactions for cantilever beam (fixed at left end).
        """
        L = self.length
        
        self._add_step(f"═══════════════════════════════════════════════════════")
        self._add_step(f"STEP 1: CALCULATE FIXED SUPPORT REACTIONS")
        self._add_step(f"═══════════════════════════════════════════════════════")
        self._add_step(f"Cantilever Beam Length L = {self._format_number(L)} m")
        self._add_step(f"Fixed support at x = 0")
        self._add_step(f"")
        
        # Vertical reaction = sum of all loads
        total_vertical = 0.0
        total_moment = 0.0
        
        for i, load in enumerate(self.loads):
            if load.load_type == LoadType.POINT_LOAD:
                P = load.magnitude
                a = load.position
                total_vertical += P
                total_moment += P * a
                self._add_step(f"Point Load P{i+1} = {self._format_number(P)} kN at x = {self._format_number(a)} m")
                
            elif load.load_type == LoadType.DISTRIBUTED_LOAD:
                w = load.magnitude
                start = load.position
                end = load.end_position or L
                length = end - start
                centroid = start + length / 2
                total_force = w * length
                total_vertical += total_force
                total_moment += total_force * centroid
                self._add_step(f"UDL w{i+1} = {self._format_number(w)} kN/m from x = {self._format_number(start)} to {self._format_number(end)} m")
        
        self._add_step(f"")
        self._add_step(f"ΣF_y = 0 → R_A = {self._format_number(total_vertical)} kN ↑")
        self._add_step(f"ΣM_A = 0 → M_A = {self._format_number(total_moment)} kN·m ↺")
        self._add_step(f"")
        
        return {"Ra": total_vertical, "Ma": total_moment}
    
    # ========================================================================
    # SHEAR & MOMENT CALCULATIONS
    # ========================================================================
    
    def _calculate_shear_moment_equations(self, reactions: Dict[str, float]) -> Tuple[Any, Any]:
        """
        Build symbolic shear and moment equations using SymPy.
        Uses Piecewise functions for discontinuities.
        """
        x = self.x
        L = self.length
        
        self._add_step(f"═══════════════════════════════════════════════════════")
        self._add_step(f"STEP 2: DERIVE SHEAR FORCE EQUATION V(x)")
        self._add_step(f"═══════════════════════════════════════════════════════")
        
        # Start with reaction at left support
        Ra = reactions.get("Ra", 0)
        V = sp.Float(Ra)  # Initial shear = Ra
        
        self._add_step(f"At x = 0⁺: V(0) = R_A = {self._format_number(Ra)} kN")
        
        # Add contribution from each load
        for i, load in enumerate(self.loads):
            if load.load_type == LoadType.POINT_LOAD:
                P = load.magnitude
                a = load.position
                # Heaviside step function for point load
                V = V - P * sp.Heaviside(x - a)
                self._add_step(f"At x = {self._format_number(a)}⁺: V drops by P{i+1} = {self._format_number(P)} kN")
                
            elif load.load_type == LoadType.DISTRIBUTED_LOAD:
                w = load.magnitude
                start = load.position
                end = load.end_position or L
                # Linear reduction in shear over UDL region
                V_contribution = w * sp.Max(0, sp.Min(x - start, end - start))
                V = V - V_contribution
                self._add_step(f"From x = {self._format_number(start)} to {self._format_number(end)}: V reduces by w = {self._format_number(w)} kN/m")
        
        self._add_step(f"")
        self._add_step(f"Shear Force Equation:")
        self._add_step(f"V(x) = {Ra} - Σ(loads to left of x)")
        
        # Now calculate moment by integrating shear
        self._add_step(f"")
        self._add_step(f"═══════════════════════════════════════════════════════")
        self._add_step(f"STEP 3: DERIVE BENDING MOMENT EQUATION M(x)")
        self._add_step(f"═══════════════════════════════════════════════════════")
        self._add_step(f"Using: M(x) = ∫V(x)dx")
        
        # For simply supported beam, start with M = 0 at left support
        Ma = reactions.get("Ma", 0)  # Non-zero for cantilever
        M = sp.Float(-Ma)  # Start with fixed-end moment (if any)
        
        # Build moment equation
        # M = Ra*x - sum of (P * (x-a)) for each point load where x > a
        M = Ra * x - Ma
        
        for i, load in enumerate(self.loads):
            if load.load_type == LoadType.POINT_LOAD:
                P = load.magnitude
                a = load.position
                M = M - P * sp.Max(0, x - a)
                self._add_step(f"Contribution from P{i+1}: -P×(x-a) = -{self._format_number(P)}×(x-{self._format_number(a)}) for x > {self._format_number(a)}")
                
            elif load.load_type == LoadType.DISTRIBUTED_LOAD:
                w = load.magnitude
                start = load.position
                end = load.end_position or L
                length = end - start
                # Parabolic reduction in moment over UDL region
                dist_into_load = sp.Max(0, sp.Min(x - start, length))
                M = M - w * dist_into_load**2 / 2
                self._add_step(f"Contribution from UDL: -w×(x-{self._format_number(start)})²/2 for x > {self._format_number(start)}")
        
        self._add_step(f"")
        
        return V, M
    
    def _evaluate_at_points(
        self, 
        expr: Any, 
        num_points: int = 100
    ) -> Tuple[List[float], List[float]]:
        """
        Evaluate a SymPy expression at num_points along the beam.
        Returns (x_vals, y_vals) as lists.
        """
        x = self.x
        L = self.length
        
        x_vals = np.linspace(0, L, num_points).tolist()
        y_vals = []
        
        # Convert to lambda function for fast evaluation
        try:
            f = sp.lambdify(x, expr, modules=['numpy'])
            y_array = f(np.array(x_vals))
            # Handle array or scalar output
            if isinstance(y_array, np.ndarray):
                y_vals = y_array.tolist()
            else:
                y_vals = [float(y_array)] * num_points
        except Exception:
            # Fallback: evaluate symbolically at each point
            for xi in x_vals:
                try:
                    val = float(expr.subs(x, xi))
                except Exception:
                    val = 0.0
                y_vals.append(val)
        
        return x_vals, y_vals
    
    def _find_max_moment_location(self, V_expr: Any) -> float:
        """
        Find location of maximum moment (where shear = 0).
        """
        x = self.x
        L = self.length
        
        # Sample shear at many points to find zero crossing
        x_vals = np.linspace(0.01, L - 0.01, 200)
        try:
            V_func = sp.lambdify(x, V_expr, modules=['numpy'])
            V_vals = V_func(x_vals)
            
            # Find sign changes (zero crossings)
            for i in range(len(V_vals) - 1):
                if V_vals[i] * V_vals[i+1] < 0:
                    # Linear interpolation to find zero
                    x_zero = x_vals[i] - V_vals[i] * (x_vals[i+1] - x_vals[i]) / (V_vals[i+1] - V_vals[i])
                    return float(x_zero)
        except Exception:
            pass
        
        return L / 2  # Default to midspan
    
    def _calculate_deflection(
        self, 
        M_expr: Any,
        reactions: Dict[str, float]
    ) -> Tuple[List[float], List[float]]:
        """
        Calculate deflection by double integration of M/EI.
        """
        x = self.x
        L = self.length
        EI = self.EI
        
        self._add_step(f"═══════════════════════════════════════════════════════")
        self._add_step(f"STEP 4: CALCULATE DEFLECTION (Double Integration)")
        self._add_step(f"═══════════════════════════════════════════════════════")
        self._add_step(f"EI = {self._format_number(self.E)} × {self._format_number(self.I)} = {self._format_number(EI * 1e12)} N·mm²")
        self._add_step(f"EI = {self._format_number(EI)} kN·m²")
        self._add_step(f"")
        self._add_step(f"Using: EI × d²y/dx² = M(x)")
        self._add_step(f"θ(x) = ∫(M/EI)dx + C₁")
        self._add_step(f"y(x) = ∫θ(x)dx + C₂")
        
        # For simply supported beam, use formula-based deflection
        # This is more numerically stable than symbolic integration
        
        x_vals = np.linspace(0, L, self.NUM_POINTS).tolist()
        y_vals = []
        
        # Use Macaulay's method or numerical integration
        for xi in x_vals:
            deflection = 0.0
            
            for load in self.loads:
                if load.load_type == LoadType.POINT_LOAD:
                    P = load.magnitude
                    a = load.position
                    b = L - a
                    
                    if xi <= a:
                        # Before load
                        deflection += (P * b * xi / (6 * L * EI)) * (L**2 - b**2 - xi**2)
                    else:
                        # After load
                        deflection += (P * b / (6 * L * EI)) * (
                            (L/b) * (xi - a)**3 + (L**2 - b**2) * xi - xi**3
                        )
                        
                elif load.load_type == LoadType.DISTRIBUTED_LOAD:
                    w = load.magnitude
                    # Full span UDL: δ = 5wL⁴/(384EI)
                    # At position x: δ(x) = wx/(24EI) * (L³ - 2Lx² + x³)
                    start = load.position
                    end = load.end_position or L
                    
                    if start == 0 and end == L:
                        # Full span UDL
                        deflection += (w * xi / (24 * EI)) * (L**3 - 2*L*xi**2 + xi**3)
            
            # Convert to mm (deflection is in meters from kN·m calculations)
            y_vals.append(deflection * 1000)
        
        max_defl = max(abs(d) for d in y_vals) if y_vals else 0
        self._add_step(f"")
        self._add_step(f"Maximum deflection: δ_max = {self._format_number(max_defl)} mm")
        
        return x_vals, y_vals
    
    # ========================================================================
    # MAIN SOLVE METHOD
    # ========================================================================
    
    def solve(self) -> AnalysisResult:
        """
        Solve the beam and return complete analysis with hand calculation steps.
        """
        self.steps = []  # Reset steps
        
        self._add_step(f"╔═══════════════════════════════════════════════════════╗")
        self._add_step(f"║     BEAM ANALYSIS - HAND CALCULATION STEPS            ║")
        self._add_step(f"╚═══════════════════════════════════════════════════════╝")
        self._add_step(f"")
        self._add_step(f"Given:")
        self._add_step(f"  • Beam Length: L = {self._format_number(self.length)} m")
        self._add_step(f"  • Modulus of Elasticity: E = {self._format_number(self.E)} MPa")
        self._add_step(f"  • Moment of Inertia: I = {self._format_number(self.I)} mm⁴")
        self._add_step(f"")
        self._add_step(f"Loads Applied:")
        
        for i, load in enumerate(self.loads):
            if load.load_type == LoadType.POINT_LOAD:
                self._add_step(f"  {i+1}. Point Load: P = {self._format_number(load.magnitude)} kN at x = {self._format_number(load.position)} m")
            elif load.load_type == LoadType.DISTRIBUTED_LOAD:
                end = load.end_position or self.length
                self._add_step(f"  {i+1}. UDL: w = {self._format_number(load.magnitude)} kN/m from x = {self._format_number(load.position)} to {self._format_number(end)} m")
            elif load.load_type == LoadType.MOMENT:
                self._add_step(f"  {i+1}. Moment: M = {self._format_number(load.magnitude)} kN·m at x = {self._format_number(load.position)} m")
        
        self._add_step(f"")
        
        # Determine beam type based on supports
        is_cantilever = any(s.support_type == SupportType.FIXED for s in self.supports)
        
        # Step 1: Calculate reactions
        if is_cantilever:
            reactions = self._calculate_reactions_cantilever()
        else:
            reactions = self._calculate_reactions_simply_supported()
        
        # Step 2 & 3: Derive shear and moment equations
        V_expr, M_expr = self._calculate_shear_moment_equations(reactions)
        
        # Evaluate at 100 points for diagrams
        shear_x, shear_y = self._evaluate_at_points(V_expr, self.NUM_POINTS)
        moment_x, moment_y = self._evaluate_at_points(M_expr, self.NUM_POINTS)
        
        # Step 4: Calculate deflection
        defl_x, defl_y = self._calculate_deflection(M_expr, reactions)
        
        # Find max/min values
        max_shear = max(shear_y) if shear_y else 0
        min_shear = min(shear_y) if shear_y else 0
        max_moment = max(moment_y) if moment_y else 0
        min_moment = min(moment_y) if moment_y else 0
        max_deflection = max(abs(d) for d in defl_y) if defl_y else 0
        
        # Add summary step
        self._add_step(f"")
        self._add_step(f"═══════════════════════════════════════════════════════")
        self._add_step(f"SUMMARY OF RESULTS")
        self._add_step(f"═══════════════════════════════════════════════════════")
        self._add_step(f"Maximum Shear Force: V_max = {self._format_number(max_shear)} kN")
        self._add_step(f"Minimum Shear Force: V_min = {self._format_number(min_shear)} kN")
        self._add_step(f"Maximum Bending Moment: M_max = {self._format_number(max_moment)} kN·m")
        self._add_step(f"Minimum Bending Moment: M_min = {self._format_number(min_moment)} kN·m")
        self._add_step(f"Maximum Deflection: δ_max = {self._format_number(max_deflection)} mm")
        
        # Create result object
        return AnalysisResult(
            max_shear=round(max_shear, 3),
            min_shear=round(min_shear, 3),
            max_moment=round(max_moment, 3),
            min_moment=round(min_moment, 3),
            max_deflection=round(max_deflection, 3),
            reactions=reactions,
            steps=self.steps,
            shear_diagram=DiagramData(x_vals=shear_x, y_vals=[round(v, 4) for v in shear_y]),
            moment_diagram=DiagramData(x_vals=moment_x, y_vals=[round(v, 4) for v in moment_y]),
            deflection_diagram=DiagramData(x_vals=defl_x, y_vals=[round(v, 4) for v in defl_y]),
            shear_equation=f"V(x) = {self._format_number(reactions.get('Ra', 0))} - Σ(loads)",
            moment_equation=f"M(x) = {self._format_number(reactions.get('Ra', 0))}·x - Σ(P·(x-a))"
        )


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

def analyze_simply_supported_beam(
    length: float,
    loads: List[Dict[str, Any]],
    E: float = 200e3,
    I: float = 1e8
) -> Dict[str, Any]:
    """
    Convenience function to analyze a simply supported beam.
    
    Args:
        length: Beam length in meters
        loads: List of load dicts [{"type": "point", "magnitude": 50, "position": 5}]
        E: Young's modulus in MPa (default: 200 GPa for steel)
        I: Moment of inertia in mm^4
        
    Returns:
        Analysis result as dictionary with steps and diagrams
        
    Example:
        result = analyze_simply_supported_beam(
            length=10,
            loads=[
                {"type": "point", "magnitude": 50, "position": 5},
                {"type": "distributed", "magnitude": 10, "position": 0, "end_position": 10}
            ]
        )
    """
    solver = BeamSolver(length=length, E=E, I=I)
    
    # Add supports (simply supported)
    solver.add_support(SupportType.PINNED, 0)
    solver.add_support(SupportType.ROLLER, length)
    
    # Add loads
    for load in loads:
        load_type = LoadType(load.get("type", "point"))
        solver.add_load(
            load_type=load_type,
            magnitude=load.get("magnitude", 0),
            position=load.get("position", 0),
            end_position=load.get("end_position")
        )
    
    result = solver.solve()
    return result.to_dict()


def analyze_cantilever_beam(
    length: float,
    loads: List[Dict[str, Any]],
    E: float = 200e3,
    I: float = 1e8
) -> Dict[str, Any]:
    """
    Convenience function to analyze a cantilever beam (fixed at left end).
    
    Args:
        length: Beam length in meters
        loads: List of load dicts
        E: Young's modulus in MPa
        I: Moment of inertia in mm^4
        
    Returns:
        Analysis result as dictionary with steps and diagrams
    """
    solver = BeamSolver(length=length, E=E, I=I)
    
    # Add fixed support at left end
    solver.add_support(SupportType.FIXED, 0)
    
    # Add loads
    for load in loads:
        load_type = LoadType(load.get("type", "point"))
        solver.add_load(
            load_type=load_type,
            magnitude=load.get("magnitude", 0),
            position=load.get("position", 0),
            end_position=load.get("end_position")
        )
    
    result = solver.solve()
    return result.to_dict()


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    # Example: Simply supported beam with point load at midspan
    print("\n" + "="*60)
    print("EXAMPLE: Simply Supported Beam with Point Load")
    print("="*60)
    
    result = analyze_simply_supported_beam(
        length=10.0,
        loads=[
            {"type": "point", "magnitude": 50, "position": 5}
        ]
    )
    
    # Print steps
    for step in result["steps"]:
        print(step)
    
    # Print summary
    print(f"\nMax Moment: {result['max_moment']}")
    print(f"Max Shear: {result['max_shear']}")
    print(f"Max Deflection: {result['max_deflection']}")
    print(f"Diagram points: {len(result['moment_diagram']['x_vals'])}")
