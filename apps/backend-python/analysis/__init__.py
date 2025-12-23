"""
BeamLab Analysis Module

Structural analysis solvers:
- BeamSolver: Hand calculation steps for simple beams
- FEAEngine: Full 3D frame analysis using PyNite
"""

from .solver import BeamSolver, AnalysisResult

# FEA Engine (requires PyNite)
try:
    from .fea_engine import (
        FEAEngine,
        analyze_frame,
        analyze_simply_supported_beam_fea,
        analyze_cantilever_beam_fea,
        AnalysisOutput,
        MemberResults,
        ReactionResult,
    )
    FEA_AVAILABLE = True
except ImportError:
    FEA_AVAILABLE = False
    FEAEngine = None
    analyze_frame = None

__all__ = [
    'BeamSolver', 
    'AnalysisResult',
    'FEAEngine',
    'analyze_frame',
    'analyze_simply_supported_beam_fea',
    'analyze_cantilever_beam_fea',
    'AnalysisOutput',
    'MemberResults',
    'ReactionResult',
    'FEA_AVAILABLE',
]
