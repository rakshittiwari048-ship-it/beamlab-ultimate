#!/bin/bash
set -e

echo "Starting FastAPI app..."
cd /home/site/wwwroot

# Install dependencies quietly
echo "Installing Python dependencies..."
pip install -q --no-cache-dir -r requirements.txt gunicorn uvicorn

# Run with single worker for F1 free tier
echo "Starting Gunicorn..."
exec gunicorn -w 1 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 --timeout 120 main:app
