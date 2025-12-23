"""FastAPI entry point for structural template generation."""

import json
import logging
import asyncio
import os
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from factory import StructuralFactory
from models import StructuralModel
from analysis.solver import (
    analyze_simply_supported_beam,
    analyze_cantilever_beam,
    BeamSolver,
    LoadType,
    SupportType
)

# ============================================================================
# Configuration
# ============================================================================

# AI Mock Mode - Set to False to use real AI API
USE_MOCK_AI = os.getenv("USE_MOCK_AI", "True").lower() == "true"

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


app = FastAPI(title="BeamLab Structural Engine", version="1.0.0")

# CORS Configuration - Support multiple origins for production
ALLOWED_ORIGINS = [
    "http://localhost:8000",
    "http://localhost:5173",
    os.getenv("FRONTEND_URL", ""),
    "https://beamlabultimate.tech",
    "https://www.beamlabultimate.tech",
]
# Remove empty strings
ALLOWED_ORIGINS = [origin for origin in ALLOWED_ORIGINS if origin]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "healthy"}


# ============================================================================
# BEAM ANALYSIS ENDPOINTS (Hand Calculation Steps)
# ============================================================================

@app.post("/analyze/beam", tags=["analysis"])
async def analyze_beam(request_data: dict):
    """
    Analyze a beam and return hand calculation steps with diagram data.
    
    Request body:
    {
        "length": 10.0,
        "beam_type": "simply_supported" | "cantilever",
        "loads": [
            {"type": "point", "magnitude": 50, "position": 5},
            {"type": "distributed", "magnitude": 10, "position": 0, "end_position": 10}
        ],
        "E": 200000,  // MPa (optional, default: 200 GPa steel)
        "I": 100000000  // mm^4 (optional)
    }
    
    Response:
    {
        "max_moment": {"result": 125.0, "unit": "kNm"},
        "max_shear": {"result": 50.0, "unit": "kN"},
        "max_deflection": {"result": 15.2, "unit": "mm"},
        "reactions": {"Ra": 25.0, "Rb": 25.0},
        "steps": [
            "Step 1: Calculate Reaction Ra = ...",
            "Step 2: Max Moment at mid-span M = ...",
            ...
        ],
        "shear_diagram": {
            "x_vals": [0, 0.1, 0.2, ...],  // 100 points
            "y_vals": [25, 25, 25, ...]    // 100 points
        },
        "moment_diagram": {
            "x_vals": [0, 0.1, 0.2, ...],
            "y_vals": [0, 2.5, 5.0, ...]
        },
        "deflection_diagram": {
            "x_vals": [0, 0.1, 0.2, ...],
            "y_vals": [0, -0.5, -1.0, ...]
        }
    }
    """
    try:
        # Extract parameters
        length = request_data.get("length", 10.0)
        beam_type = request_data.get("beam_type", "simply_supported")
        loads = request_data.get("loads", [])
        E = request_data.get("E", 200e3)  # MPa
        I = request_data.get("I", 1e8)    # mm^4
        
        # Validate
        if length <= 0:
            raise HTTPException(status_code=400, detail="Beam length must be positive")
        
        if not loads:
            raise HTTPException(status_code=400, detail="At least one load is required")
        
        # Analyze based on beam type
        logger.info(f"[Analysis] Analyzing {beam_type} beam, L={length}m, {len(loads)} loads")
        
        if beam_type == "cantilever":
            result = analyze_cantilever_beam(length=length, loads=loads, E=E, I=I)
        else:
            result = analyze_simply_supported_beam(length=length, loads=loads, E=E, I=I)
        
        logger.info(f"[Analysis] Complete. Max moment: {result['max_moment']}")
        return result
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"[Analysis] Error: {str(exc)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(exc)}")


