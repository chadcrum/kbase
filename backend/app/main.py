"""Main FastAPI application."""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.api.v1 import api_router
from app.config import settings

# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="A web-based note-taking application with markdown support",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1")

# Serve static files (frontend) if they exist
static_dir = os.path.join(os.path.dirname(__file__), "..", "dist")
if os.path.exists(static_dir):
    # Mount static files at root path with cache headers
    from starlette.responses import Response
    
    class CacheStaticFiles(StaticFiles):
        async def get_response(self, path: str, scope):
            response = await super().get_response(path, scope)
            if isinstance(response, Response):
                # Cache static assets (JS, CSS, images) for 1 year
                if path.endswith(('.js', '.css', '.png', '.jpg', '.svg', '.ico', '.woff2', '.webp')):
                    response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
                # Don't cache HTML or manifest
                elif path.endswith('.html') or 'manifest' in path:
                    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
                    response.headers['Pragma'] = 'no-cache'
                    response.headers['Expires'] = '0'
            return response
    
    app.mount("/assets", CacheStaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")
    
    # Serve manifest files
    @app.get("/manifest.webmanifest")
    async def serve_manifest():
        """Serve the PWA manifest file."""
        manifest_path = os.path.join(static_dir, "manifest.webmanifest")
        if os.path.exists(manifest_path):
            with open(manifest_path, 'r') as f:
                return Response(content=f.read(), media_type="application/manifest+json")
        return {"detail": "Manifest not found"}
    
    # Serve index.html for all non-API routes (SPA routing)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the SPA for all non-API routes."""
        # Don't interfere with API routes
        if full_path.startswith("api/"):
            return {"detail": "Not Found"}
        
        # Serve index.html for SPA routing
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            response = FileResponse(index_path)
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            return response
        else:
            return {"detail": "Frontend not found"}


@app.get("/")
async def root():
    """Root endpoint with basic information."""
    return {
        "message": f"Welcome to {settings.app_name}",
        "version": settings.app_version,
        "vault_path": str(settings.vault_path),
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "vault_path": str(settings.vault_path)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )
