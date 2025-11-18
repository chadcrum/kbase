"""Image upload API endpoints."""

from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse

from app.services.image_service import ImageService
from app.core.auth import get_current_user
from app.config import settings

router = APIRouter()

# Dependency to get image service
def get_image_service() -> ImageService:
    return ImageService()


@router.post("/upload", response_model=dict)
async def upload_image(
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user),
    image_service: ImageService = Depends(get_image_service)
):
    """
    Upload an image file to the vault's _resources directory.

    Args:
        file: The image file to upload
        current_user: Current authenticated user
        image_service: Image service instance

    Returns:
        dict: Success response with image path

    Raises:
        HTTPException: 400 for invalid file, 500 for server errors
    """
    try:
        image_path = image_service.upload_image(file)
        return {
            "message": "Image uploaded successfully",
            "path": image_path
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image: {str(e)}"
        )


@router.get("/{image_path:path}")
async def get_image(
    image_path: str,
    current_user: str = Depends(get_current_user)
):
    """
    Serve an image file from the _resources directory.

    Args:
        image_path: The image path relative to _resources (e.g., "abc123.png")
        current_user: Current authenticated user

    Returns:
        FileResponse: The image file

    Raises:
        HTTPException: 404 if image not found, 400 if invalid path
    """
    try:
        # Validate that the path is within _resources
        if not image_path.startswith('_resources/'):
            # If path doesn't start with _resources/, add it
            if image_path.startswith('/'):
                image_path = image_path[1:]  # Remove leading slash
            if not image_path.startswith('_resources/'):
                image_path = f'_resources/{image_path}'

        # Validate path to prevent directory traversal
        vault_path = settings.vault_path.resolve()
        full_path = (vault_path / image_path).resolve()

        # Ensure the path is within the vault
        try:
            full_path.relative_to(vault_path)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image path"
            )

        # Ensure the path is within _resources directory
        resources_path = vault_path / '_resources'
        try:
            full_path.relative_to(resources_path.resolve())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image path must be within _resources directory"
            )

        if not full_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Image not found: {image_path}"
            )

        if not full_path.is_file():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Path is not a file"
            )

        # Determine media type from file extension
        media_type_map = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
        }
        media_type = media_type_map.get(full_path.suffix.lower(), 'application/octet-stream')

        return FileResponse(
            path=str(full_path),
            media_type=media_type
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to serve image: {str(e)}"
        )