@app.post("/analyze/quick", tags=["analysis"])
async def quick_analysis(request_data: dict):
    """
    Quick beam analysis for common scenarios.
    Returns simplified results optimized for UI display.
    
    Request:
    {
        "scenario": "point_load_midspan" | "udl_full" | "point_load_cantilever",
        "length": 10.0,
        "load": 50.0
    }
    """
    try:
        scenario = request_data.get("scenario", "point_load_midspan")
        length = request_data.get("length", 10.0)
        load = request_data.get("load", 50.0)
        
        # Pre-defined scenarios for quick calculations
        if scenario == "point_load_midspan":
            loads = [{"type": "point", "magnitude": load, "position": length / 2}]
            result = analyze_simply_supported_beam(length=length, loads=loads)
            
        elif scenario == "udl_full":
            loads = [{"type": "distributed", "magnitude": load, "position": 0, "end_position": length}]
            result = analyze_simply_supported_beam(length=length, loads=loads)
            
        elif scenario == "point_load_cantilever":
            loads = [{"type": "point", "magnitude": load, "position": length}]
            result = analyze_cantilever_beam(length=length, loads=loads)
            
        else:
            raise HTTPException(status_code=400, detail=f"Unknown scenario: {scenario}")
        
        return {
            "scenario": scenario,
            "summary": {
                "max_moment": result["max_moment"],
                "max_shear": result["max_shear"],
                "max_deflection": result["max_deflection"],
            },
            "steps": result["steps"][:10],  # First 10 steps for quick view
            "diagrams": {
                "shear": result["shear_diagram"],
                "moment": result["moment_diagram"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"[Quick Analysis] Error: {str(exc)}")
        raise HTTPException(status_code=500, detail=str(exc))


# ============================================================================
# 3D FRAME ANALYSIS ENDPOINT (PyNite FEA)
# ============================================================================

@app.post("/analyze/frame", tags=["analysis"])
async def analyze_frame_endpoint(request_data: dict):
    """
    Full 3D frame analysis using PyNite FEA.
    
    Returns 100-point arrays for shear, moment, and deflection diagrams
    for visualization in the frontend.
    
    Request body:
    {
        "nodes": [
            {"id": "N1", "x": 0, "y": 0, "z": 0, "support": "fixed"},
            {"id": "N2", "x": 5, "y": 0, "z": 0},
            {"id": "N3", "x": 5, "y": 3, "z": 0, "support": "pinned"}
        ],
        "members": [
            {
                "id": "M1",
                "startNode": "N1",
                "endNode": "N2",
                "E": 210000,       // MPa (optional, default steel)
                "Iy": 19430000,   // mm^4 (optional)
                "Iz": 1420000,    // mm^4 (optional)
                "J": 150000,      // mm^4 (optional)
                "A": 2850         // mm^2 (optional)
            }
        ],
        "loads": [
            {
                "type": "distributed",
                "memberId": "M1",
                "direction": "Fy",
                "w1": -10,
                "w2": -10
            },
            {
                "type": "point",
                "memberId": "M2",
                "direction": "Fy",
                "magnitude": -50,
                "position": 2.5
            },
            {
                "type": "point",
                "nodeId": "N3",
                "direction": "FX",
                "magnitude": 20
            }
        ]
    }
    
    Response:
    {
        "success": true,
        "message": "Analysis completed successfully",
        "is_stable": true,
        "reactions": [
            {"node_id": "N1", "FX": 0, "FY": 50, "FZ": 0, "MX": 0, "MY": 0, "MZ": 125}
        ],
        "member_results": [
            {
                "member_id": "M1",
                "length": 5.0,
                "max_shear_y": 25.0,
                "max_moment_z": 62.5,
                "max_deflection": 0.0123,
                "shear_y_diagram": {"x_vals": [...100 pts], "y_vals": [...100 pts]},
                "moment_z_diagram": {"x_vals": [...], "y_vals": [...]},
                "deflection_y_diagram": {"x_vals": [...], "y_vals": [...]}
            }
        ],
        "max_displacement": 0.0123,
        "max_moment": 62.5,
        "max_shear": 25.0
    }
    """
    try:
        # Import FEA engine (lazy import to handle missing PyNite gracefully)
        try:
            from analysis.fea_engine import FEAEngine, analyze_frame
        except ImportError as e:
            raise HTTPException(
                status_code=503, 
                detail="PyNite FEA library not installed. Run: pip install PyNiteFEA"
            )
        
        # Validate input
        nodes = request_data.get("nodes", [])
        members = request_data.get("members", [])
        loads = request_data.get("loads", [])
        
        if not nodes:
            raise HTTPException(status_code=400, detail="At least one node is required")
        if not members:
            raise HTTPException(status_code=400, detail="At least one member is required")
        
        logger.info(f"[FEA] Analyzing frame: {len(nodes)} nodes, {len(members)} members, {len(loads)} loads")
        
        # Run analysis
        result = analyze_frame(request_data)
        
        if not result.get("success", False):
            logger.warning(f"[FEA] Analysis failed: {result.get('message')}")
            raise HTTPException(status_code=400, detail=result.get("message", "Analysis failed"))
        
        logger.info(f"[FEA] Complete. Max moment: {result.get('max_moment', 0):.2f} kNm")
        return result
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"[FEA] Error: {str(exc)}")
        raise HTTPException(status_code=500, detail=f"FEA analysis failed: {str(exc)}")


@app.post("/analyze/frame/simple", tags=["analysis"])
async def analyze_simple_frame(request_data: dict):
    """
    Quick analysis for simple beam configurations using FEA.
    
    Request:
    {
        "type": "simply_supported" | "cantilever",
        "length": 10.0,
        "load_type": "distributed" | "point",
        "load_magnitude": -10,
        "load_position": 5.0,  // For point loads only
        "E": 210000,
        "Iy": 19430000,
        "A": 2850
    }
    """
    try:
        from analysis.fea_engine import (
            analyze_simply_supported_beam_fea,
            analyze_cantilever_beam_fea
        )
        
        beam_type = request_data.get("type", "simply_supported")
        length = request_data.get("length", 10.0)
        load_type = request_data.get("load_type", "distributed")
        load_magnitude = request_data.get("load_magnitude", -10)
        load_position = request_data.get("load_position")
        E = request_data.get("E", 210000)
        Iy = request_data.get("Iy", 19430000)
        A = request_data.get("A", 2850)
        
        if beam_type == "cantilever":
            result = analyze_cantilever_beam_fea(
                length=length,
                load_type=load_type,
                load_magnitude=load_magnitude,
                load_position=load_position,
                E=E, Iy=Iy, A=A
            )
        else:
            result = analyze_simply_supported_beam_fea(
                length=length,
                load_type=load_type,
                load_magnitude=load_magnitude,
                load_position=load_position,
                E=E, Iy=Iy, A=A
            )
        
        return result
        
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="PyNite not installed. Run: pip install PyNiteFEA"
        )
    except Exception as exc:
        logger.error(f"[FEA Simple] Error: {str(exc)}")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/template/{template_type}", tags=["generation"], response_model=StructuralModel)
