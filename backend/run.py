#!/usr/bin/env python3
"""Simple script to run the KBase backend with uv."""

import os
import sys
from pathlib import Path

def main():
    """Run the backend server."""
    # Check if VAULT_PATH is set
    vault_path = os.environ.get("VAULT_PATH")
    if not vault_path:
        print("Error: VAULT_PATH environment variable is required")
        print("Example: VAULT_PATH=~/kbase-vault python run.py")
        sys.exit(1)
    
    # Check if vault path exists
    vault_path = Path(vault_path).expanduser()
    if not vault_path.exists():
        print(f"Error: Vault path does not exist: {vault_path}")
        print("Please create the directory first: mkdir -p ~/kbase-vault")
        sys.exit(1)
    
    # Import and run the app
    try:
        import uvicorn
        from app.main import app, settings
        
        print(f"Starting KBase backend...")
        print(f"Vault path: {settings.vault_path}")
        print(f"Server: http://{settings.host}:{settings.port}")
        print(f"API docs: http://{settings.host}:{settings.port}/docs")
        print("Press Ctrl+C to stop")
        
        uvicorn.run(
            "app.main:app",
            host=settings.host,
            port=settings.port,
            reload=True
        )
    except ImportError as e:
        print(f"Error: Missing dependencies. Please run: uv sync")
        print(f"Details: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
