import os
import shutil
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from app.config import settings

def test_search_ignores_git_folder(auth_client: TestClient, auth_token: str, temp_vault: Path):
    """Test that search ignores files inside .git directory."""
    
    # Create a .git directory and a file inside it
    git_dir = temp_vault / ".git"
    git_dir.mkdir(exist_ok=True)
    
    git_file = git_dir / "secret_config"
    git_file.write_text("this_is_a_secret_git_string", encoding="utf-8")
    
    try:
        # Search for the unique string
        response = auth_client.get(
            "/api/v1/notes/search/",
            params={"q": "secret_git_string"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Should find NO results
        assert data["total"] == 0
        assert len(data["results"]) == 0
        
        # Create a normal file with the same content to ensure search works
        normal_file = temp_vault / "normal_file.md"
        normal_file.write_text("this_is_a_secret_git_string", encoding="utf-8")
        
        try:
            response = auth_client.get(
                "/api/v1/notes/search/",
                params={"q": "secret_git_string"},
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            assert response.status_code == 200
            data = response.json()
            
            # Should find 1 result (the normal file)
            assert data["total"] == 1
            assert data["results"][0]["name"] == "normal_file.md"
            
        finally:
            if normal_file.exists():
                normal_file.unlink()
                
    finally:
        # Cleanup
        if git_file.exists():
            git_file.unlink()
        if git_dir.exists():
            # Only remove if empty or carefully
            try:
                git_dir.rmdir()
            except OSError:
                pass