async def generate_template(
    template_type: str,
    spans: Optional[List[float]] = Query(default=None, description="List of spans for continuous beam"),
    span: Optional[float] = Query(default=None, description="Span for truss"),
    height: Optional[float] = Query(default=None, description="Height for truss or frame"),
    bays: Optional[int] = Query(default=None, description="Number of bays for truss"),
    width: Optional[float] = Query(default=None, description="Width for 3D frame"),
    length: Optional[float] = Query(default=None, description="Length for 3D frame"),
    stories: Optional[int] = Query(default=None, description="Stories for 3D frame"),
    section_profile: str = Query(default="ISMB300", description="Section profile name"),
):
    try:
        if template_type == "beam":
            spans_list = spans if spans is not None else [10.0]
            return StructuralFactory.generate_continuous_beam(spans=spans_list, section_profile=section_profile)

        if template_type == "truss":
            if span is None or height is None or bays is None:
                raise HTTPException(status_code=400, detail="span, height, and bays are required for truss")
            return StructuralFactory.generate_pratt_truss(
                span=span, height=height, bays=bays, section_profile=section_profile
            )

        if template_type == "frame":
            if width is None or length is None or height is None or stories is None:
                raise HTTPException(
                    status_code=400, detail="width, length, height, and stories are required for frame"
                )
            return StructuralFactory.generate_3d_frame(
                width=width,
                length=length,
                height=height,
                stories=stories,
                section_profile=section_profile,
            )

        raise HTTPException(status_code=404, detail=f"Unknown template type: {template_type}")

    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - unexpected
        raise HTTPException(status_code=400, detail=str(exc))


