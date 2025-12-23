#!/bin/bash
# example-requests.sh - Example API calls to the Python Structural Engine

BASE_URL="http://localhost:8001"

echo "========================================"
echo "BeamLab Python API - Example Requests"
echo "========================================"
echo ""

# Health check
echo "1️⃣  Health Check"
echo "   curl -X GET ${BASE_URL}/health"
echo ""
curl -X GET ${BASE_URL}/health | jq .
echo ""
echo ""

# List templates
echo "2️⃣  List Available Templates"
echo "   curl -X GET ${BASE_URL}/templates"
echo ""
curl -X GET ${BASE_URL}/templates | jq .
echo ""
echo ""

# Generate simple beam
echo "3️⃣  Generate Simple Beam (5m span, pin-roller)"
echo "   curl -X POST ${BASE_URL}/generate/template ..."
echo ""
curl -X POST ${BASE_URL}/generate/template \
  -H "Content-Type: application/json" \
  -d '{
    "type": "beam",
    "params": {
      "span": 5000,
      "supports": "pin-roller",
      "section_id": "ISMB300",
      "divisions": 3
    }
  }' | jq '.id, .description, (.nodes | length), (.members | length)'
echo ""
echo ""

# Generate portal frame
echo "4️⃣  Generate Portal Frame (6m x 4.5m with 20° roof)"
echo ""
curl -X POST ${BASE_URL}/generate/template \
  -H "Content-Type: application/json" \
  -d '{
    "type": "portal_frame",
    "params": {
      "width": 6000,
      "height": 4500,
      "roof_angle": 20,
      "section_id": "ISMB400"
    }
  }' | jq '.id, .description, (.nodes | length), (.members | length)'
echo ""
echo ""

# Generate Pratt truss
echo "5️⃣  Generate Pratt Truss (12m span, 6 bays)"
echo ""
curl -X POST ${BASE_URL}/generate/template \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pratt_truss",
    "params": {
      "span": 12000,
      "height": 2000,
      "bays": 6,
      "section_id": "UC152x152"
    }
  }' | jq '.id, .description, (.nodes | length), (.members | length)'
echo ""
echo ""

# Generate from AI prompt
echo "6️⃣  Generate from AI Prompt"
echo ""
curl -X POST ${BASE_URL}/generate/ai \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a 10-meter span simply supported steel beam with ISMB400 section"
  }' | jq '.id, .description, (.nodes | length), (.members | length)'
echo ""
echo ""

# List sections
echo "7️⃣  List Available Sections"
echo ""
curl -X GET ${BASE_URL}/sections | jq '.sections[] | {id, area, material}'
echo ""
echo ""

echo "========================================"
echo "✅ Example requests completed!"
echo "========================================"
