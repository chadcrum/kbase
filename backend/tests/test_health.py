"""Tests for health check endpoint."""

import pytest
from fastapi.testclient import TestClient


def test_health_check_includes_git_status(client: TestClient):
    """Test that health check endpoint includes git status."""
    response = client.get("/health")
    assert response.status_code == 200
    
    data = response.json()
    assert "status" in data
    assert "vault_path" in data
    assert "git_status" in data
    
    git_status = data["git_status"]
    assert "enabled" in git_status
    assert "last_commit" in git_status
    assert "last_error" in git_status
    assert "last_error_time" in git_status
    
    # enabled should be a boolean
    assert isinstance(git_status["enabled"], bool)
    
    # last_commit should be a number or null
    assert git_status["last_commit"] is None or isinstance(git_status["last_commit"], (int, float))
    
    # last_error should be a string or null
    assert git_status["last_error"] is None or isinstance(git_status["last_error"], str)
    
    # last_error_time should be a number or null
    assert git_status["last_error_time"] is None or isinstance(git_status["last_error_time"], (int, float))

