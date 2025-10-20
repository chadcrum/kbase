"""Notes API endpoints."""

from typing import Dict, Union

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.file_service import FileService

router = APIRouter()
file_service = FileService()


class NoteContent(BaseModel):
    """Request model for note content."""
    content: str = ""


class NoteMoveRequest(BaseModel):
    """Request model for note move/copy operations."""
    destination: str


class NoteResponse(BaseModel):
    """Response model for note operations."""
    message: str
    path: str


class NoteData(BaseModel):
    """Response model for note data."""
    content: str
    path: str
    size: int
    modified: int


class FileTreeNode(BaseModel):
    """Model for file tree nodes."""
    name: str
    path: str
    type: str
    children: list = []


@router.get("/", response_model=FileTreeNode)
async def list_notes():
    """
    List all notes in a tree structure.
    
    Returns:
        FileTreeNode: Hierarchical file tree structure
    """
    try:
        return file_service.list_notes()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list notes: {str(e)}"
        )


@router.get("/{path:path}", response_model=NoteData)
async def get_note(path: str):
    """
    Get note content by path.
    
    Args:
        path: The note path
        
    Returns:
        NoteData: Note content and metadata
        
    Raises:
        HTTPException: 404 if note not found, 400 if invalid path
    """
    try:
        return file_service.get_note(path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Note not found: {path}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get note: {str(e)}"
        )


@router.put("/{path:path}", response_model=NoteResponse)
async def update_note(path: str, note_content: NoteContent):
    """
    Update an existing note.
    
    Args:
        path: The note path
        note_content: The new content
        
    Returns:
        NoteResponse: Success message and path
        
    Raises:
        HTTPException: 404 if note not found, 400 if invalid path
    """
    try:
        return file_service.update_note(path, note_content.content)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Note not found: {path}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update note: {str(e)}"
        )


@router.delete("/{path:path}", response_model=NoteResponse)
async def delete_note(path: str):
    """
    Delete a note.
    
    Args:
        path: The note path
        
    Returns:
        NoteResponse: Success message and path
        
    Raises:
        HTTPException: 404 if note not found, 400 if invalid path
    """
    try:
        return file_service.delete_note(path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Note not found: {path}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete note: {str(e)}"
        )


@router.post("/{path:path}/move", response_model=NoteResponse)
async def move_note(path: str, move_request: NoteMoveRequest):
    """
    Move a note to a new location.
    
    Args:
        path: The current note path
        move_request: The move request with destination path
        
    Returns:
        NoteResponse: Success message and new path
        
    Raises:
        HTTPException: 404 if note not found, 400 if invalid path or operation
    """
    try:
        return file_service.move_note(path, move_request.destination)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Note not found: {path}"
        )
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
            detail=f"Failed to move note: {str(e)}"
        )


@router.post("/{path:path}/copy", response_model=NoteResponse)
async def copy_note(path: str, copy_request: NoteMoveRequest):
    """
    Copy a note to a new location.
    
    Args:
        path: The source note path
        copy_request: The copy request with destination path
        
    Returns:
        NoteResponse: Success message and new path
        
    Raises:
        HTTPException: 404 if note not found, 400 if invalid path or operation
    """
    try:
        return file_service.copy_note(path, copy_request.destination)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Note not found: {path}"
        )
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
            detail=f"Failed to copy note: {str(e)}"
        )


@router.post("/{path:path}", response_model=NoteResponse)
async def create_note(path: str, note_content: NoteContent):
    """
    Create a new note.
    
    Args:
        path: The note path
        note_content: The note content
        
    Returns:
        NoteResponse: Success message and path
        
    Raises:
        HTTPException: 400 if file exists or invalid path, 409 if conflict
    """
    try:
        return file_service.create_note(path, note_content.content)
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
            detail=f"Failed to create note: {str(e)}"
        )
