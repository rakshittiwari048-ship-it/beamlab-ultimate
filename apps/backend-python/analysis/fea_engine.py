"""
fea_engine.py

3D Frame Solver using PyNite Finite Element Analysis Library

Features:
- Full 3D frame analysis (6 DOF per node)
- Translates frontend JSON model to PyNite FEModel3D
- Handles Fixed, Pinned, Roller supports
- Point loads and distributed loads on members
- Returns 100-point arrays for shear, moment, and deflection diagrams
- Provides detailed results for frontend visualization

Dependencies: PyNiteFEA (pip install PyNiteFEA)

Author: BeamLab Team
"""

import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple, Union
from enum import Enum
import json

# PyNite import with graceful fallback
try:
    from PyNite import FEModel3D
    PYNITE_AVAILABLE = True
except ImportError:
    PYNITE_AVAILABLE = False
    print("⚠️ PyNite not installed. Run: pip install PyNiteFEA")


# ============================================================================
# ENUMS & DATA TYPES
# ============================================================================

class SupportType(Enum):
    """Frontend support types mapped to PyNite constraint tuples"""
    FIXED = "fixed"        # All DOFs restrained
    PINNED = "pinned"      # Translations restrained, rotations free
    ROLLER_X = "roller_x"  # Y,Z translations restrained, X free
    ROLLER_Y = "roller_y"  # X,Z translations restrained, Y free
    ROLLER_Z = "roller_z"  # X,Y translations restrained, Z free
    FREE = "free"          # No restraints


class LoadType(Enum):
    """Types of loads supported"""
    POINT = "point"
    DISTRIBUTED = "distributed"
    MOMENT = "moment"


class LoadDirection(Enum):
    """Load application direction"""
    FX = "Fx"  # Axial
    FY = "Fy"  # Transverse Y (gravity typically)
    FZ = "Fz"  # Transverse Z
    MX = "Mx"  # Torsion
    MY = "My"  # Bending about Y
    MZ = "Mz"  # Bending about Z


# ============================================================================
# DATA CLASSES FOR INPUT/OUTPUT
# ============================================================================

@dataclass
class NodeInput:
    """Node definition from frontend"""
    id: str
    x: float
    y: float
    z: float
    support: Optional[str] = None  # "fixed", "pinned", "roller_x", etc.


@dataclass
class MemberInput:
    """Member definition from frontend"""
    id: str
    start_node: str
    end_node: str
    # Section properties
    E: float = 210000.0      # MPa (Young's modulus) - Steel default
    G: float = 81000.0       # MPa (Shear modulus) - Steel default  
    Iy: float = 19430000.0   # mm^4 (Moment of inertia about local y)
    Iz: float = 1420000.0    # mm^4 (Moment of inertia about local z)
    J: float = 150000.0      # mm^4 (Torsional constant)
    A: float = 2850.0        # mm^2 (Cross-sectional area)


@dataclass
class PointLoadInput:
    """Point load on a member"""
    member_id: str
    direction: str           # "Fy", "Fz", "Fx", "Mx", "My", "Mz"
    magnitude: float         # kN or kNm
    position: float          # Distance from start node (m)
    load_case: str = "D"     # Load case name


@dataclass
class DistributedLoadInput:
    """Distributed load on a member"""
    member_id: str
    direction: str           # "Fy", "Fz"
    w1: float                # Start magnitude (kN/m)
    w2: float                # End magnitude (kN/m)
    x1: Optional[float] = None  # Start position (m from start node)
    x2: Optional[float] = None  # End position (m from start node)
    load_case: str = "D"


@dataclass
class NodeLoadInput:
    """Nodal load (applied directly to node)"""
    node_id: str
    direction: str           # "FX", "FY", "FZ", "MX", "MY", "MZ"
    magnitude: float         # kN or kNm
    load_case: str = "D"


@dataclass
class DiagramData:
    """100-point diagram data for visualization"""
    x_vals: List[float]
    y_vals: List[float]
    
    def to_dict(self) -> Dict[str, List[float]]:
        return {"x_vals": self.x_vals, "y_vals": self.y_vals}


