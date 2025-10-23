"""Tests for search API endpoint with snippets."""

import pytest
from fastapi.testclient import TestClient


def test_search_notes_basic(auth_client: TestClient, auth_token: str):
    """Test basic search functionality."""
    response = auth_client.get(
        "/api/v1/notes/search/",
        params={"q": "test"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    data = response.json()
    assert "results" in data
    assert "total" in data
    assert isinstance(data["results"], list)
    assert isinstance(data["total"], int)


def test_search_notes_with_snippets(auth_client: TestClient, auth_token: str):
    """Test search returns snippets with line numbers."""
    response = auth_client.get(
        "/api/v1/notes/search/",
        params={"q": "test"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    data = response.json()
    if data["total"] > 0:
        # Check first result has the correct structure
        result = data["results"][0]
        assert "path" in result
        assert "name" in result
        assert "snippets" in result
        assert isinstance(result["snippets"], list)
        
        # If there are snippets, verify their structure
        if len(result["snippets"]) > 0:
            snippet = result["snippets"][0]
            assert "line_number" in snippet
            assert "content" in snippet
            assert isinstance(snippet["line_number"], int)
            assert isinstance(snippet["content"], str)
            assert snippet["line_number"] > 0


def test_search_notes_limit_snippets(auth_client: TestClient, auth_token: str):
    """Test that search limits to 3 snippets per file."""
    response = auth_client.get(
        "/api/v1/notes/search/",
        params={"q": "note"},  # Common word that might appear multiple times
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    data = response.json()
    # Check that no file has more than 3 snippets
    for result in data["results"]:
        assert len(result["snippets"]) <= 3


def test_search_notes_empty_query(auth_client: TestClient, auth_token: str):
    """Test search with empty query returns no results."""
    response = auth_client.get(
        "/api/v1/notes/search/",
        params={"q": ""},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    data = response.json()
    assert data["results"] == []
    assert data["total"] == 0


def test_search_notes_no_results(auth_client: TestClient, auth_token: str):
    """Test search with query that matches nothing."""
    response = auth_client.get(
        "/api/v1/notes/search/",
        params={"q": "xyzabc123nonexistent"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    data = response.json()
    assert data["results"] == []
    assert data["total"] == 0


def test_search_notes_multi_phrase(auth_client: TestClient, auth_token: str):
    """Test search with multiple phrases."""
    response = auth_client.get(
        "/api/v1/notes/search/",
        params={"q": "test note"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    data = response.json()
    assert "results" in data
    assert "total" in data


def test_search_notes_case_insensitive(auth_client: TestClient, auth_token: str):
    """Test search is case-insensitive."""
    response1 = auth_client.get(
        "/api/v1/notes/search/",
        params={"q": "TEST"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    response2 = auth_client.get(
        "/api/v1/notes/search/",
        params={"q": "test"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    assert response1.status_code == 200
    assert response2.status_code == 200
    
    data1 = response1.json()
    data2 = response2.json()
    
    # Should return same results regardless of case
    assert data1["total"] == data2["total"]


def test_search_notes_limit_parameter(auth_client: TestClient, auth_token: str):
    """Test search respects the limit parameter."""
    response = auth_client.get(
        "/api/v1/notes/search/",
        params={"q": "note", "limit": 1},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    data = response.json()
    assert len(data["results"]) <= 1


def test_search_without_auth_fails(client: TestClient):
    """Test that search requires authentication."""
    response = client.get(
        "/api/v1/notes/search/",
        params={"q": "test"}
    )
    # Should return 401 or 403 (authentication/authorization error)
    assert response.status_code in [401, 403]

