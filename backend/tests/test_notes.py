"""Tests for notes API endpoints."""

import pytest
from fastapi.testclient import TestClient


def test_list_notes(client: TestClient):
    """Test listing all notes."""
    response = client.get("/api/v1/notes/")
    assert response.status_code == 200
    
    data = response.json()
    assert data["name"] == "vault"
    assert data["type"] == "directory"
    assert "children" in data
    
    # Check that we have the expected files
    children_names = [child["name"] for child in data["children"]]
    assert "note1.md" in children_names
    assert "note2.md" in children_names
    
    # Check subdirectory
    subdir = next((child for child in data["children"] if child["name"] == "subdir"), None)
    assert subdir is not None
    assert subdir["type"] == "directory"
    assert len(subdir["children"]) == 1
    assert subdir["children"][0]["name"] == "note3.md"


def test_get_note(client: TestClient):
    """Test getting a note by path."""
    response = client.get("/api/v1/notes/note1.md")
    assert response.status_code == 200
    
    data = response.json()
    assert data["content"] == "# Test Note 1\n\nThis is a test note."
    assert data["path"] == "/note1.md"
    assert "size" in data
    assert "modified" in data


def test_get_note_nested(client: TestClient):
    """Test getting a nested note."""
    response = client.get("/api/v1/notes/subdir/note3.md")
    assert response.status_code == 200
    
    data = response.json()
    assert data["content"] == "# Test Note 3\n\nNested test note."
    assert data["path"] == "/subdir/note3.md"


def test_get_note_not_found(client: TestClient):
    """Test getting a non-existent note."""
    response = client.get("/api/v1/notes/nonexistent.md")
    assert response.status_code == 404
    assert "Note not found" in response.json()["detail"]


def test_create_note(client: TestClient):
    """Test creating a new note."""
    note_data = {"content": "# New Note\n\nThis is a new note."}
    response = client.post("/api/v1/notes/new_note.md", json=note_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Note created successfully"
    assert data["path"] == "/new_note.md"
    
    # Verify the note was actually created
    get_response = client.get("/api/v1/notes/new_note.md")
    assert get_response.status_code == 200
    assert get_response.json()["content"] == note_data["content"]


def test_create_note_nested(client: TestClient):
    """Test creating a note in a nested directory."""
    note_data = {"content": "# Nested New Note\n\nThis is a nested note."}
    response = client.post("/api/v1/notes/nested/new_note.md", json=note_data)
    assert response.status_code == 200
    
    # Verify the note was created
    get_response = client.get("/api/v1/notes/nested/new_note.md")
    assert get_response.status_code == 200
    assert get_response.json()["content"] == note_data["content"]


def test_create_note_already_exists(client: TestClient):
    """Test creating a note that already exists."""
    note_data = {"content": "# Duplicate Note\n\nThis should fail."}
    response = client.post("/api/v1/notes/note1.md", json=note_data)
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_update_note(client: TestClient):
    """Test updating an existing note."""
    note_data = {"content": "# Updated Note 1\n\nThis note has been updated."}
    response = client.put("/api/v1/notes/note1.md", json=note_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Note updated successfully"
    assert data["path"] == "/note1.md"
    
    # Verify the note was actually updated
    get_response = client.get("/api/v1/notes/note1.md")
    assert get_response.status_code == 200
    assert get_response.json()["content"] == note_data["content"]


def test_update_note_not_found(client: TestClient):
    """Test updating a non-existent note."""
    note_data = {"content": "# This should fail\n\nThis note doesn't exist."}
    response = client.put("/api/v1/notes/nonexistent.md", json=note_data)
    assert response.status_code == 404
    assert "Note not found" in response.json()["detail"]


def test_delete_note(client: TestClient):
    """Test deleting a note."""
    response = client.delete("/api/v1/notes/note2.md")
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Note deleted successfully"
    assert data["path"] == "/note2.md"
    
    # Verify the note was actually deleted
    get_response = client.get("/api/v1/notes/note2.md")
    assert get_response.status_code == 404


def test_delete_note_not_found(client: TestClient):
    """Test deleting a non-existent note."""
    response = client.delete("/api/v1/notes/nonexistent.md")
    assert response.status_code == 404
    assert "Note not found" in response.json()["detail"]


def test_path_traversal_protection(client: TestClient):
    """Test that path traversal attacks are blocked."""
    # Test various path traversal attempts
    # Note: FastAPI blocks these at the routing level, so we expect 404
    malicious_paths = [
        "../../../etc/passwd",
        "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
        "/etc/passwd",
        "note1.md/../../../etc/passwd",
        "subdir/../../note1.md",
    ]
    
    for malicious_path in malicious_paths:
        response = client.get(f"/api/v1/notes/{malicious_path}")
        assert response.status_code == 404
        # FastAPI blocks these paths before they reach our validation


def test_invalid_file_types(client: TestClient):
    """Test that non-markdown files are converted to .md files."""
    # Test that creating a file with .txt extension converts it to .md
    note_data = {"content": "This should become a .md file"}
    response = client.post("/api/v1/notes/test.txt", json=note_data)
    assert response.status_code == 200  # Should succeed but convert to .md
    
    # Verify it was created as .md (not .txt)
    get_response = client.get("/api/v1/notes/test.md")
    assert get_response.status_code == 200
    assert get_response.json()["content"] == note_data["content"]
    
    # Verify the .txt path doesn't work
    get_response_txt = client.get("/api/v1/notes/test.txt")
    assert get_response_txt.status_code == 404


def test_root_endpoint(client: TestClient):
    """Test the root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    
    data = response.json()
    assert "message" in data
    assert "version" in data
    assert "vault_path" in data
    assert "docs" in data


def test_health_check(client: TestClient):
    """Test the health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "healthy"
    assert "vault_path" in data
