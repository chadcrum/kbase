"""Configuration API endpoints."""

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import settings

router = APIRouter()


class ConfigResponse(BaseModel):
    """Response model for public configuration."""
    auth_enabled: bool


@router.get("/", response_model=ConfigResponse)
async def get_config():
    """
    Get public configuration settings.
    
    Returns:
        ConfigResponse: Public configuration including auth status
    """
    return ConfigResponse(
        auth_enabled=not settings.disable_auth
    )