# ============================================================================
# AI-Powered Endpoint
# ============================================================================

MOCK_BEAM_RESPONSE = {
    "nodes": [
        {"id": 1, "x": 0.0, "y": 0.0, "z": 0.0, "constraints": {"x": True, "y": True, "z": True, "rx": False, "ry": False, "rz": False}},
        {"id": 2, "x": 5.0, "y": 0.0, "z": 0.0, "constraints": {"x": False, "y": True, "z": True, "rx": False, "ry": False, "rz": False}},
        {"id": 3, "x": 10.0, "y": 0.0, "z": 0.0, "constraints": {"x": False, "y": True, "z": True, "rx": False, "ry": False, "rz": False}},
    ],
    "members": [
        {"id": 1, "startNode": 1, "endNode": 2, "section": "ISMB300", "material": "Steel"},
        {"id": 2, "startNode": 2, "endNode": 3, "section": "ISMB300", "material": "Steel"},
    ],
    "metadata": {
        "type": "beam",
        "span": 10.0,
        "units": "meters",
        "generated_by": "Mock AI",
    },
}


@app.post("/generate/ai", tags=["AI"], response_model=dict)
async def generate_from_prompt(request_data: dict):
    """
    Generate a structural template from natural language prompt using AI.
    
    Request body:
    {
        "prompt": "Create a 15m steel beam for a warehouse",
        "context": {
            "span": 15.0,
            "loading": "uniform",
            "material": "steel"
        }
    }
    
    Response:
    {
        "template": { nodes, members, metadata },
        "reasoning": "Generated a continuous beam because...",
        "confidence": 0.95
    }
    """
    
    logger.info(f"[AI Endpoint] Received prompt: {request_data.get('prompt', 'N/A')}")
    
    # Extract request fields
    prompt = request_data.get("prompt", "")
    context = request_data.get("context", {})
    
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt field is required")
    
    # ========================================================================
    # Mock Mode - For Testing Without Real API
    # ========================================================================
    
    if USE_MOCK_AI:
        logger.warning("[AI Endpoint] Using MOCK mode - set USE_MOCK_AI=False to use real AI")
        
        # Simulate API delay
        await asyncio.sleep(2)
        
        logger.info("[AI Endpoint] Mock AI generated response")
        return {
            "template": MOCK_BEAM_RESPONSE,
            "reasoning": f"Based on your prompt '{prompt}', generated a simple 10m steel beam with ISMB300 section. This is a mock response for testing.",
            "confidence": 0.85,
            "mode": "mock"
        }
    
    # ========================================================================
    # Real AI API Call (with error handling)
    # ========================================================================
    
    try:
        import google.generativeai as genai
        
        api_key = os.getenv("GOOGLE_AI_API_KEY")
        if not api_key:
            logger.error("[AI Endpoint] GOOGLE_AI_API_KEY environment variable not set")
            raise HTTPException(status_code=500, detail="AI API key not configured. Set GOOGLE_AI_API_KEY environment variable.")
        
        # Configure AI
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-pro')
        
        # Build AI prompt
        ai_prompt = f"""
You are a structural engineering expert. Based on the user's description, generate a JSON response for a structural template.

User Description: {prompt}

Context Information:
- Span: {context.get('span', 'Not specified')} meters
- Loading: {context.get('loading', 'Not specified')}
- Material: {context.get('material', 'Not specified')}

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{{
    "template": {{
        "nodes": [
            {{"id": 1, "x": 0.0, "y": 0.0, "z": 0.0, "constraints": {{"x": true, "y": true, "z": true, "rx": false, "ry": false, "rz": false}}}},
            ...more nodes...
        ],
        "members": [
            {{"id": 1, "startNode": 1, "endNode": 2, "section": "ISMB300", "material": "Steel"}},
            ...more members...
        ],
        "metadata": {{
            "type": "beam|truss|frame",
            "span": 10.0,
            "units": "meters"
        }}
    }},
    "reasoning": "Explanation of why this structure was chosen...",
    "confidence": 0.85
}}

Remember: Return ONLY the JSON, nothing else.
"""
        
        logger.info("[AI Endpoint] Calling Google Generative AI...")
        response = model.generate_content(ai_prompt)
        
        # ====================================================================
        # JSON Cleaning & Validation
        # ====================================================================
        
        raw_response = response.text
        logger.info(f"[AI Endpoint] Raw AI response (first 200 chars): {raw_response[:200]}")
        
        # Clean markdown code blocks
        clean_json = raw_response.replace("```json", "").replace("```", "").strip()
        
        # Additional cleaning for common AI patterns
        if clean_json.startswith("Here"):
            # Remove leading explanation
            clean_json = clean_json[clean_json.find("{"):]
        
        logger.info(f"[AI Endpoint] Cleaned response (first 200 chars): {clean_json[:200]}")
        
        # Validate and parse JSON
        try:
            parsed_response = json.loads(clean_json)
            logger.info("[AI Endpoint] JSON validation successful")
        except json.JSONDecodeError as e:
            logger.error(f"[AI Endpoint] JSON parsing failed: {str(e)}")
            logger.error(f"[AI Endpoint] Invalid JSON: {clean_json[:500]}")
            raise HTTPException(
                status_code=500,
                detail=f"AI returned invalid JSON: {str(e)}. Raw: {clean_json[:100]}"
            )
        
        # Validate response structure
        if "template" not in parsed_response:
            logger.error("[AI Endpoint] Missing 'template' key in response")
            raise HTTPException(status_code=500, detail="AI response missing required 'template' field")
        
        logger.info("[AI Endpoint] AI generation completed successfully")
        return parsed_response
        
    except HTTPException:
        # Re-raise HTTPExceptions (our custom errors)
        raise
    
    except ImportError as e:
        logger.error(f"[AI Endpoint] Google Generative AI library not installed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="AI provider not available. Install: pip install google-generativeai"
        )
    
    except Exception as e:
        # Catch all other errors
        error_msg = str(e)
        error_type = type(e).__name__
        
        logger.error(f"[AI Endpoint] {error_type}: {error_msg}")
        
        # Provide more context for common errors
        if "APIError" in error_type or "429" in error_msg:
            detail = "Rate limited by AI provider. Try again in a moment."
        elif "PermissionError" in error_type or "Invalid API key" in error_msg:
            detail = "Invalid or expired API key. Check GOOGLE_AI_API_KEY."
        elif "timeout" in error_msg.lower():
            detail = "AI provider timeout. Request took too long."
        else:
            detail = f"AI Provider Error: {error_msg[:100]}"
        
        raise HTTPException(
            status_code=500,
            detail=detail
        )


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    logger.info(f"Starting server with USE_MOCK_AI={USE_MOCK_AI}")
    uvicorn.run(app, host="0.0.0.0", port=8001)
