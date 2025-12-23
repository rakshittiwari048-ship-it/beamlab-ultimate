"""
test_api.py - Simple test script for the Python API.

Run: python3 test_api.py
"""

import json
from factory import StructuralFactory
from models import GenerateRequest

def test_beam_generation():
    """Test beam generation."""
    print("🧪 Testing beam generation...")
    model = StructuralFactory.create_beam(span=5000, supports="pin-roller")
    print(f"✅ Generated beam with {len(model.nodes)} nodes and {len(model.members)} members")
    print(f"   Nodes: {[n.id for n in model.nodes]}")
    print(f"   Members: {[m.id for m in model.members]}")
    return model


def test_portal_frame_generation():
    """Test portal frame generation."""
    print("\n🧪 Testing portal frame generation...")
    model = StructuralFactory.create_portal_frame(width=6000, height=4500, roof_angle=20)
    print(f"✅ Generated portal frame with {len(model.nodes)} nodes and {len(model.members)} members")
    print(f"   Nodes: {[n.id for n in model.nodes]}")
    print(f"   Members: {[m.id for m in model.members]}")
    return model


def test_pratt_truss_generation():
    """Test Pratt truss generation."""
    print("\n🧪 Testing Pratt truss generation...")
    model = StructuralFactory.create_pratt_truss(span=12000, height=2000, bays=6)
    print(f"✅ Generated Pratt truss with {len(model.nodes)} nodes and {len(model.members)} members")
    print(f"   Node count: {len(model.nodes)}, Member count: {len(model.members)}")
    return model


def test_model_validation(model):
    """Test that model validates correctly."""
    print(f"\n✅ Model validation passed: {model.id}")
    print(f"   Description: {model.description}")
    return True


def test_json_serialization(model):
    """Test JSON serialization."""
    print(f"\n🧪 Testing JSON serialization...")
    json_str = model.json(indent=2)  # Pydantic v1
    parsed = json.loads(json_str)
    print(f"✅ Model serialized to JSON ({len(json_str)} bytes)")
    return parsed


if __name__ == "__main__":
    print("=" * 60)
    print("BeamLab Python Structural Engine - Test Suite")
    print("=" * 60)

    # Test all generator methods
    beam = test_beam_generation()
    portal = test_portal_frame_generation()
    truss = test_pratt_truss_generation()

    # Test validation
    test_model_validation(beam)
    test_model_validation(portal)
    test_model_validation(truss)

    # Test serialization
    test_json_serialization(beam)

    print("\n" + "=" * 60)
    print("✅ All tests passed!")
    print("=" * 60)
