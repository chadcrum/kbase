"""Tests for notes API endpoints with authentication."""

import pytest
from fastapi.testclient import TestClient


def test_list_notes(auth_client: TestClient, auth_token: str):
    """Test listing all notes."""
    response = auth_client.get(
        "/api/v1/notes/",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
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


def test_get_note(auth_client: TestClient, auth_token: str):
    """Test getting a note by path."""
    response = auth_client.get(
        "/api/v1/notes/note1.md",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    data = response.json()
    assert data["content"] == "# Test Note 1\n\nThis is a test note."
    assert data["path"] == "/note1.md"
    assert "size" in data
    assert "modified" in data


def test_get_note_nested(auth_client: TestClient, auth_token: str):
    """Test getting a nested note."""
    response = auth_client.get(
        "/api/v1/notes/subdir/note3.md",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    data = response.json()
    assert data["content"] == "# Test Note 3\n\nNested test note."
    assert data["path"] == "/subdir/note3.md"


def test_get_note_not_found(auth_client: TestClient, auth_token: str):
    """Test getting a non-existent note."""
    response = auth_client.get(
        "/api/v1/notes/nonexistent.md",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 404
    assert "Note not found" in response.json()["detail"]


def test_create_note(auth_client: TestClient, auth_token: str):
    """Test creating a new note."""
    note_data = {"content": "# New Note\n\nThis is a new note."}
    response = auth_client.post(
        "/api/v1/notes/new_note.md",
        json=note_data,
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Note created successfully"
    assert data["path"] == "/new_note.md"
    
    # Verify the note was actually created
    get_response = auth_client.get(
        "/api/v1/notes/new_note.md",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert get_response.status_code == 200
    assert get_response.json()["content"] == note_data["content"]


def test_create_note_nested(auth_client: TestClient, auth_token: str):
    """Test creating a note in a nested directory."""
    note_data = {"content": "# Nested New Note\n\nThis is a nested note."}
    response = auth_client.post(
        "/api/v1/notes/nested/new_note.md",
        json=note_data,
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    # Verify the note was created
    get_response = auth_client.get(
        "/api/v1/notes/nested/new_note.md",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert get_response.status_code == 200
    assert get_response.json()["content"] == note_data["content"]


def test_create_note_already_exists(auth_client: TestClient, auth_token: str):
    """Test creating a note that already exists."""
    note_data = {"content": "# Duplicate Note\n\nThis should fail."}
    response = auth_client.post(
        "/api/v1/notes/note1.md",
        json=note_data,
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_update_note(auth_client: TestClient, auth_token: str):
    """Test updating an existing note."""
    new_content = "# Updated Note 1\n\nThis note has been updated."
    note_data = {"content": new_content}
    
    response = auth_client.put(
        "/api/v1/notes/note1.md",
        json=note_data,
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Note updated successfully"
    assert data["path"] == "/note1.md"
    
    # Verify the note was actually updated
    get_response = auth_client.get(
        "/api/v1/notes/note1.md",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert get_response.status_code == 200
    assert get_response.json()["content"] == new_content


def test_delete_note(auth_client: TestClient, auth_token: str):
    """Test deleting a note."""
    response = auth_client.delete(
        "/api/v1/notes/note2.md",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Note deleted successfully"
    assert data["path"] == "/note2.md"
    
    # Verify the note was actually deleted
    get_response = auth_client.get(
        "/api/v1/notes/note2.md",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert get_response.status_code == 404


def test_notes_without_auth_fail(auth_client: TestClient):
    """Test that notes endpoints fail without authentication."""
    # Test list notes without auth
    response = auth_client.get("/api/v1/notes/")
    assert response.status_code == 403
    
    # Test get note without auth
    response = auth_client.get("/api/v1/notes/note1.md")
    assert response.status_code == 403
    
    # Test create note without auth
    response = auth_client.post("/api/v1/notes/test.md", json={"content": "test"})
    assert response.status_code == 403
