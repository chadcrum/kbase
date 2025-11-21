"""Notes API endpoints."""

from typing import Dict, List, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.services.file_service import FileService
from app.services.git_service import GitService

router = APIRouter()
file_service = FileService()
git_service = GitService()


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
    created: Optional[int] = None
    modified: Optional[int] = None


class Snippet(BaseModel):
    """Model for a search result snippet."""
    line_number: int
    content: str


class SearchResult(BaseModel):
    """Model for a single search result."""
    path: str
    name: str
    snippets: List[Snippet] = []
    modified: Optional[int] = None


class SearchResponse(BaseModel):
    """Response model for search results."""
    results: List[SearchResult]
    total: int


class CommitInfo(BaseModel):
    """Model for a single commit."""
    hash: str
    timestamp: int
    message: str
    is_current: bool = False


class FileHistoryResponse(BaseModel):
    """Response model for file history."""
    commits: List[CommitInfo]


class FileContentAtCommitResponse(BaseModel):
    """Response model for file content at a specific commit."""
    content: str
    hash: str
    timestamp: int


class RestoreRequest(BaseModel):
    """Request model for restoring a file from a commit."""
    commit_hash: str


@router.get("/", response_model=FileTreeNode)
async def list_notes(current_user: str = Depends(get_current_user)):
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


@router.get("/search/", response_model=SearchResponse)
async def search_notes(
    q: str = Query(..., description="Search query (space-separated phrases)"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of results"),
    current_user: str = Depends(get_current_user)
):
    """
    Search for notes by content and filename.
    
    All space-separated phrases in the query must match somewhere in the file
    (either in content or filename). Search is case-insensitive and supports
    fuzzy/partial matching.
    
    Args:
        q: Search query (space-separated phrases)
        limit: Maximum number of results to return (1-100, default 50)
        
    Returns:
        SearchResponse: List of matching files and total count
    """
    try:
        return file_service.search_notes(q, limit)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )


# Git history routes must be defined BEFORE the generic {path:path} route
# to ensure they match correctly
@router.get("/{path:path}/history", response_model=FileHistoryResponse)
async def get_file_history(path: str, current_user: str = Depends(get_current_user)):
    """
    Get commit history for a file.
    
    Args:
        path: The file path
        
    Returns:
        FileHistoryResponse: List of commits with metadata
        
    Raises:
        HTTPException: 404 if file not found, 400 if invalid path or git error
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Getting history for path: {repr(path)}")
        # Validate file exists
        file_service.get_note(path)
        
        # Get commit history
        commits = git_service.get_file_commits(path)
        logger.info(f"Found {len(commits)} commits for path: {repr(path)}")
        
        # Get current commit hash
        current_commit_hash = git_service.get_current_commit_for_file(path)
        
        # Mark current commit
        commit_info_list = []
        for commit in commits:
            commit_info_list.append(CommitInfo(
                hash=commit["hash"],
                timestamp=commit["timestamp"],
                message=commit["message"],
                is_current=(commit["hash"] == current_commit_hash)
            ))
        
        return FileHistoryResponse(commits=commit_info_list)
        
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {path}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get file history: {str(e)}"
        )


@router.get("/{path:path}/history/{commit_hash}", response_model=FileContentAtCommitResponse)
async def get_file_content_at_commit(
    path: str, 
    commit_hash: str,
    current_user: str = Depends(get_current_user)
):
    """
    Get file content at a specific commit.
    
    Args:
        path: The file path
        commit_hash: The commit hash
        
    Returns:
        FileContentAtCommitResponse: File content and commit metadata
        
    Raises:
        HTTPException: 404 if file/commit not found, 400 if invalid path or hash
    """
    try:
        # Validate file exists
        file_service.get_note(path)
        
        # Get commit info to get timestamp
        commits = git_service.get_file_commits(path)
        commit_info = None
        for commit in commits:
            if commit["hash"] == commit_hash:
                commit_info = commit
                break
        
        if not commit_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Commit not found: {commit_hash[:8]}"
            )
        
        # Get file content at commit
        content = git_service.get_file_content_at_commit(path, commit_hash)
        
        return FileContentAtCommitResponse(
            content=content,
            hash=commit_hash,
            timestamp=commit_info["timestamp"]
        )
        
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {path}"
        )
    except ValueError as e:
        if "not found in commit" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get file content at commit: {str(e)}"
        )


@router.post("/{path:path}/history/commit", response_model=NoteResponse)
async def commit_file(path: str, current_user: str = Depends(get_current_user)):
    """
    Commit the current state of a file.
    
    This ensures the current state is saved before restore operations.
    
    Args:
        path: The file path
        
    Returns:
        NoteResponse: Success message and path
        
    Raises:
        HTTPException: 404 if file not found, 400 if invalid path or git error
    """
    try:
        # Validate file exists
        file_service.get_note(path)
        
        # Commit the file
        success = git_service.commit_single_file(path)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to commit file"
            )
        
        return NoteResponse(
            message="File committed successfully",
            path=path
        )
        
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {path}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to commit file: {str(e)}"
        )


@router.post("/{path:path}/history/restore", response_model=NoteResponse)
async def restore_file_from_commit(
    path: str,
    restore_request: RestoreRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Restore a file from a specific commit.
    
    This will:
    1. Save and commit the current state (if not already committed)
    2. Restore the file content from the specified commit
    3. Commit the restored version
    
    Args:
        path: The file path
        restore_request: The restore request with commit hash
        
    Returns:
        NoteResponse: Success message and path
        
    Raises:
        HTTPException: 404 if file/commit not found, 400 if invalid path or hash
    """
    try:
        # Validate file exists
        file_service.get_note(path)
        
        # Ensure current state is committed first
        git_service.commit_single_file(path)
        
        # Get file content at the specified commit
        content = git_service.get_file_content_at_commit(path, restore_request.commit_hash)
        
        # Update the file with restored content
        file_service.update_note(path, content)
        
        # Commit the restored version
        git_service.commit_single_file(path)
        
        return NoteResponse(
            message=f"File restored from commit {restore_request.commit_hash[:8]}",
            path=path
        )
        
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {path}"
        )
    except ValueError as e:
        if "not found in commit" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to restore file: {str(e)}"
        )


@router.get("/{path:path}", response_model=NoteData)
async def get_note(path: str, current_user: str = Depends(get_current_user)):
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
async def update_note(path: str, note_content: NoteContent, current_user: str = Depends(get_current_user)):
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
async def move_note(path: str, move_request: NoteMoveRequest, current_user: str = Depends(get_current_user)):
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
async def copy_note(path: str, copy_request: NoteMoveRequest, current_user: str = Depends(get_current_user)):
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
async def create_note(path: str, note_content: NoteContent, current_user: str = Depends(get_current_user)):
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
