"""Tests for directory API endpoints."""

import pytest
from fastapi.testclient import TestClient


def test_create_directory(client: TestClient):
    """Test creating a new directory."""
    response = client.post("/api/v1/directories/test_dir")
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Directory created successfully"
    assert data["path"] == "/test_dir"


def test_create_nested_directory(client: TestClient):
    """Test creating a nested directory."""
    response = client.post("/api/v1/directories/nested/test_dir")
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Directory created successfully"
    assert data["path"] == "/nested/test_dir"


def test_create_directory_already_exists(client: TestClient):
    """Test creating a directory that already exists."""
    # First create the directory
    client.post("/api/v1/directories/existing_dir")
    
    # Try to create it again
    response = client.post("/api/v1/directories/existing_dir")
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_get_directory(client: TestClient):
    """Test getting directory information."""
    # Create a directory first
    client.post("/api/v1/directories/test_get_dir")
    
    response = client.get("/api/v1/directories/test_get_dir")
    assert response.status_code == 200
    
    data = response.json()
    assert data["name"] == "test_get_dir"
    assert data["path"] == "/test_get_dir"
    assert data["type"] == "directory"
    assert "size" in data
    assert "modified" in data
    assert "item_count" in data
    assert "contents" in data


def test_get_directory_with_contents(client: TestClient):
    """Test getting directory with file contents."""
    # Create a directory and add a file
    client.post("/api/v1/directories/test_contents_dir")
    client.post("/api/v1/notes/test_contents_dir/test_file.md", json={"content": "# Test"})
    
    response = client.get("/api/v1/directories/test_contents_dir")
    assert response.status_code == 200
    
    data = response.json()
    assert data["item_count"] == 1
    assert len(data["contents"]) == 1
    assert data["contents"][0]["name"] == "test_file.md"
    assert data["contents"][0]["type"] == "file"


def test_get_directory_not_found(client: TestClient):
    """Test getting a non-existent directory."""
    response = client.get("/api/v1/directories/nonexistent_dir")
    assert response.status_code == 404
    assert "Directory not found" in response.json()["detail"]


def test_get_directory_file_path(client: TestClient):
    """Test getting a file path as directory."""
    # Create a file
    client.post("/api/v1/notes/test_file.md", json={"content": "# Test"})
    
    response = client.get("/api/v1/directories/test_file.md")
    assert response.status_code == 400
    assert "not a directory" in response.json()["detail"]