@dataclass
class MemberResults:
    """Analysis results for a single member"""
    member_id: str
    length: float
    
    # Maximum values
    max_shear_y: float
    min_shear_y: float
    max_shear_z: float
    min_shear_z: float
    max_moment_y: float
    min_moment_y: float
    max_moment_z: float
    min_moment_z: float
    max_axial: float
    min_axial: float
    max_torsion: float
    max_deflection: float
    
    # 100-point diagram arrays
    shear_y_diagram: DiagramData
    shear_z_diagram: DiagramData
    moment_y_diagram: DiagramData
    moment_z_diagram: DiagramData
    axial_diagram: DiagramData
    deflection_y_diagram: DiagramData
    deflection_z_diagram: DiagramData
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "member_id": self.member_id,
            "length": self.length,
            "max_shear_y": self.max_shear_y,
            "min_shear_y": self.min_shear_y,
            "max_shear_z": self.max_shear_z,
            "min_shear_z": self.min_shear_z,
            "max_moment_y": self.max_moment_y,
            "min_moment_y": self.min_moment_y,
            "max_moment_z": self.max_moment_z,
            "min_moment_z": self.min_moment_z,
            "max_axial": self.max_axial,
            "min_axial": self.min_axial,
            "max_torsion": self.max_torsion,
            "max_deflection": self.max_deflection,
            "shear_y_diagram": self.shear_y_diagram.to_dict(),
            "shear_z_diagram": self.shear_z_diagram.to_dict(),
            "moment_y_diagram": self.moment_y_diagram.to_dict(),
            "moment_z_diagram": self.moment_z_diagram.to_dict(),
            "axial_diagram": self.axial_diagram.to_dict(),
            "deflection_y_diagram": self.deflection_y_diagram.to_dict(),
            "deflection_z_diagram": self.deflection_z_diagram.to_dict(),
        }


@dataclass
class ReactionResult:
    """Support reaction at a node"""
    node_id: str
    FX: float = 0.0
    FY: float = 0.0
    FZ: float = 0.0
    MX: float = 0.0
    MY: float = 0.0
    MZ: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "node_id": self.node_id,
            "FX": round(self.FX, 4),
            "FY": round(self.FY, 4),
            "FZ": round(self.FZ, 4),
            "MX": round(self.MX, 4),
            "MY": round(self.MY, 4),
            "MZ": round(self.MZ, 4),
        }


@dataclass
class AnalysisOutput:
    """Complete analysis output"""
    success: bool
    message: str
    
    # Global results
    reactions: List[ReactionResult]
    
    # Per-member results
    member_results: List[MemberResults]
    
    # Summary
    max_displacement: float
    max_moment: float
    max_shear: float
    
    # Stability check
    is_stable: bool
    stability_warnings: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "message": self.message,
            "reactions": [r.to_dict() for r in self.reactions],
            "member_results": [m.to_dict() for m in self.member_results],
            "max_displacement": round(self.max_displacement, 6),
            "max_moment": round(self.max_moment, 4),
            "max_shear": round(self.max_shear, 4),
            "is_stable": self.is_stable,
            "stability_warnings": self.stability_warnings,
        }


# ============================================================================
# SUPPORT MAPPING
# ============================================================================

def get_support_tuple(support_type: str) -> Tuple[bool, bool, bool, bool, bool, bool]:
    """
    Map frontend support type to PyNite constraint tuple.
    
    Returns: (Dx, Dy, Dz, Rx, Ry, Rz) where True = restrained
    """
    support_map = {
        "fixed": (True, True, True, True, True, True),
        "pinned": (True, True, True, False, False, False),
        "pin": (True, True, True, False, False, False),
        "roller": (False, True, True, False, False, False),
        "roller_x": (False, True, True, False, False, False),  # Free in X
        "roller_y": (True, False, True, False, False, False),  # Free in Y
        "roller_z": (True, True, False, False, False, False),  # Free in Z
        "hinge": (True, True, True, False, False, False),
        "free": (False, False, False, False, False, False),
    }
    
    return support_map.get(support_type.lower(), (False, False, False, False, False, False))


