"""Pytest configuration and fixtures."""

import os
import tempfile
from pathlib import Path
from typing import Generator

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def temp_vault() -> Generator[Path, None, None]:
    """Create a temporary vault directory for testing."""
    with tempfile.TemporaryDirectory() as temp_dir:
        vault_path = Path(temp_dir) / "test_vault"
        vault_path.mkdir()
        
        # Create some test files
        (vault_path / "note1.md").write_text("# Test Note 1\n\nThis is a test note.")
        (vault_path / "note2.md").write_text("# Test Note 2\n\nAnother test note.")
        
        # Create a subdirectory with a note
        subdir = vault_path / "subdir"
        subdir.mkdir()
        (subdir / "note3.md").write_text("# Test Note 3\n\nNested test note.")
        
        yield vault_path


@pytest.fixture
def client(temp_vault: Path) -> Generator[TestClient, None, None]:
    """Create a test client with temporary vault."""
    # Set environment variables (explicitly disable auth for tests that don't need it)
    os.environ["VAULT_PATH"] = str(temp_vault)
    os.environ["DISABLE_AUTH"] = "true"
    
    # Clear any cached modules to ensure fresh import
    import sys
    modules_to_clear = [mod for mod in sys.modules.keys() if mod.startswith('app.')]
    for mod in modules_to_clear:
        del sys.modules[mod]
    
    # Import app after setting environment variables
    from app.main import app
    
    # Create test client
    with TestClient(app) as test_client:
        yield test_client
    
    # Clean up environment
    env_vars = ["VAULT_PATH", "DISABLE_AUTH"]
    for var in env_vars:
        if var in os.environ:
            del os.environ[var]


@pytest.fixture
def auth_client(temp_vault: Path) -> Generator[TestClient, None, None]:
    """Create a test client with authentication configured."""
    # Set environment variables for authentication (explicitly enable auth)
    os.environ["VAULT_PATH"] = str(temp_vault)
    os.environ["DISABLE_AUTH"] = "false"
    os.environ["SECRET_KEY"] = "test-secret-key-for-jwt-signing"
    os.environ["PASSWORD"] = "test-password"
    
    # Clear any cached modules to ensure fresh import
    import sys
    modules_to_clear = [mod for mod in sys.modules.keys() if mod.startswith('app.')]
    for mod in modules_to_clear:
        del sys.modules[mod]
    
    # Import app after setting environment variables
    from app.main import app
    
    # Create test client
    with TestClient(app) as test_client:
        yield test_client
    
    # Clean up environment
    env_vars = ["VAULT_PATH", "DISABLE_AUTH", "SECRET_KEY", "PASSWORD"]
    for var in env_vars:
        if var in os.environ:
            del os.environ[var]


@pytest.fixture
def auth_token(auth_client: TestClient) -> str:
    """Get a valid authentication token for testing."""
    response = auth_client.post(
        "/api/v1/auth/login",
        json={"password": "test-password"}
    )
    
    assert response.status_code == 200
    return response.json()["access_token"]