def test_rename_directory(client: TestClient):
    """Test renaming a directory."""
    # Create a directory first
    client.post("/api/v1/directories/old_name")
    
    # Rename it
    rename_data = {"new_name": "new_name"}
    response = client.put("/api/v1/directories/old_name", json=rename_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Directory renamed successfully"
    assert data["path"] == "/new_name"
    
    # Verify the old name doesn't exist
    get_old = client.get("/api/v1/directories/old_name")
    assert get_old.status_code == 404
    
    # Verify the new name exists
    get_new = client.get("/api/v1/directories/new_name")
    assert get_new.status_code == 200


def test_rename_nested_directory(client: TestClient):
    """Test renaming a nested directory."""
    # Create nested directory
    client.post("/api/v1/directories/parent/child")
    
    # Rename the child
    rename_data = {"new_name": "renamed_child"}
    response = client.put("/api/v1/directories/parent/child", json=rename_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["path"] == "/parent/renamed_child"


def test_rename_directory_not_found(client: TestClient):
    """Test renaming a non-existent directory."""
    rename_data = {"new_name": "new_name"}
    response = client.put("/api/v1/directories/nonexistent", json=rename_data)
    assert response.status_code == 404
    assert "Directory not found" in response.json()["detail"]


def test_rename_directory_destination_exists(client: TestClient):
    """Test renaming to an existing destination."""
    # Create two directories
    client.post("/api/v1/directories/source_dir")
    client.post("/api/v1/directories/dest_dir")
    
    # Try to rename source to dest
    rename_data = {"new_name": "dest_dir"}
    response = client.put("/api/v1/directories/source_dir", json=rename_data)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_move_directory(client: TestClient):
    """Test moving a directory."""
    # Create a directory
    client.post("/api/v1/directories/source_dir")
    
    # Move it
    move_data = {"destination": "dest_dir"}
    response = client.post("/api/v1/directories/source_dir/move", json=move_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Directory renamed successfully"
    assert data["path"] == "/dest_dir"
    
    # Verify move worked
    get_source = client.get("/api/v1/directories/source_dir")
    assert get_source.status_code == 404
    
    get_dest = client.get("/api/v1/directories/dest_dir")
    assert get_dest.status_code == 200


def test_move_nested_directory(client: TestClient):
    """Test moving a nested directory."""
    # Create nested structure
    client.post("/api/v1/directories/parent/child")
    
    # Move child to root
    move_data = {"destination": "moved_child"}
    response = client.post("/api/v1/directories/parent/child/move", json=move_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["path"] == "/moved_child"


def test_move_directory_not_found(client: TestClient):
    """Test moving a non-existent directory."""
    move_data = {"destination": "dest_dir"}
    response = client.post("/api/v1/directories/nonexistent/move", json=move_data)
    assert response.status_code == 404
    assert "Directory not found" in response.json()["detail"]


def test_move_directory_destination_exists(client: TestClient):
    """Test moving to an existing destination."""
    # Create two directories
    client.post("/api/v1/directories/source_dir")
    client.post("/api/v1/directories/dest_dir")
    
    # Try to move source to dest
    move_data = {"destination": "dest_dir"}
    response = client.post("/api/v1/directories/source_dir/move", json=move_data)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_copy_directory(client: TestClient):
    """Test copying a directory."""
    # Create a directory with content
    client.post("/api/v1/directories/source_dir")
    client.post("/api/v1/notes/source_dir/test_file.md", json={"content": "# Test"})
    
    # Copy it
    copy_data = {"destination": "copied_dir"}
    response = client.post("/api/v1/directories/source_dir/copy", json=copy_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Directory copied successfully"
    assert data["path"] == "/copied_dir"
    
    # Verify both directories exist
    get_source = client.get("/api/v1/directories/source_dir")
    assert get_source.status_code == 200
    
    get_copied = client.get("/api/v1/directories/copied_dir")
    assert get_copied.status_code == 200
    
    # Verify content was copied
    assert get_copied.json()["item_count"] == 1


def test_copy_directory_not_found(client: TestClient):
    """Test copying a non-existent directory."""
    copy_data = {"destination": "dest_dir"}
    response = client.post("/api/v1/directories/nonexistent/copy", json=copy_data)
    assert response.status_code == 404
    assert "Directory not found" in response.json()["detail"]


def test_copy_directory_destination_exists(client: TestClient):
    """Test copying to an existing destination."""
    # Create two directories
    client.post("/api/v1/directories/source_dir")
    client.post("/api/v1/directories/dest_dir")
    
    # Try to copy source to dest
    copy_data = {"destination": "dest_dir"}
    response = client.post("/api/v1/directories/source_dir/copy", json=copy_data)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_delete_empty_directory(client: TestClient):
    """Test deleting an empty directory."""
    # Create a directory
    client.post("/api/v1/directories/empty_dir")
    
    # Delete it
    response = client.delete("/api/v1/directories/empty_dir")
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Directory deleted successfully"
    assert data["path"] == "/empty_dir"
    
    # Verify it's deleted
    get_response = client.get("/api/v1/directories/empty_dir")
    assert get_response.status_code == 404


def test_delete_non_empty_directory_without_recursive(client: TestClient):
    """Test deleting a non-empty directory without recursive flag."""
    # Create a directory with content
    client.post("/api/v1/directories/non_empty_dir")
    client.post("/api/v1/notes/non_empty_dir/test_file.md", json={"content": "# Test"})
    
    # Try to delete without recursive
    response = client.delete("/api/v1/directories/non_empty_dir")
    assert response.status_code == 400
    assert "not empty" in response.json()["detail"]


def test_delete_non_empty_directory_with_recursive(client: TestClient):
    """Test deleting a non-empty directory with recursive flag."""
    # Create a directory with content
    client.post("/api/v1/directories/non_empty_dir")
    client.post("/api/v1/notes/non_empty_dir/test_file.md", json={"content": "# Test"})
    
    # Delete with recursive
    response = client.delete("/api/v1/directories/non_empty_dir?recursive=true")
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Directory deleted successfully"
    assert data["path"] == "/non_empty_dir"
    
    # Verify it's deleted
    get_response = client.get("/api/v1/directories/non_empty_dir")
    assert get_response.status_code == 404


def test_delete_directory_not_found(client: TestClient):
    """Test deleting a non-existent directory."""
    response = client.delete("/api/v1/directories/nonexistent")
    assert response.status_code == 404
    assert "Directory not found" in response.json()["detail"]


def test_delete_directory_file_path(client: TestClient):
    """Test deleting a file path as directory."""
    # Create a file
    client.post("/api/v1/notes/test_file.md", json={"content": "# Test"})
    
    response = client.delete("/api/v1/directories/test_file.md")
    assert response.status_code == 400
    assert "not a directory" in response.json()["detail"]


def test_path_traversal_protection(client: TestClient):
    """Test that path traversal attacks are blocked."""
    # Paths that should be blocked by FastAPI routing (404)
    routing_blocked_paths = [
        "../../../etc/passwd",
        "test_dir/../../../etc/passwd",
        "subdir/../../test_dir",
    ]
    
    # Paths that should be blocked by our validation (400)
    validation_blocked_paths = [
        "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
        "/etc/passwd",
    ]
    
    for malicious_path in routing_blocked_paths:
        # Test create
        response = client.post(f"/api/v1/directories/{malicious_path}")
        assert response.status_code == 404  # Blocked by FastAPI routing
        
        # Test get
        response = client.get(f"/api/v1/directories/{malicious_path}")
        assert response.status_code == 404
        
        # Test delete
        response = client.delete(f"/api/v1/directories/{malicious_path}")
        assert response.status_code == 404
    
    for malicious_path in validation_blocked_paths:
        # Test create
        response = client.post(f"/api/v1/directories/{malicious_path}")
        assert response.status_code == 400  # Blocked by our validation
        
        # Test get
        response = client.get(f"/api/v1/directories/{malicious_path}")
        assert response.status_code == 400
        
        # Test delete
        response = client.delete(f"/api/v1/directories/{malicious_path}")
        assert response.status_code == 400


def test_circular_move_protection(client: TestClient):
    """Test that circular moves are prevented."""
    # Create a directory structure
    client.post("/api/v1/directories/parent")
    client.post("/api/v1/directories/parent/child")
    
    # Try to move parent into child (circular)
    move_data = {"destination": "parent/child/parent"}
    response = client.post("/api/v1/directories/parent/move", json=move_data)
    assert response.status_code == 400
    assert "into itself" in response.json()["detail"]


def test_circular_copy_protection(client: TestClient):
    """Test that circular copies are prevented."""
    # Create a directory structure
    client.post("/api/v1/directories/parent")
    client.post("/api/v1/directories/parent/child")
    
    # Try to copy parent into child (circular)
    copy_data = {"destination": "parent/child/parent"}
    response = client.post("/api/v1/directories/parent/copy", json=copy_data)
    assert response.status_code == 400
    assert "into itself" in response.json()["detail"]


def test_move_same_location(client: TestClient):
    """Test moving directory to same location."""
    # Create a directory
    client.post("/api/v1/directories/test_dir")
    
    # Try to move to same location
    move_data = {"destination": "test_dir"}
    response = client.post("/api/v1/directories/test_dir/move", json=move_data)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_copy_same_location(client: TestClient):
    """Test copying directory to same location."""
    # Create a directory
    client.post("/api/v1/directories/test_dir")
    
    # Try to copy to same location
    copy_data = {"destination": "test_dir"}
    response = client.post("/api/v1/directories/test_dir/copy", json=copy_data)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_directory_operations_with_special_characters(client: TestClient):
    """Test directory operations with special characters in names."""
    # Test with spaces and special chars
    special_name = "test dir with spaces & symbols!"
    
    # Create
    response = client.post(f"/api/v1/directories/{special_name}")
    assert response.status_code == 200
    
    # Get
    response = client.get(f"/api/v1/directories/{special_name}")
    assert response.status_code == 200
    assert response.json()["name"] == special_name
    
    # Delete
    response = client.delete(f"/api/v1/directories/{special_name}")
    assert response.status_code == 200