# ============================================================================
# FEA ENGINE CLASS
# ============================================================================

class FEAEngine:
    """
    3D Frame Analysis Engine using PyNite
    
    Usage:
        engine = FEAEngine()
        engine.add_node("N1", 0, 0, 0, support="fixed")
        engine.add_node("N2", 5, 0, 0)
        engine.add_member("M1", "N1", "N2", E=210000, Iy=19430000, Iz=1420000, A=2850)
        engine.add_distributed_load("M1", "Fy", -10, -10)  # 10 kN/m downward
        result = engine.analyze()
    """
    
    def __init__(self):
        """Initialize the FEA engine"""
        if not PYNITE_AVAILABLE:
            raise ImportError("PyNite is not installed. Run: pip install PyNiteFEA")
        
        self.model = FEModel3D()
        self.nodes: Dict[str, NodeInput] = {}
        self.members: Dict[str, MemberInput] = {}
        self.point_loads: List[PointLoadInput] = []
        self.distributed_loads: List[DistributedLoadInput] = []
        self.node_loads: List[NodeLoadInput] = []
        self.load_cases: set = {"D"}  # Default load case
        self._analyzed = False
    
    # ────────────────────────────────────────────────────────────────────────
    # NODE METHODS
    # ────────────────────────────────────────────────────────────────────────
    
    def add_node(
        self,
        node_id: str,
        x: float,
        y: float,
        z: float,
        support: Optional[str] = None
    ) -> None:
        """
        Add a node to the model.
        
        Args:
            node_id: Unique identifier for the node
            x, y, z: Coordinates in meters
            support: Support type ("fixed", "pinned", "roller", etc.)
        """
        # Store internally
        self.nodes[node_id] = NodeInput(node_id, x, y, z, support)
        
        # Add to PyNite model
        self.model.add_node(node_id, x, y, z)
        
        # Apply support if specified
        if support and support.lower() != "free":
            Dx, Dy, Dz, Rx, Ry, Rz = get_support_tuple(support)
            self.model.def_support(node_id, Dx, Dy, Dz, Rx, Ry, Rz)
    
    def add_nodes_from_list(self, nodes: List[Dict[str, Any]]) -> None:
        """Add multiple nodes from a list of dictionaries"""
        for node in nodes:
            self.add_node(
                node_id=str(node["id"]),
                x=float(node["x"]),
                y=float(node["y"]),
                z=float(node["z"]),
                support=node.get("support")
            )
    
    # ────────────────────────────────────────────────────────────────────────
    # MEMBER METHODS
    # ────────────────────────────────────────────────────────────────────────
    
    def add_member(
        self,
        member_id: str,
        start_node: str,
        end_node: str,
        E: float = 210000.0,      # MPa
        G: float = 81000.0,       # MPa
        Iy: float = 19430000.0,   # mm^4
        Iz: float = 1420000.0,    # mm^4
        J: float = 150000.0,      # mm^4
        A: float = 2850.0,        # mm^2
    ) -> None:
        """
        Add a member (beam/column) to the model.
        
        Args:
            member_id: Unique identifier
            start_node: Start node ID
            end_node: End node ID
            E: Young's modulus in MPa (N/mm²)
            G: Shear modulus in MPa
            Iy: Moment of inertia about local y-axis (mm^4)
            Iz: Moment of inertia about local z-axis (mm^4)
            J: Torsional constant (mm^4)
            A: Cross-sectional area (mm^2)
        
        Note: PyNite expects consistent units. We convert:
            - E, G: MPa → kN/m² (multiply by 1000)
            - Iy, Iz, J: mm^4 → m^4 (multiply by 1e-12)
            - A: mm² → m² (multiply by 1e-6)
        """
        # Store internally
        self.members[member_id] = MemberInput(
            member_id, start_node, end_node, E, G, Iy, Iz, J, A
        )
        
        # Unit conversions for PyNite (uses kN and m)
        E_kN_m2 = E * 1000      # MPa to kN/m²
        G_kN_m2 = G * 1000      # MPa to kN/m²
        Iy_m4 = Iy * 1e-12      # mm^4 to m^4
        Iz_m4 = Iz * 1e-12      # mm^4 to m^4
        J_m4 = J * 1e-12        # mm^4 to m^4
        A_m2 = A * 1e-6         # mm² to m²
        
        # Add to PyNite model
        self.model.add_member(
            member_id,
            start_node,
            end_node,
            E_kN_m2,
            G_kN_m2,
            Iy_m4,
            Iz_m4,
            J_m4,
            A_m2
        )
    
    def add_members_from_list(self, members: List[Dict[str, Any]]) -> None:
        """Add multiple members from a list of dictionaries"""
        for member in members:
            self.add_member(
                member_id=str(member["id"]),
                start_node=str(member["startNode"]),
                end_node=str(member["endNode"]),
                E=float(member.get("E", 210000)),
                G=float(member.get("G", 81000)),
                Iy=float(member.get("Iy", 19430000)),
                Iz=float(member.get("Iz", 1420000)),
                J=float(member.get("J", 150000)),
                A=float(member.get("A", 2850)),
            )
    
    # ────────────────────────────────────────────────────────────────────────
    # LOAD METHODS
    # ────────────────────────────────────────────────────────────────────────
    
    def add_point_load(
        self,
        member_id: str,
        direction: str,
        magnitude: float,
        position: float,
        load_case: str = "D"
    ) -> None:
        """
        Add a point load on a member.
        
        Args:
            member_id: Member to apply load to
            direction: "Fy" (vertical), "Fz", "Fx", "Mx", "My", "Mz"
            magnitude: Force in kN or moment in kNm (negative = downward for Fy)
            position: Distance from start node in meters
            load_case: Load case name (default: "D" for dead load)
        """
        self.load_cases.add(load_case)
        self.point_loads.append(PointLoadInput(
            member_id, direction, magnitude, position, load_case
        ))
        
        # Add to PyNite - member point load
        # PyNite signature: add_member_pt_load(Member, Direction, P, x, case)
        self.model.add_member_pt_load(
            member_id,
            direction,
            magnitude,
            position,
            load_case
        )
    
    def add_distributed_load(
        self,
        member_id: str,
        direction: str,
        w1: float,
        w2: float,
        x1: Optional[float] = None,
        x2: Optional[float] = None,
        load_case: str = "D"
    ) -> None:
        """
        Add a distributed load on a member.
        
        Args:
            member_id: Member to apply load to
            direction: "Fy" (vertical), "Fz"
            w1: Start magnitude in kN/m (negative = downward for Fy)
            w2: End magnitude in kN/m
            x1: Start position (None = start of member)
            x2: End position (None = end of member)
            load_case: Load case name
        """
        self.load_cases.add(load_case)
        self.distributed_loads.append(DistributedLoadInput(
            member_id, direction, w1, w2, x1, x2, load_case
        ))
        
        # Add to PyNite
        # PyNite signature: add_member_dist_load(Member, Direction, w1, w2, x1, x2, case)
        self.model.add_member_dist_load(
            member_id,
            direction,
            w1,
            w2,
            x1,
            x2,
            load_case
        )
    
    def add_node_load(
        self,
        node_id: str,
        direction: str,
        magnitude: float,
        load_case: str = "D"
    ) -> None:
        """
        Add a load directly to a node.
        
        Args:
            node_id: Node to apply load to
            direction: "FX", "FY", "FZ", "MX", "MY", "MZ"
            magnitude: Force in kN or moment in kNm
            load_case: Load case name
        """
        self.load_cases.add(load_case)
        self.node_loads.append(NodeLoadInput(node_id, direction, magnitude, load_case))
        
        # Add to PyNite
        self.model.add_node_load(node_id, direction, magnitude, load_case)
    
    def add_loads_from_list(self, loads: List[Dict[str, Any]]) -> None:
        """Add multiple loads from a list of dictionaries"""
        for load in loads:
            load_type = load.get("type", "point").lower()
            
            if load_type == "point":
                if "node_id" in load or "nodeId" in load:
                    # Node load
                    self.add_node_load(
                        node_id=str(load.get("node_id") or load.get("nodeId")),
                        direction=load["direction"],
                        magnitude=float(load["magnitude"]),
                        load_case=load.get("load_case", load.get("loadCase", "D"))
                    )
                else:
                    # Member point load
                    self.add_point_load(
                        member_id=str(load.get("member_id") or load.get("memberId")),
                        direction=load["direction"],
                        magnitude=float(load["magnitude"]),
                        position=float(load["position"]),
                        load_case=load.get("load_case", load.get("loadCase", "D"))
                    )
            
            elif load_type == "distributed":
                self.add_distributed_load(
                    member_id=str(load.get("member_id") or load.get("memberId")),
                    direction=load["direction"],
                    w1=float(load["w1"]),
                    w2=float(load.get("w2", load["w1"])),
                    x1=load.get("x1"),
                    x2=load.get("x2"),
                    load_case=load.get("load_case", load.get("loadCase", "D"))
                )
    
    # ────────────────────────────────────────────────────────────────────────
    # ANALYSIS METHODS
    # ────────────────────────────────────────────────────────────────────────
    
    def analyze(self, check_stability: bool = True, load_combo: str = "D") -> AnalysisOutput:
        """
        Run the finite element analysis.
        
        Args:
            check_stability: Whether to check model stability
            load_combo: Load combination to analyze (default: "D")
        
        Returns:
            AnalysisOutput with all results
        """
        stability_warnings = []
        
        try:
            # Add load combination if not already defined
            # Simple combination: 1.0 * D (dead load)
            try:
                self.model.add_load_combo("1.0D", {"D": 1.0})
            except:
                pass  # Combo may already exist
            
            # Run analysis
            self.model.analyze(check_statics=check_stability)
            self._analyzed = True
            
            # Check stability
            is_stable = True
            if check_stability:
                # PyNite will raise an error if unstable, so if we get here, it's stable
                pass
            
        except Exception as e:
            error_msg = str(e)
            if "unstable" in error_msg.lower() or "singular" in error_msg.lower():
                return AnalysisOutput(
                    success=False,
                    message=f"Structure is unstable: {error_msg}",
                    reactions=[],
                    member_results=[],
                    max_displacement=0,
                    max_moment=0,
                    max_shear=0,
                    is_stable=False,
                    stability_warnings=["Structure is unstable. Check supports and connectivity."]
                )
            else:
                return AnalysisOutput(
                    success=False,
                    message=f"Analysis failed: {error_msg}",
                    reactions=[],
                    member_results=[],
                    max_displacement=0,
                    max_moment=0,
                    max_shear=0,
                    is_stable=False,
                    stability_warnings=[error_msg]
                )
        
        # Extract results
        reactions = self._extract_reactions(load_combo)
        member_results = self._extract_member_results(load_combo)
        
        # Calculate global maximums
        max_displacement = 0.0
        max_moment = 0.0
        max_shear = 0.0
        
        for mr in member_results:
            max_displacement = max(max_displacement, abs(mr.max_deflection))
            max_moment = max(max_moment, abs(mr.max_moment_z), abs(mr.max_moment_y))
            max_shear = max(max_shear, abs(mr.max_shear_y), abs(mr.max_shear_z))
        
        return AnalysisOutput(
            success=True,
            message="Analysis completed successfully",
            reactions=reactions,
            member_results=member_results,
            max_displacement=max_displacement,
            max_moment=max_moment,
            max_shear=max_shear,
            is_stable=is_stable,
            stability_warnings=stability_warnings
        )
    
    def _extract_reactions(self, load_combo: str) -> List[ReactionResult]:
        """Extract support reactions from the model"""
        reactions = []
        
        for node_id, node_input in self.nodes.items():
            if node_input.support and node_input.support.lower() != "free":
                try:
                    node = self.model.Nodes[node_id]
                    
                    # Get reactions (returns None if not restrained)
                    FX = node.RxnFX.get(load_combo, 0) or 0
                    FY = node.RxnFY.get(load_combo, 0) or 0
                    FZ = node.RxnFZ.get(load_combo, 0) or 0
                    MX = node.RxnMX.get(load_combo, 0) or 0
                    MY = node.RxnMY.get(load_combo, 0) or 0
                    MZ = node.RxnMZ.get(load_combo, 0) or 0
                    
                    reactions.append(ReactionResult(
                        node_id=node_id,
                        FX=float(FX),
                        FY=float(FY),
                        FZ=float(FZ),
                        MX=float(MX),
                        MY=float(MY),
                        MZ=float(MZ)
                    ))
                except Exception as e:
                    print(f"Warning: Could not extract reactions for node {node_id}: {e}")
        
        return reactions
    
    def _extract_member_results(self, load_combo: str, num_points: int = 100) -> List[MemberResults]:
        """
        Extract detailed results for all members.
        
        Generates 100-point arrays for shear, moment, and deflection diagrams.
        """
        results = []
        
        for member_id, member_input in self.members.items():
            try:
                member = self.model.Members[member_id]
                length = member.L()
                
                # Generate 100 points along the member
                x_vals = np.linspace(0, length, num_points).tolist()
                
                # Initialize arrays
                shear_y = []
                shear_z = []
                moment_y = []
                moment_z = []
                axial = []
                deflection_y = []
                deflection_z = []
                
                for x in x_vals:
                    # Shear forces
                    try:
                        vy = member.shear("Fy", x, load_combo)
                        vz = member.shear("Fz", x, load_combo)
                    except:
                        vy = vz = 0
                    shear_y.append(float(vy) if vy else 0)
                    shear_z.append(float(vz) if vz else 0)
                    
                    # Bending moments
                    try:
                        my = member.moment("My", x, load_combo)
                        mz = member.moment("Mz", x, load_combo)
                    except:
                        my = mz = 0
                    moment_y.append(float(my) if my else 0)
                    moment_z.append(float(mz) if mz else 0)
                    
                    # Axial force
                    try:
                        ax = member.axial(x, load_combo)
                    except:
                        ax = 0
                    axial.append(float(ax) if ax else 0)
                    
                    # Deflections
                    try:
                        dy = member.deflection("dy", x, load_combo)
                        dz = member.deflection("dz", x, load_combo)
                    except:
                        dy = dz = 0
                    deflection_y.append(float(dy) if dy else 0)
                    deflection_z.append(float(dz) if dz else 0)
                
                # Calculate max/min values
                max_shear_y = max(shear_y) if shear_y else 0
                min_shear_y = min(shear_y) if shear_y else 0
                max_shear_z = max(shear_z) if shear_z else 0
                min_shear_z = min(shear_z) if shear_z else 0
                max_moment_y = max(moment_y) if moment_y else 0
                min_moment_y = min(moment_y) if moment_y else 0
                max_moment_z = max(moment_z) if moment_z else 0
                min_moment_z = min(moment_z) if moment_z else 0
                max_axial = max(axial) if axial else 0
                min_axial = min(axial) if axial else 0
                
                # Max deflection (magnitude)
                max_defl_y = max(abs(d) for d in deflection_y) if deflection_y else 0
                max_defl_z = max(abs(d) for d in deflection_z) if deflection_z else 0
                max_deflection = max(max_defl_y, max_defl_z)
                
                # Max torsion (at ends)
                try:
                    torsion_start = abs(member.torsion(0, load_combo) or 0)
                    torsion_end = abs(member.torsion(length, load_combo) or 0)
                    max_torsion = max(torsion_start, torsion_end)
                except:
                    max_torsion = 0
                
                results.append(MemberResults(
                    member_id=member_id,
                    length=length,
                    max_shear_y=max_shear_y,
                    min_shear_y=min_shear_y,
                    max_shear_z=max_shear_z,
                    min_shear_z=min_shear_z,
                    max_moment_y=max_moment_y,
                    min_moment_y=min_moment_y,
                    max_moment_z=max_moment_z,
                    min_moment_z=min_moment_z,
                    max_axial=max_axial,
                    min_axial=min_axial,
                    max_torsion=max_torsion,
                    max_deflection=max_deflection,
                    shear_y_diagram=DiagramData(x_vals, shear_y),
                    shear_z_diagram=DiagramData(x_vals, shear_z),
                    moment_y_diagram=DiagramData(x_vals, moment_y),
                    moment_z_diagram=DiagramData(x_vals, moment_z),
                    axial_diagram=DiagramData(x_vals, axial),
                    deflection_y_diagram=DiagramData(x_vals, deflection_y),
                    deflection_z_diagram=DiagramData(x_vals, deflection_z),
                ))
                
            except Exception as e:
                print(f"Warning: Could not extract results for member {member_id}: {e}")
        
        return results
    
    # ────────────────────────────────────────────────────────────────────────
    # CONVENIENCE METHODS
    # ────────────────────────────────────────────────────────────────────────
    
    def from_json(self, json_data: Union[str, Dict]) -> "FEAEngine":
        """
        Load a complete model from JSON.
        
        Expected format:
        {
            "nodes": [
                {"id": "N1", "x": 0, "y": 0, "z": 0, "support": "fixed"},
                {"id": "N2", "x": 5, "y": 0, "z": 0}
            ],
            "members": [
                {"id": "M1", "startNode": "N1", "endNode": "N2", "E": 210000, "Iy": 19430000, ...}
            ],
            "loads": [
                {"type": "distributed", "memberId": "M1", "direction": "Fy", "w1": -10, "w2": -10}
            ]
        }
        """
        if isinstance(json_data, str):
            data = json.loads(json_data)
        else:
            data = json_data
        
        # Add nodes
        if "nodes" in data:
            self.add_nodes_from_list(data["nodes"])
        
        # Add members
        if "members" in data:
            self.add_members_from_list(data["members"])
        
        # Add loads
        if "loads" in data:
            self.add_loads_from_list(data["loads"])
        
        return self
    
    def get_summary(self) -> Dict[str, Any]:
        """Get a summary of the model"""
        return {
            "num_nodes": len(self.nodes),
            "num_members": len(self.members),
            "num_point_loads": len(self.point_loads),
            "num_distributed_loads": len(self.distributed_loads),
            "num_node_loads": len(self.node_loads),
            "load_cases": list(self.load_cases),
            "analyzed": self._analyzed,
        }


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

