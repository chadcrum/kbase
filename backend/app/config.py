"""Configuration module for KBase backend."""

import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings

# Load environment variables from .env file
load_dotenv()


def _is_development_mode() -> bool:
    """
    Detect if running in development mode.
    
    Checks for common development environment indicators:
    - ENV=development or ENV=dev
    - ENVIRONMENT=development or ENVIRONMENT=dev
    - DEBUG=true or DEBUG=1
    - Running with uvicorn --reload (detected via environment)
    """
    env = os.environ.get("ENV", "").lower()
    environment = os.environ.get("ENVIRONMENT", "").lower()
    debug = os.environ.get("DEBUG", "").lower()
    
    return (
        env in ("development", "dev") or
        environment in ("development", "dev") or
        debug in ("true", "1", "yes")
    )


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    vault_path: Path = Field(..., description="Path to the note vault directory")
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    app_name: str = Field(default="KBase", description="Application name")
    app_version: str = Field(default="0.1.0", description="Application version")
    
    # Authentication settings
    # Default to disabled in development mode, enabled in production
    # Can be explicitly set via DISABLE_AUTH environment variable
    disable_auth: Optional[bool] = Field(default=None, description="Disable authentication (defaults to True in dev mode, False in production)")
    secret_key: str = Field(default="", description="Secret key for JWT token signing (required if auth is enabled)")
    password: str = Field(default="", description="Plain text password for authentication (required if auth is enabled)")
    access_token_expire_minutes: int = Field(default=10080, description="Access token expiration time in minutes (default: 7 days)")
    algorithm: str = Field(default="HS256", description="JWT signing algorithm")
    
    @field_validator('vault_path', mode='before')
    @classmethod
    def validate_vault_path(cls, v):
        """Validate that vault path exists and is a directory."""
        if isinstance(v, str):
            v = Path(v).expanduser()
        
        if not v.exists():
            raise ValueError(f"Vault path does not exist: {v}")
        
        if not v.is_dir():
            raise ValueError(f"Vault path is not a directory: {v}")
        
        return v.absolute()
    
    @model_validator(mode='after')
    def validate_auth_settings(self):
        """Validate auth settings and set default based on dev mode if not explicitly set."""
        # If disable_auth is not explicitly set, default to dev mode detection
        if self.disable_auth is None:
            self.disable_auth = _is_development_mode()
        
        # Validate auth settings only if auth is enabled
        if not self.disable_auth:
            if not self.secret_key:
                raise ValueError("SECRET_KEY is required when authentication is enabled")
            if not self.password:
                raise ValueError("PASSWORD is required when authentication is enabled")
        return self
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False
    }


# Global settings instance
settings = Settings()
