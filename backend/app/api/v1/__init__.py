"""API v1 router configuration."""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, directories, notes

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(notes.router, prefix="/notes", tags=["notes"])
api_router.include_router(directories.router, prefix="/directories", tags=["directories"])