def analyze_frame(model_json: Union[str, Dict]) -> Dict[str, Any]:
    """
    One-line function to analyze a 3D frame from JSON.
    
    Args:
        model_json: JSON string or dict with nodes, members, loads
    
    Returns:
        Dictionary with analysis results
    
    Example:
        result = analyze_frame({
            "nodes": [
                {"id": "N1", "x": 0, "y": 0, "z": 0, "support": "fixed"},
                {"id": "N2", "x": 10, "y": 0, "z": 0}
            ],
            "members": [
                {"id": "M1", "startNode": "N1", "endNode": "N2"}
            ],
            "loads": [
                {"type": "distributed", "memberId": "M1", "direction": "Fy", "w1": -10, "w2": -10}
            ]
        })
    """
    engine = FEAEngine()
    engine.from_json(model_json)
    result = engine.analyze()
    return result.to_dict()


def analyze_simply_supported_beam_fea(
    length: float,
    load_type: str = "distributed",
    load_magnitude: float = -10,  # kN/m or kN
    load_position: Optional[float] = None,  # For point loads
    E: float = 210000,
    Iy: float = 19430000,
    A: float = 2850
) -> Dict[str, Any]:
    """
    Quick analysis of a simply supported beam.
    
    Args:
        length: Beam length in meters
        load_type: "distributed" or "point"
        load_magnitude: Load magnitude (negative = downward)
        load_position: Position for point load (default: midspan)
        E: Young's modulus in MPa
        Iy: Moment of inertia in mm^4
        A: Area in mm^2
    
    Returns:
        Analysis results dictionary
    """
    engine = FEAEngine()
    
    # Add nodes
    engine.add_node("N1", 0, 0, 0, support="pinned")
    engine.add_node("N2", length, 0, 0, support="roller_x")
    
    # Add member
    engine.add_member("M1", "N1", "N2", E=E, Iy=Iy, A=A)
    
    # Add load
    if load_type == "distributed":
        engine.add_distributed_load("M1", "Fy", load_magnitude, load_magnitude)
    else:
        pos = load_position if load_position is not None else length / 2
        engine.add_point_load("M1", "Fy", load_magnitude, pos)
    
    # Analyze
    result = engine.analyze()
    return result.to_dict()


