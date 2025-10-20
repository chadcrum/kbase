"""Directory API endpoints."""

from typing import Dict, List, Union

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.services.directory_service import DirectoryService

router = APIRouter()
directory_service = DirectoryService()


class DirectoryResponse(BaseModel):
    """Response model for directory operations."""
    message: str
    path: str


class DirectoryItem(BaseModel):
    """Model for directory items."""
    name: str
    path: str
    type: str
    size: int
    modified: int


class DirectoryData(BaseModel):
    """Response model for directory data."""
    name: str
    path: str
    type: str
    size: int
    modified: int
    item_count: int
    contents: List[DirectoryItem]


class DirectoryRenameRequest(BaseModel):
    """Request model for directory rename."""
    new_name: str


class DirectoryMoveRequest(BaseModel):
    """Request model for directory move/copy operations."""
    destination: str


@router.post("/{path:path}/move", response_model=DirectoryResponse)
async def move_directory(path: str, move_request: DirectoryMoveRequest, current_user: str = Depends(get_current_user)):
    """
    Move a directory to a new location.
    
    Args:
        path: The current directory path
        move_request: The move request with destination path
        
    Returns:
        DirectoryResponse: Success message and new path
        
    Raises:
        HTTPException: 404 if directory not found, 400 if invalid path or operation
    """
    try:
        return directory_service.move_directory(path, move_request.destination)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Directory not found: {path}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to move directory: {str(e)}"
        )


@router.post("/{path:path}/copy", response_model=DirectoryResponse)
async def copy_directory(path: str, copy_request: DirectoryMoveRequest, current_user: str = Depends(get_current_user)):
    """
    Copy a directory to a new location.
    
    Args:
        path: The source directory path
        copy_request: The copy request with destination path
        
    Returns:
        DirectoryResponse: Success message and new path
        
    Raises:
        HTTPException: 404 if directory not found, 400 if invalid path or operation
    """
    try:
        return directory_service.copy_directory(path, copy_request.destination)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Directory not found: {path}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to copy directory: {str(e)}"
        )


@router.post("/{path:path}", response_model=DirectoryResponse)
async def create_directory(path: str, current_user: str = Depends(get_current_user)):
    """
    Create a new directory.
    
    Args:
        path: The directory path
        
    Returns:
        DirectoryResponse: Success message and path
        
    Raises:
        HTTPException: 400 if invalid path, 409 if directory already exists
    """
    try:
        return directory_service.create_directory(path)
    except ValueError as e:
        if "already exists" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(e)
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create directory: {str(e)}"
        )


@router.get("/{path:path}", response_model=DirectoryData)
async def get_directory(path: str, current_user: str = Depends(get_current_user)):
    """
    Get directory information and contents.
    
    Args:
        path: The directory path
        
    Returns:
        DirectoryData: Directory metadata and contents
        
    Raises:
        HTTPException: 404 if directory not found, 400 if invalid path
    """
    try:
        return directory_service.get_directory(path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Directory not found: {path}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get directory: {str(e)}"
        )


@router.put("/{path:path}", response_model=DirectoryResponse)
async def rename_directory(path: str, rename_request: DirectoryRenameRequest, current_user: str = Depends(get_current_user)):
    """
    Rename a directory.
    
    Args:
        path: The current directory path
        rename_request: The rename request with new name
        
    Returns:
        DirectoryResponse: Success message and new path
        
    Raises:
        HTTPException: 404 if directory not found, 400 if invalid path or operation
    """
    try:
        # Build new path by replacing the last part with new name
        path_parts = path.rstrip('/').split('/')
        path_parts[-1] = rename_request.new_name
        new_path = '/'.join(path_parts)
        
        return directory_service.rename_directory(path, new_path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Directory not found: {path}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to rename directory: {str(e)}"
        )


@router.delete("/{path:path}", response_model=DirectoryResponse)
async def delete_directory(
    path: str, 
    recursive: bool = Query(False, description="Delete non-empty directories"),
    current_user: str = Depends(get_current_user)
):
    """
    Delete a directory.
    
    Args:
        path: The directory path
        recursive: Whether to delete non-empty directories
        
    Returns:
        DirectoryResponse: Success message and path
        
    Raises:
        HTTPException: 404 if directory not found, 400 if invalid path or not empty
    """
    try:
        return directory_service.delete_directory(path, recursive)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Directory not found: {path}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete directory: {str(e)}"
        )