"""File service for handling note operations."""

import os
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Union

from app.config import settings


class FileService:
    """Service for file operations with security validation."""
    
    def __init__(self):
        self.vault_path = settings.vault_path
    
    def _validate_path(self, path: str) -> Path:
        """
        Validate that the path is safe and within the vault directory.
        
        Args:
            path: The file path to validate
            
        Returns:
            Path: The validated absolute path
            
        Raises:
            ValueError: If the path is invalid or outside vault directory
        """
        # Normalize the path
        if path.startswith('/'):
            path = path[1:]  # Remove leading slash
        
        # Join with vault path and resolve both paths
        vault_resolved = self.vault_path.resolve()
        full_path = (self.vault_path / path).resolve()
        
        # Check if path is within vault directory
        try:
            full_path.relative_to(vault_resolved)
        except ValueError:
            raise ValueError(f"Path traversal detected: {path}")
        
        return full_path
    
    def _is_markdown_file(self, path: Path) -> bool:
        """Check if file is a markdown file."""
        return path.suffix.lower() in ['.md', '.markdown']
    
    def _build_file_tree(self, directory: Path, relative_path: str = "") -> Dict:
        """
        Build a file tree structure recursively.
        
        Args:
            directory: The directory to scan
            relative_path: The relative path from vault root
            
        Returns:
            Dict: File tree structure
        """
        children = []
        
        try:
            # Get all items in directory, sorted by name
            items = sorted(directory.iterdir(), key=lambda x: (x.is_file(), x.name.lower()))
            
            for item in items:
                # Skip hidden files and directories
                if item.name.startswith('.'):
                    continue
                
                item_relative_path = f"{relative_path}/{item.name}" if relative_path else item.name
                
                if item.is_dir():
                    # Recursively build directory tree
                    dir_tree = self._build_file_tree(item, item_relative_path)
                    if dir_tree["children"]:  # Only include non-empty directories
                        children.append(dir_tree)
                elif self._is_markdown_file(item):
                    # Add markdown files
                    children.append({
                        "name": item.name,
                        "path": f"/{item_relative_path}",
                        "type": "file"
                    })
        
        except PermissionError:
            # Skip directories we can't read
            pass
        
        return {
            "name": directory.name if relative_path else "vault",
            "path": f"/{relative_path}" if relative_path else "/",
            "type": "directory",
            "children": children
        }
    
    def list_notes(self) -> Dict:
        """
        List all notes in a tree structure.
        
        Returns:
            Dict: File tree structure
        """
        return self._build_file_tree(self.vault_path)
    
    def get_note(self, path: str) -> Dict[str, Union[str, int]]:
        """
        Get note content.
        
        Args:
            path: The note path
            
        Returns:
            Dict: Note content and metadata
            
        Raises:
            FileNotFoundError: If note doesn't exist
            ValueError: If path is invalid
        """
        file_path = self._validate_path(path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"Note not found: {path}")
        
        if not file_path.is_file():
            raise ValueError(f"Path is not a file: {path}")
        
        if not self._is_markdown_file(file_path):
            raise ValueError(f"File is not a markdown file: {path}")
        
        try:
            content = file_path.read_text(encoding='utf-8')
            stat = file_path.stat()
            
            return {
                "content": content,
                "path": f"/{path}",
                "size": stat.st_size,
                "modified": int(stat.st_mtime)
            }
        except UnicodeDecodeError:
            raise ValueError(f"File contains invalid UTF-8 content: {path}")
    
    def create_note(self, path: str, content: str = "") -> Dict[str, str]:
        """
        Create a new note.
        
        Args:
            path: The note path
            content: The note content
            
        Returns:
            Dict: Success message and path
            
        Raises:
            ValueError: If path is invalid or file already exists
        """
        file_path = self._validate_path(path)
        
        if file_path.exists():
            raise ValueError(f"File already exists: {path}")
        
        # Ensure the file has .md extension
        if not self._is_markdown_file(file_path):
            file_path = file_path.with_suffix('.md')
        
        # Create parent directories if they don't exist
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write the file
        file_path.write_text(content, encoding='utf-8')
        
        return {
            "message": "Note created successfully",
            "path": f"/{path}"
        }
    
    def update_note(self, path: str, content: str) -> Dict[str, str]:
        """
        Update an existing note.
        
        Args:
            path: The note path
            content: The new content
            
        Returns:
            Dict: Success message and path
            
        Raises:
            FileNotFoundError: If note doesn't exist
            ValueError: If path is invalid
        """
        file_path = self._validate_path(path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"Note not found: {path}")
        
        if not file_path.is_file():
            raise ValueError(f"Path is not a file: {path}")
        
        # Write the updated content
        file_path.write_text(content, encoding='utf-8')
        
        return {
            "message": "Note updated successfully",
            "path": f"/{path}"
        }
    
    def delete_note(self, path: str) -> Dict[str, str]:
        """
        Delete a note.
        
        Args:
            path: The note path
            
        Returns:
            Dict: Success message and path
            
        Raises:
            FileNotFoundError: If note doesn't exist
            ValueError: If path is invalid
        """
        file_path = self._validate_path(path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"Note not found: {path}")
        
        if not file_path.is_file():
            raise ValueError(f"Path is not a file: {path}")
        
        # Delete the file
        file_path.unlink()
        
        return {
            "message": "Note deleted successfully",
            "path": f"/{path}"
        }
    
    def rename_note(self, old_path: str, new_path: str) -> Dict[str, str]:
        """
        Rename/move a note to a new location.
        
        Args:
            old_path: Current note path
            new_path: New note path
            
        Returns:
            Dict: Success message and new path
            
        Raises:
            FileNotFoundError: If source note doesn't exist
            ValueError: If paths are invalid or destination already exists
        """
        source_path = self._validate_path(old_path)
        dest_path = self._validate_path(new_path)
        
        if not source_path.exists():
            raise FileNotFoundError(f"Note not found: {old_path}")
        
        if not source_path.is_file():
            raise ValueError(f"Source path is not a file: {old_path}")
        
        if dest_path.exists():
            raise ValueError(f"Destination already exists: {new_path}")
        
        # Ensure the destination has .md extension
        if not self._is_markdown_file(dest_path):
            dest_path = dest_path.with_suffix('.md')
        
        # Create parent directories if they don't exist
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Move the file
        source_path.rename(dest_path)
        
        return {
            "message": "Note renamed successfully",
            "path": f"/{new_path}"
        }
    
    def move_note(self, source_path: str, dest_path: str) -> Dict[str, str]:
        """
        Move a note (alias for rename).
        
        Args:
            source_path: Source note path
            dest_path: Destination note path
            
        Returns:
            Dict: Success message and new path
        """
        return self.rename_note(source_path, dest_path)
    
    def copy_note(self, source_path: str, dest_path: str) -> Dict[str, str]:
        """
        Copy a note to a new location.
        
        Args:
            source_path: Source note path
            dest_path: Destination note path
            
        Returns:
            Dict: Success message and new path
            
        Raises:
            FileNotFoundError: If source note doesn't exist
            ValueError: If paths are invalid or destination already exists
        """
        source_file = self._validate_path(source_path)
        dest_file = self._validate_path(dest_path)
        
        if not source_file.exists():
            raise FileNotFoundError(f"Note not found: {source_path}")
        
        if not source_file.is_file():
            raise ValueError(f"Source path is not a file: {source_path}")
        
        if dest_file.exists():
            raise ValueError(f"Destination already exists: {dest_path}")
        
        # Ensure the destination has .md extension
        if not self._is_markdown_file(dest_file):
            dest_file = dest_file.with_suffix('.md')
        
        # Create parent directories if they don't exist
        dest_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Copy the file (preserving metadata)
        shutil.copy2(source_file, dest_file)
        
        return {
            "message": "Note copied successfully",
            "path": f"/{dest_path}"
        }
