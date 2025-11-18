"""Tests for image upload API endpoints and ImageService."""

import io
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from PIL import Image

from app.services.image_service import ImageService


class TestImageService:
    """Test the ImageService functionality."""

    def test_upload_image_valid_png(self, temp_vault):
        """Test uploading a valid PNG image."""
        service = ImageService()
        service.vault_path = temp_vault

        # Create a test PNG image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)

        # Create UploadFile-like object
        class MockUploadFile:
            def __init__(self, filename, file, content_type):
                self.filename = filename
                self.file = file
                self.content_type = content_type
                self.size = len(file.getvalue()) if hasattr(file, 'getvalue') else 0

        upload_file = MockUploadFile('test.png', img_bytes, 'image/png')

        # Upload the image
        result_path = service.upload_image(upload_file)

        # Check that the path is returned correctly
        assert result_path == '/_resources/test.png'

        # Check that the file was actually created
        resources_dir = temp_vault / '_resources'
        assert resources_dir.exists()
        assert (resources_dir / 'test.png').exists()

        # Verify the file content
        with open(resources_dir / 'test.png', 'rb') as f:
            saved_content = f.read()
        assert len(saved_content) > 0

    def test_upload_image_valid_jpeg(self, temp_vault):
        """Test uploading a valid JPEG image."""
        service = ImageService()
        service.vault_path = temp_vault

        # Create a test JPEG image
        img = Image.new('RGB', (100, 100), color='blue')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)

        class MockUploadFile:
            def __init__(self, filename, file, content_type):
                self.filename = filename
                self.file = file
                self.content_type = content_type
                self.size = len(file.getvalue()) if hasattr(file, 'getvalue') else 0

        upload_file = MockUploadFile('test.jpg', img_bytes, 'image/jpeg')

        result_path = service.upload_image(upload_file)
        assert result_path == '/_resources/test.jpg'

        resources_dir = temp_vault / '_resources'
        assert (resources_dir / 'test.jpg').exists()

    def test_upload_image_invalid_type(self, temp_vault):
        """Test uploading an invalid file type."""
        service = ImageService()
        service.vault_path = temp_vault

        class MockUploadFile:
            def __init__(self, filename, file, content_type):
                self.filename = filename
                self.file = file
                self.content_type = content_type

        # Create a text file upload
        text_bytes = io.BytesIO(b'this is not an image')
        upload_file = MockUploadFile('test.txt', text_bytes, 'text/plain')

        with pytest.raises(ValueError, match="Unsupported file type"):
            service.upload_image(upload_file)

    def test_upload_image_too_large(self, temp_vault):
        """Test uploading an image that's too large."""
        service = ImageService()
        service.vault_path = temp_vault

        # Create a large image (simulate)
        large_data = b'x' * (service.MAX_FILE_SIZE + 1)

        class MockUploadFile:
            def __init__(self, filename, file, content_type, size):
                self.filename = filename
                self.file = file
                self.content_type = content_type
                self.size = size

        upload_file = MockUploadFile('large.png', io.BytesIO(large_data), 'image/png', len(large_data))

        with pytest.raises(ValueError, match="File too large"):
            service.upload_image(upload_file)

    def test_upload_image_creates_resources_directory(self, temp_vault):
        """Test that _resources directory is created if it doesn't exist."""
        service = ImageService()
        service.vault_path = temp_vault

        # Ensure _resources doesn't exist initially
        resources_dir = temp_vault / '_resources'
        assert not resources_dir.exists()

        # Create a test image
        img = Image.new('RGB', (50, 50), color='green')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)

        class MockUploadFile:
            def __init__(self, filename, file, content_type):
                self.filename = filename
                self.file = file
                self.content_type = content_type
                self.size = len(file.getvalue()) if hasattr(file, 'getvalue') else 0

        upload_file = MockUploadFile('test.png', img_bytes, 'image/png')

        service.upload_image(upload_file)

        # Check that directory was created
        assert resources_dir.exists()
        assert resources_dir.is_dir()


class TestImageAPI:
    """Test the image upload API endpoints."""

    def test_upload_image_success(self, auth_client: TestClient, auth_token: str, temp_vault):
        """Test successful image upload via API."""
        # Create a test image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)

        # Upload via API
        response = auth_client.post(
            "/api/v1/images/upload",
            files={"file": ("test.png", img_bytes.getvalue(), "image/png")},
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "path" in data
        assert data["path"] == "/_resources/test.png"
        assert "message" in data

        # Verify file was created
        resources_dir = temp_vault / '_resources'
        assert (resources_dir / 'test.png').exists()

    def test_upload_image_invalid_file_type(self, auth_client: TestClient, auth_token: str):
        """Test uploading invalid file type via API."""
        response = auth_client.post(
            "/api/v1/images/upload",
            files={"file": ("test.txt", b"not an image", "text/plain")},
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert response.status_code == 400
        assert "Unsupported file type" in response.json()["detail"]

    def test_upload_image_too_large(self, auth_client: TestClient, auth_token: str):
        """Test uploading file that's too large via API."""
        # Create a file larger than MAX_FILE_SIZE
        large_content = b'x' * (10 * 1024 * 1024 + 1)  # 10MB + 1 byte

        response = auth_client.post(
            "/api/v1/images/upload",
            files={"file": ("large.png", large_content, "image/png")},
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert response.status_code == 400
        assert "File too large" in response.json()["detail"]

    def test_upload_image_no_auth(self, client: TestClient):
        """Test that image upload requires authentication."""
        img = Image.new('RGB', (50, 50), color='blue')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)

        response = client.post(
            "/api/v1/images/upload",
            files={"file": ("test.png", img_bytes.getvalue(), "image/png")}
        )

        assert response.status_code == 401

    def test_upload_image_creates_unique_filename(self, auth_client: TestClient, auth_token: str, temp_vault):
        """Test that uploading multiple files with same name creates unique filenames."""
        # Create two identical images
        img = Image.new('RGB', (50, 50), color='yellow')
        img_bytes1 = io.BytesIO()
        img_bytes2 = io.BytesIO()
        img.save(img_bytes1, format='PNG')
        img.save(img_bytes2, format='PNG')
        img_bytes1.seek(0)
        img_bytes2.seek(0)

        # Upload first image
        response1 = auth_client.post(
            "/api/v1/images/upload",
            files={"file": ("test.png", img_bytes1.getvalue(), "image/png")},
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        # Upload second image with same name
        response2 = auth_client.post(
            "/api/v1/images/upload",
            files={"file": ("test.png", img_bytes2.getvalue(), "image/png")},
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert response1.status_code == 200
        assert response2.status_code == 200

        path1 = response1.json()["path"]
        path2 = response2.json()["path"]

        # Paths should be different (UUID-based filenames)
        assert path1 != path2
        assert path1.endswith('.png')
        assert path2.endswith('.png')

        # Both files should exist
        resources_dir = temp_vault / '_resources'
        filename1 = Path(path1).name
        filename2 = Path(path2).name
        assert (resources_dir / filename1).exists()
        assert (resources_dir / filename2).exists()
