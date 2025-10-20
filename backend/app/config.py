"""Configuration module for KBase backend."""

import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings

# Load environment variables from .env file
load_dotenv()


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    vault_path: Path = Field(..., description="Path to the note vault directory")
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    app_name: str = Field(default="KBase", description="Application name")
    app_version: str = Field(default="0.1.0", description="Application version")
    
    @field_validator('vault_path', mode='before')
    @classmethod
    def validate_vault_path(cls, v):
        """Validate that vault path exists and is a directory."""
        if isinstance(v, str):
            v = Path(v)
        
        if not v.exists():
            raise ValueError(f"Vault path does not exist: {v}")
        
        if not v.is_dir():
            raise ValueError(f"Vault path is not a directory: {v}")
        
        return v.absolute()
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False
    }


# Global settings instance
settings = Settings()
