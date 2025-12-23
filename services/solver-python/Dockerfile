# Python Solver Microservice
# Optimized for structural analysis with scipy.sparse

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for scipy
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libopenblas-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy solver code
COPY solver.py .

# Create non-root user for security
RUN useradd -m -u 1000 solver
USER solver

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import scipy; import numpy; print('OK')"

# Default command (can be overridden)
ENTRYPOINT ["python", "solver.py"]
CMD ["--stdin"]