def analyze_cantilever_beam_fea(
    length: float,
    load_type: str = "distributed",
    load_magnitude: float = -10,
    load_position: Optional[float] = None,
    E: float = 210000,
    Iy: float = 19430000,
    A: float = 2850
) -> Dict[str, Any]:
    """
    Quick analysis of a cantilever beam.
    
    Args:
        length: Beam length in meters
        load_type: "distributed" or "point"
        load_magnitude: Load magnitude (negative = downward)
        load_position: Position for point load (default: tip)
        E: Young's modulus in MPa
        Iy: Moment of inertia in mm^4
        A: Area in mm^2
    
    Returns:
        Analysis results dictionary
    """
    engine = FEAEngine()
    
    # Add nodes
    engine.add_node("N1", 0, 0, 0, support="fixed")
    engine.add_node("N2", length, 0, 0)
    
    # Add member
    engine.add_member("M1", "N1", "N2", E=E, Iy=Iy, A=A)
    
    # Add load
    if load_type == "distributed":
        engine.add_distributed_load("M1", "Fy", load_magnitude, load_magnitude)
    else:
        pos = load_position if load_position is not None else length
        engine.add_point_load("M1", "Fy", load_magnitude, pos)
    
    # Analyze
    result = engine.analyze()
    return result.to_dict()


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    # Example: Portal Frame
    print("=" * 60)
    print("PyNite FEA Engine - Portal Frame Example")
    print("=" * 60)
    
    if not PYNITE_AVAILABLE:
        print("PyNite not installed. Install with: pip install PyNiteFEA")
        exit(1)
    
    # Create engine
    engine = FEAEngine()
    
    # Portal frame nodes
    engine.add_node("N1", 0, 0, 0, support="fixed")
    engine.add_node("N2", 0, 4, 0)  # Top of left column
    engine.add_node("N3", 6, 4, 0)  # Top of right column  
    engine.add_node("N4", 6, 0, 0, support="fixed")
    
    # Members (columns and beam)
    engine.add_member("C1", "N1", "N2")  # Left column
    engine.add_member("B1", "N2", "N3")  # Beam
    engine.add_member("C2", "N3", "N4")  # Right column
    
    # Distributed load on beam
    engine.add_distributed_load("B1", "Fy", -15, -15)  # 15 kN/m downward
    
    # Analyze
    result = engine.analyze()
    
    # Print results
    print(f"\nSuccess: {result.success}")
    print(f"Message: {result.message}")
    print(f"Stable: {result.is_stable}")
    
    print("\n--- Reactions ---")
    for r in result.reactions:
        print(f"  Node {r.node_id}: FX={r.FX:.2f} kN, FY={r.FY:.2f} kN, MZ={r.MZ:.2f} kNm")
    
    print("\n--- Member Results ---")
    for m in result.member_results:
        print(f"  Member {m.member_id} (L={m.length:.2f}m):")
        print(f"    Max Shear Vy: {m.max_shear_y:.2f} kN")
        print(f"    Max Moment Mz: {m.max_moment_z:.2f} kNm")
        print(f"    Max Deflection: {m.max_deflection*1000:.4f} mm")
    
    print("\n--- Summary ---")
    print(f"Max Displacement: {result.max_displacement*1000:.4f} mm")
    print(f"Max Moment: {result.max_moment:.2f} kNm")
    print(f"Max Shear: {result.max_shear:.2f} kN")
