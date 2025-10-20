"""Tests for directory API endpoints with authentication."""

import pytest
from fastapi.testclient import TestClient


def test_create_directory(auth_client: TestClient, auth_token: str):
    """Test creating a new directory."""
    response = auth_client.post(
        "/api/v1/directories/test_dir",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Directory created successfully"
    assert data["path"] == "/test_dir"


def test_create_nested_directory(auth_client: TestClient, auth_token: str):
    """Test creating a nested directory."""
    response = auth_client.post(
        "/api/v1/directories/nested/test_dir",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Directory created successfully"
    assert data["path"] == "/nested/test_dir"


def test_create_directory_already_exists(auth_client: TestClient, auth_token: str):
    """Test creating a directory that already exists."""
    # First create the directory
    auth_client.post(
        "/api/v1/directories/existing_dir",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    # Try to create it again
    response = auth_client.post(
        "/api/v1/directories/existing_dir",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_get_directory(auth_client: TestClient, auth_token: str):
    """Test getting directory information."""
    # Create a directory first
    auth_client.post(
        "/api/v1/directories/test_get_dir",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    response = auth_client.get(
        "/api/v1/directories/test_get_dir",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    data = response.json()
    assert data["name"] == "test_get_dir"
    assert data["path"] == "/test_get_dir"
    assert data["type"] == "directory"
    assert "size" in data
    assert "modified" in data
    assert "item_count" in data
    assert "contents" in data


def test_rename_directory(auth_client: TestClient, auth_token: str):
    """Test renaming a directory."""
    # Create a directory first
    auth_client.post(
        "/api/v1/directories/old_name",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    # Rename it
    rename_data = {"new_name": "new_name"}
    response = auth_client.put(
        "/api/v1/directories/old_name",
        json=rename_data,
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Directory renamed successfully"
    assert data["path"] == "/new_name"


def test_delete_directory(auth_client: TestClient, auth_token: str):
    """Test deleting an empty directory."""
    # Create a directory first
    auth_client.post(
        "/api/v1/directories/to_delete",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    # Delete it
    response = auth_client.delete(
        "/api/v1/directories/to_delete",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Directory deleted successfully"
    assert data["path"] == "/to_delete"


def test_move_directory(auth_client: TestClient, auth_token: str):
    """Test moving a directory."""
    # Create a directory first
    auth_client.post(
        "/api/v1/directories/move_source",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    # Move it
    move_data = {"destination": "/moved_dir"}
    response = auth_client.post(
        "/api/v1/directories/move_source/move",
        json=move_data,
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Directory moved successfully"
    assert data["path"] == "/moved_dir"


def test_copy_directory(auth_client: TestClient, auth_token: str):
    """Test copying a directory."""
    # Create a directory first
    auth_client.post(
        "/api/v1/directories/copy_source",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    # Copy it
    copy_data = {"destination": "/copied_dir"}
    response = auth_client.post(
        "/api/v1/directories/copy_source/copy",
        json=copy_data,
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Directory copied successfully"
    assert data["path"] == "/copied_dir"


def test_directories_without_auth_fail(auth_client: TestClient):
    """Test that directories endpoints fail without authentication."""
    # Test create directory without auth
    response = auth_client.post("/api/v1/directories/test")
    assert response.status_code == 403
    
    # Test get directory without auth
    response = auth_client.get("/api/v1/directories/test")
    assert response.status_code == 403
    
    # Test delete directory without auth
    response = auth_client.delete("/api/v1/directories/test")
    assert response.status_code == 403
