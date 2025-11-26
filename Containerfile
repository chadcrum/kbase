# Multi-stage Containerfile for KBase

# Stage 1: Build frontend assets
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files for dependency installation
COPY frontend/package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build the frontend
RUN npm run build

# Stage 2: Production image
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install uv package manager
RUN pip install uv

# Copy backend source code
COPY backend/ ./

# Install Python dependencies
RUN uv sync

# Copy built frontend assets from frontend-builder stage
COPY --from=frontend-builder /app/frontend/dist ./dist

# Create a non-root user for security
RUN useradd --create-home --shell /bin/bash kbase
RUN chown -R kbase:kbase /app
USER kbase

# Expose port 8000
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

