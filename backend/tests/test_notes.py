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


def test_update_note_with_leading_slash(auth_client: TestClient, auth_token: str):
    """Test that paths with leading slashes are normalized correctly.
    
    This test validates the fix for the double-slash bug where paths like
    "/welcome.md" were being returned as "//welcome.md" in responses.
    """
    # Update note using path with leading slash (URL-encoded as %2F)
    new_content = "# Updated with leading slash\n\nThis tests path normalization."
    note_data = {"content": new_content}
    
    response = auth_client.put(
        "/api/v1/notes/%2Fnote1.md",  # URL-encoded /note1.md
        json=note_data,
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "Note updated successfully"
    # Critical: path should have single leading slash, not double
    assert data["path"] == "/note1.md"
    assert data["path"] != "//note1.md", "Path should not have double slashes"
    
    # Verify by reading the note back
    get_response = auth_client.get(
        "/api/v1/notes/%2Fnote1.md",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert get_response.status_code == 200
    get_data = get_response.json()
    assert get_data["path"] == "/note1.md"
    assert get_data["path"] != "//note1.md", "Retrieved path should not have double slashes"
    assert get_data["content"] == new_content


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


def test_list_notes_includes_empty_directories(auth_client: TestClient, auth_token: str, temp_vault):
    """Test that list_notes includes empty directories in the file tree.
    
    This is a regression test to ensure empty directories are not filtered out.
    Previously, only directories with files were included in the tree.
    """
    # Create an empty directory
    empty_dir = temp_vault / "empty_folder"
    empty_dir.mkdir()
    
    # Create another directory with a subdirectory but no files
    nested_empty = temp_vault / "parent_folder"
    nested_empty.mkdir()
    (nested_empty / "child_folder").mkdir()
    
    # Get the file tree
    response = auth_client.get(
        "/api/v1/notes/",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    data = response.json()
    children_names = [child["name"] for child in data["children"]]
    
    # Verify empty directories are included
    assert "empty_folder" in children_names, "Empty directory should be included in file tree"
    assert "parent_folder" in children_names, "Parent directory should be included even if it only has subdirectories"
    
    # Check the empty folder structure
    empty_folder = next((child for child in data["children"] if child["name"] == "empty_folder"), None)
    assert empty_folder is not None
    assert empty_folder["type"] == "directory"
    assert empty_folder["children"] == [], "Empty directory should have empty children list"
    
    # Check the parent folder structure
    parent_folder = next((child for child in data["children"] if child["name"] == "parent_folder"), None)
    assert parent_folder is not None
    assert parent_folder["type"] == "directory"
    assert len(parent_folder["children"]) == 1, "Parent folder should have one child directory"
    assert parent_folder["children"][0]["name"] == "child_folder"
    assert parent_folder["children"][0]["type"] == "directory"


def test_file_tree_includes_timestamps(auth_client: TestClient, auth_token: str):
    """Test that file tree includes created and modified timestamps."""
    response = auth_client.get(
        "/api/v1/notes/",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    data = response.json()
    
    # Check root directory has timestamps
    assert "created" in data
    assert "modified" in data
    assert isinstance(data["created"], int) or data["created"] is None
    assert isinstance(data["modified"], int) or data["modified"] is None
    
    # Check that files have timestamps
    files = [child for child in data["children"] if child["type"] == "file"]
    assert len(files) > 0, "Should have at least one file in test data"
    
    for file_node in files:
        assert "created" in file_node, f"File {file_node['name']} should have 'created' field"
        assert "modified" in file_node, f"File {file_node['name']} should have 'modified' field"
        assert isinstance(file_node["created"], int), f"File {file_node['name']} created timestamp should be an integer"
        assert isinstance(file_node["modified"], int), f"File {file_node['name']} modified timestamp should be an integer"
        assert file_node["created"] > 0, f"File {file_node['name']} created timestamp should be positive"
        assert file_node["modified"] > 0, f"File {file_node['name']} modified timestamp should be positive"
    
    # Check that directories have timestamps
    directories = [child for child in data["children"] if child["type"] == "directory"]
    assert len(directories) > 0, "Should have at least one directory in test data"
    
    for dir_node in directories:
        assert "created" in dir_node, f"Directory {dir_node['name']} should have 'created' field"
        assert "modified" in dir_node, f"Directory {dir_node['name']} should have 'modified' field"
        # Timestamps can be None or integers
        if dir_node["created"] is not None:
            assert isinstance(dir_node["created"], int), f"Directory {dir_node['name']} created timestamp should be an integer"
            assert dir_node["created"] > 0, f"Directory {dir_node['name']} created timestamp should be positive"
        if dir_node["modified"] is not None:
            assert isinstance(dir_node["modified"], int), f"Directory {dir_node['name']} modified timestamp should be an integer"
            assert dir_node["modified"] > 0, f"Directory {dir_node['name']} modified timestamp should be positive"


def test_nested_file_tree_timestamps(auth_client: TestClient, auth_token: str):
    """Test that nested files and directories also have timestamps."""
    response = auth_client.get(
        "/api/v1/notes/",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    data = response.json()
    
    # Find the subdir directory
    subdir = next((child for child in data["children"] if child["name"] == "subdir"), None)
    assert subdir is not None, "Should have subdir in test data"
    
    # Check that the subdirectory has timestamps
    assert "created" in subdir
    assert "modified" in subdir
    
    # Check that files in the subdirectory have timestamps
    assert len(subdir["children"]) > 0, "Subdir should have children"
    for child in subdir["children"]:
        assert "created" in child
        assert "modified" in child
        if child["type"] == "file":
            assert isinstance(child["created"], int)
            assert isinstance(child["modified"], int)
            assert child["created"] > 0
            assert child["modified"] > 0
