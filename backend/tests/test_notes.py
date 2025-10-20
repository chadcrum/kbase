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


def test_move_note(client: TestClient):
    """Test moving a note to a different directory."""
    move_data = {"destination": "moved/note1.md"}
    response = client.post("/api/v1/notes/note1.md/move", json=move_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Note renamed successfully"
    assert data["path"] == "/moved/note1.md"
    
    # Verify the note was moved
    get_response = client.get("/api/v1/notes/moved/note1.md")
    assert get_response.status_code == 200
    assert get_response.json()["content"] == "# Test Note 1\n\nThis is a test note."
    
    # Verify original location no longer exists
    get_original = client.get("/api/v1/notes/note1.md")
    assert get_original.status_code == 404


def test_move_note_to_root(client: TestClient):
    """Test moving a note from subdirectory to root."""
    move_data = {"destination": "note3_root.md"}
    response = client.post("/api/v1/notes/subdir/note3.md/move", json=move_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Note renamed successfully"
    assert data["path"] == "/note3_root.md"
    
    # Verify the note was moved to root
    get_response = client.get("/api/v1/notes/note3_root.md")
    assert get_response.status_code == 200
    assert get_response.json()["content"] == "# Test Note 3\n\nNested test note."
    
    # Verify original location no longer exists
    get_original = client.get("/api/v1/notes/subdir/note3.md")
    assert get_original.status_code == 404


def test_move_note_rename(client: TestClient):
    """Test moving and renaming a note simultaneously."""
    move_data = {"destination": "newdir/renamed_note.md"}
    response = client.post("/api/v1/notes/note2.md/move", json=move_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Note renamed successfully"
    assert data["path"] == "/newdir/renamed_note.md"
    
    # Verify the note was moved and renamed
    get_response = client.get("/api/v1/notes/newdir/renamed_note.md")
    assert get_response.status_code == 200
    assert get_response.json()["content"] == "# Test Note 2\n\nAnother test note."
    
    # Verify original location no longer exists
    get_original = client.get("/api/v1/notes/note2.md")
    assert get_original.status_code == 404


def test_move_note_same_directory(client: TestClient):
    """Test renaming a note within the same directory."""
    move_data = {"destination": "renamed_note1.md"}
    response = client.post("/api/v1/notes/note1.md/move", json=move_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Note renamed successfully"
    assert data["path"] == "/renamed_note1.md"
    
    # Verify the note was renamed
    get_response = client.get("/api/v1/notes/renamed_note1.md")
    assert get_response.status_code == 200
    assert get_response.json()["content"] == "# Test Note 1\n\nThis is a test note."
    
    # Verify original name no longer exists
    get_original = client.get("/api/v1/notes/note1.md")
    assert get_original.status_code == 404


def test_move_note_not_found(client: TestClient):
    """Test moving a non-existent note."""
    move_data = {"destination": "nonexistent_dest.md"}
    response = client.post("/api/v1/notes/nonexistent.md/move", json=move_data)
    assert response.status_code == 404
    assert "Note not found" in response.json()["detail"]


def test_move_note_destination_exists(client: TestClient):
    """Test moving to a destination that already exists."""
    move_data = {"destination": "note2.md"}
    response = client.post("/api/v1/notes/note1.md/move", json=move_data)
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_copy_note(client: TestClient):
    """Test copying a note to a different directory."""
    copy_data = {"destination": "copied/note1.md"}
    response = client.post("/api/v1/notes/note1.md/copy", json=copy_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Note copied successfully"
    assert data["path"] == "/copied/note1.md"
    
    # Verify the note was copied
    get_response = client.get("/api/v1/notes/copied/note1.md")
    assert get_response.status_code == 200
    assert get_response.json()["content"] == "# Test Note 1\n\nThis is a test note."
    
    # Verify original still exists
    get_original = client.get("/api/v1/notes/note1.md")
    assert get_original.status_code == 200
    assert get_original.json()["content"] == "# Test Note 1\n\nThis is a test note."


def test_copy_note_to_root(client: TestClient):
    """Test copying a note from subdirectory to root."""
    copy_data = {"destination": "note3_copy.md"}
    response = client.post("/api/v1/notes/subdir/note3.md/copy", json=copy_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Note copied successfully"
    assert data["path"] == "/note3_copy.md"
    
    # Verify the note was copied to root
    get_response = client.get("/api/v1/notes/note3_copy.md")
    assert get_response.status_code == 200
    assert get_response.json()["content"] == "# Test Note 3\n\nNested test note."
    
    # Verify original still exists
    get_original = client.get("/api/v1/notes/subdir/note3.md")
    assert get_original.status_code == 200
    assert get_original.json()["content"] == "# Test Note 3\n\nNested test note."


def test_copy_note_destination_exists(client: TestClient):
    """Test copying to a destination that already exists."""
    copy_data = {"destination": "note2.md"}
    response = client.post("/api/v1/notes/note1.md/copy", json=copy_data)
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_copy_note_preserves_original(client: TestClient):
    """Test that copy preserves the original note."""
    copy_data = {"destination": "preserved_copy.md"}
    response = client.post("/api/v1/notes/note1.md/copy", json=copy_data)
    assert response.status_code == 200
    
    # Verify both original and copy exist
    get_original = client.get("/api/v1/notes/note1.md")
    assert get_original.status_code == 200
    
    get_copy = client.get("/api/v1/notes/preserved_copy.md")
    assert get_copy.status_code == 200
    
    # Verify they have the same content
    assert get_original.json()["content"] == get_copy.json()["content"]


def test_move_note_not_found_copy(client: TestClient):
    """Test copying a non-existent note."""
    copy_data = {"destination": "nonexistent_dest.md"}
    response = client.post("/api/v1/notes/nonexistent.md/copy", json=copy_data)
    assert response.status_code == 404
    assert "Note not found" in response.json()["detail"]
