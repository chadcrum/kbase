"""Image service for handling image uploads and storage."""

import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import UploadFile

from app.config import settings


class ImageService:
    """Service for image operations with security validation."""

    # Supported image MIME types
    SUPPORTED_MIME_TYPES = {
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml'
    }

    # Supported file extensions
    SUPPORTED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'}

    # Maximum file size (10MB default)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

    def __init__(self):
        self.vault_path = settings.vault_path

    def _get_resources_path(self) -> Path:
        """Get the _resources directory path at vault root."""
        return self.vault_path / '_resources'

    def _ensure_resources_directory(self) -> Path:
        """Ensure the _resources directory exists and return its path."""
        resources_path = self._get_resources_path()
        resources_path.mkdir(parents=True, exist_ok=True)
        return resources_path

    def _validate_image_file(self, file: UploadFile) -> None:
        """
        Validate that the uploaded file is a supported image.

        Args:
            file: The uploaded file to validate

        Raises:
            ValueError: If the file is not a supported image or is too large
        """
        # Check file size
        if file.size and file.size > self.MAX_FILE_SIZE:
            raise ValueError(f"File too large. Maximum size is {self.MAX_FILE_SIZE // (1024*1024)}MB")

        # Check MIME type
        if file.content_type not in self.SUPPORTED_MIME_TYPES:
            raise ValueError(f"Unsupported file type: {file.content_type}. Supported types: {', '.join(self.SUPPORTED_MIME_TYPES)}")

        # Check file extension as additional validation
        filename = file.filename or ""
        file_ext = Path(filename).suffix.lower()
        if file_ext not in self.SUPPORTED_EXTENSIONS:
            raise ValueError(f"Unsupported file extension: {file_ext}. Supported extensions: {', '.join(self.SUPPORTED_EXTENSIONS)}")

    def _generate_unique_filename(self, original_filename: str) -> str:
        """
        Generate a unique filename using UUID.

        Args:
            original_filename: The original filename

        Returns:
            str: Unique filename with proper extension
        """
        file_ext = Path(original_filename).suffix.lower()
        unique_id = str(uuid.uuid4())
        return f"{unique_id}{file_ext}"

    def upload_image(self, file: UploadFile) -> str:
        """
        Upload and store an image in the _resources directory.

        Args:
            file: The uploaded image file

        Returns:
            str: The path to the uploaded image relative to vault root

        Raises:
            ValueError: If the file is invalid or upload fails
        """
        # Validate the file
        self._validate_image_file(file)

        # Generate unique filename
        unique_filename = self._generate_unique_filename(file.filename or "image.png")

        # Ensure resources directory exists
        resources_path = self._ensure_resources_directory()

        # Full path to save the file
        file_path = resources_path / unique_filename

        try:
            # Read file content
            content = file.file.read()

            # Write to disk
            with open(file_path, 'wb') as f:
                f.write(content)

            # Return path relative to vault root
            return f"/_resources/{unique_filename}"

        except Exception as e:
            raise ValueError(f"Failed to save image: {str(e)}")

    def update_image_paths_in_note(self, old_note_path: str, new_note_path: str) -> None:
        """
        Update image paths in note content when the note is moved.

        Since all images are stored in /_resources at vault root, and referenced
        with absolute paths, no path updates are needed when notes are moved.
        This method exists for future extensibility if relative paths are added.

        Args:
            old_note_path: The old note path (unused in current implementation)
            new_note_path: The new note path (unused in current implementation)
        """
        # With absolute paths to /_resources, no updates needed
        pass
