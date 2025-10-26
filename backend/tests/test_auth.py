"""Authentication API tests."""

from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from jose import jwt


class TestAuthentication:
    """Test authentication endpoints and functionality."""

    def test_login_success(self, auth_client: TestClient):
        """Test successful login with correct password."""
        response = auth_client.post(
            "/api/v1/auth/login",
            json={"password": "test-password"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 0

    def test_login_invalid_password(self, auth_client: TestClient):
        """Test login with incorrect password."""
        response = auth_client.post(
            "/api/v1/auth/login",
            json={"password": "wrong-password"}
        )
        
        assert response.status_code == 401
        assert "Incorrect password" in response.json()["detail"]

    def test_login_missing_password(self, auth_client: TestClient):
        """Test login without password field."""
        response = auth_client.post(
            "/api/v1/auth/login",
            json={}
        )
        
        assert response.status_code == 422  # Validation error

    def test_verify_token_valid(self, auth_client: TestClient, auth_token: str):
        """Test token verification with valid token."""
        response = auth_client.get(
            "/api/v1/auth/verify",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True

    def test_verify_token_invalid(self, auth_client: TestClient):
        """Test token verification with invalid token."""
        response = auth_client.get(
            "/api/v1/auth/verify",
            headers={"Authorization": "Bearer invalid-token"}
        )
        
        assert response.status_code == 401
        assert "Invalid authentication credentials" in response.json()["detail"]

    def test_verify_token_missing(self, auth_client: TestClient):
        """Test token verification without token."""
        response = auth_client.get("/api/v1/auth/verify")
        
        assert response.status_code == 403  # No credentials provided

    def test_verify_token_malformed_header(self, auth_client: TestClient):
        """Test token verification with malformed Authorization header."""
        response = auth_client.get(
            "/api/v1/auth/verify",
            headers={"Authorization": "InvalidFormat token"}
        )
        
        assert response.status_code == 403

    def test_protected_endpoint_without_token(self, auth_client: TestClient):
        """Test accessing protected endpoint without token."""
        response = auth_client.get("/api/v1/notes/")
        
        assert response.status_code == 403

    def test_protected_endpoint_with_invalid_token(self, auth_client: TestClient):
        """Test accessing protected endpoint with invalid token."""
        response = auth_client.get(
            "/api/v1/notes/",
            headers={"Authorization": "Bearer invalid-token"}
        )
        
        assert response.status_code == 401

    def test_protected_endpoint_with_valid_token(self, auth_client: TestClient, auth_token: str):
        """Test accessing protected endpoint with valid token."""
        response = auth_client.get(
            "/api/v1/notes/",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200

    def test_public_endpoints_accessible_without_auth(self, auth_client: TestClient):
        """Test that public endpoints are accessible without authentication."""
        # Test root endpoint
        response = auth_client.get("/")
        assert response.status_code == 200
        
        # Test health endpoint
        response = auth_client.get("/health")
        assert response.status_code == 200
        
        # Test docs endpoint
        response = auth_client.get("/docs")
        assert response.status_code == 200

    def test_token_expiration(self, auth_client: TestClient):
        """Test that tokens work correctly (this would need more complex setup for actual expiration testing)."""
        # This is a basic test - in a real scenario you'd test with a very short expiration time
        response = auth_client.post(
            "/api/v1/auth/login",
            json={"password": "test-password"}
        )
        
        assert response.status_code == 200
        token = response.json()["access_token"]
        
        # Verify the token works immediately
        verify_response = auth_client.get(
            "/api/v1/auth/verify",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert verify_response.status_code == 200

    def test_login_without_remember_me(self, auth_client: TestClient):
        """Test login without remember_me field uses default expiration (7 days)."""
        response = auth_client.post(
            "/api/v1/auth/login",
            json={"password": "test-password"}
        )
        
        assert response.status_code == 200
        token = response.json()["access_token"]
        
        # Decode token to check expiration (using test secret key)
        payload = jwt.decode(token, "test-secret-key-for-jwt-signing", algorithms=["HS256"])
        exp = payload["exp"]
        now = datetime.now(timezone.utc).timestamp()
        
        # Token should expire in approximately 7 days (allow 1 minute tolerance)
        days_7_seconds = 7 * 24 * 60 * 60
        time_diff = exp - now
        assert days_7_seconds - 60 < time_diff < days_7_seconds + 60

    def test_login_with_remember_me_false(self, auth_client: TestClient):
        """Test login with remember_me=false uses default expiration (7 days)."""
        response = auth_client.post(
            "/api/v1/auth/login",
            json={"password": "test-password", "remember_me": False}
        )
        
        assert response.status_code == 200
        token = response.json()["access_token"]
        
        # Decode token to check expiration (using test secret key)
        payload = jwt.decode(token, "test-secret-key-for-jwt-signing", algorithms=["HS256"])
        exp = payload["exp"]
        now = datetime.now(timezone.utc).timestamp()
        
        # Token should expire in approximately 7 days (allow 1 minute tolerance)
        days_7_seconds = 7 * 24 * 60 * 60
        time_diff = exp - now
        assert days_7_seconds - 60 < time_diff < days_7_seconds + 60

    def test_login_with_remember_me_true(self, auth_client: TestClient):
        """Test login with remember_me=true uses extended expiration (30 days)."""
        response = auth_client.post(
            "/api/v1/auth/login",
            json={"password": "test-password", "remember_me": True}
        )
        
        assert response.status_code == 200
        token = response.json()["access_token"]
        
        # Decode token to check expiration (using test secret key)
        payload = jwt.decode(token, "test-secret-key-for-jwt-signing", algorithms=["HS256"])
        exp = payload["exp"]
        now = datetime.now(timezone.utc).timestamp()
        
        # Token should expire in approximately 30 days (allow 1 minute tolerance)
        days_30_seconds = 30 * 24 * 60 * 60
        time_diff = exp - now
        assert days_30_seconds - 60 < time_diff < days_30_seconds + 60


class TestAuthIntegration:
    """Integration tests for authentication with other endpoints."""

    def test_notes_endpoints_require_auth(self, auth_client: TestClient, auth_token: str):
        """Test that notes endpoints require authentication."""
        # Test without auth - should fail
        response = auth_client.get("/api/v1/notes/")
        assert response.status_code == 403
        
        # Test with auth - should work
        response = auth_client.get(
            "/api/v1/notes/",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200

    def test_directories_endpoints_require_auth(self, auth_client: TestClient, auth_token: str):
        """Test that directories endpoints require authentication."""
        # Test without auth - should fail
        response = auth_client.get("/api/v1/directories/")
        assert response.status_code == 403  # Auth is checked first
        
        # Test a valid directories endpoint without auth
        response = auth_client.post("/api/v1/directories/test-dir")
        assert response.status_code == 403
        
        # Test with auth - should work (or fail with proper error)
        response = auth_client.post(
            "/api/v1/directories/test-dir",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # This might return 200 or 400 depending on if the directory creation logic works
        assert response.status_code in [200, 400, 404]
