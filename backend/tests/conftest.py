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
    # Set the vault path environment variable
    os.environ["VAULT_PATH"] = str(temp_vault)
    
    # Clear any cached modules to ensure fresh import
    import sys
    modules_to_clear = [mod for mod in sys.modules.keys() if mod.startswith('app.')]
    for mod in modules_to_clear:
        del sys.modules[mod]
    
    # Import app after setting environment variable
    from app.main import app
    
    # Create test client
    with TestClient(app) as test_client:
        yield test_client
    
    # Clean up environment
    if "VAULT_PATH" in os.environ:
        del os.environ["VAULT_PATH"]
