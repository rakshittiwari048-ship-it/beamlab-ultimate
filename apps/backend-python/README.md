# Python Structural Engine (FastAPI)

FastAPI backend for generating structural models mathematically and via AI.

## Quick Start

```bash
cd apps/backend-python
pip install -r requirements.txt
python main.py
```

Server runs on `http://localhost:8001`

## Endpoints

### Health Check
```bash
GET /health
```

### Generate from Template
```bash
POST /generate/template
{
  "type": "beam",
  "params": {
    "span": 5000,
    "supports": "pin-roller",
    "section_id": "ISMB300"
  }
}
```

**Template types:**
- `beam`: Simple beam with support conditions
- `portal_frame`: 2D gable portal frame
- `pratt_truss`: Planar Pratt truss

### Generate from AI Prompt
```bash
POST /generate/ai
{
  "prompt": "Create a 10-meter span simply supported beam with ISMB300 section"
}
```

### List Templates
```bash
GET /templates
```

### List Sections
```bash
GET /sections
```

## Architecture

- **models.py**: Pydantic schemas (strict validation)
  - `Node`: Joint with coordinates and support constraints
  - `Member`: Beam/column/truss element with section properties
  - `StructuralModel`: Complete model with nodes and members

- **factory.py**: Mathematical generators
  - `StructuralFactory.create_beam()`: Generate simple beams
  - `StructuralFactory.create_portal_frame()`: Generate portal frames with roof pitch
  - `StructuralFactory.create_pratt_truss()`: Generate Pratt trusses

- **main.py**: FastAPI application
  - CORS enabled for localhost development
  - Two generation endpoints (template & AI)
  - Info endpoints for discovery

## Integration with Frontend

The TypeScript frontend at `http://localhost:8000` can call:

```typescript
// Generate beam model
const response = await fetch('http://localhost:8001/generate/template', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'beam',
    params: { span: 5000, supports: 'pin-roller' }
  })
});
const model = await response.json();
```

## Development

- Python 3.8+
- FastAPI framework
- Pydantic v2 for validation
- Uvicorn ASGI server
