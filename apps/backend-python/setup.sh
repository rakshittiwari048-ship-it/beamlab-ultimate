#!/bin/bash
# setup.sh - Install and run the Python structural engine

set -e

echo "=================================="
echo "BeamLab Python Structural Engine Setup"
echo "=================================="

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate || . venv/Scripts/activate  # Windows compatibility

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Run tests
echo "🧪 Running tests..."
python3 test_api.py

echo ""
echo "=================================="
echo "✅ Setup complete!"
echo "=================================="
echo ""
echo "To start the server, run:"
echo "  source venv/bin/activate"
echo "  python3 main.py"
echo ""
echo "Server will be available at: http://localhost:8001"
echo "API docs: http://localhost:8001/docs"
echo ""
