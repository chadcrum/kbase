"""Main FastAPI application."""

import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.api.v1 import api_router
from app.config import settings
from app.services.git_service import GitService

# Initialize git service
git_service = GitService()


async def git_commit_task():
    """Background task that commits changes every 5 minutes."""
    # Wait a bit before first commit to let server start
    await asyncio.sleep(60)
    
    while True:
        try:
            git_service.commit_changes()
        except Exception as e:
            # Log error but don't crash the task
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in git commit task: {e}", exc_info=True)
        
        # Wait 5 minutes (300 seconds) before next commit
        await asyncio.sleep(300)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup: Initialize git and start background task
    try:
        git_service.initialize_git()
        git_service.ensure_gitignore()
        # Perform initial commit on startup
        git_service.commit_changes()
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Git initialization failed: {e}", exc_info=True)
    
    # Start background task
    task = asyncio.create_task(git_commit_task())
    
    yield
    
    # Shutdown: Cancel background task
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="A web-based note-taking application with markdown support",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
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
    
    # Mount icons directory for PWA icons and favicons
    icons_dir = os.path.join(static_dir, "icons")
    if os.path.exists(icons_dir):
        app.mount("/icons", CacheStaticFiles(directory=icons_dir), name="icons")
    
    # Serve favicon.ico explicitly
    @app.get("/favicon.ico")
    async def serve_favicon():
        """Serve the favicon file."""
        favicon_path = os.path.join(static_dir, "favicon.ico")
        if os.path.exists(favicon_path):
            return FileResponse(favicon_path, headers={"Cache-Control": "public, max-age=31536000, immutable"})
        return {"detail": "Favicon not found"}
    
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
        
        # Don't serve index.html for known static file requests
        if full_path in ["favicon.ico", "manifest.webmanifest"] or full_path.startswith("icons/"):
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
    git_status = git_service.get_status()
    return {
        "status": "healthy",
        "vault_path": str(settings.vault_path),
        "git_status": git_status
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )
