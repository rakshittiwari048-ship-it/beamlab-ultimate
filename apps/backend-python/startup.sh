#!/bin/bash
# Azure App Service startup script for FastAPI with Gunicorn

# Install dependencies
pip install -q gunicorn uvicorn

# Run the app
gunicorn -w 2 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 --access-logfile - main:app
