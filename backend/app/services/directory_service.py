"""Directory service for handling directory operations."""

import os
import shutil
from pathlib import Path
from typing import Dict, List, Union

from app.config import settings


class DirectoryService:
    """Service for directory operations with security validation."""
    
    def __init__(self):
        self.vault_path = settings.vault_path
    
    def _validate_path(self, path: str) -> Path:
        """
        Validate that the path is safe and within the vault directory.
        
        Args:
            path: The directory path to validate
            
        Returns:
            Path: The validated absolute path
            
        Raises:
            ValueError: If the path is invalid or outside vault directory
        """
        # Check for obvious path traversal patterns
        if '..' in path or path.startswith('/') or '\\' in path:
            raise ValueError(f"Path traversal detected: {path}")
        
        # Normalize the path
        if path.startswith('/'):
            path = path[1:]  # Remove leading slash
        
        # Join with vault path and resolve
        full_path = (self.vault_path / path).resolve()
        
        # Check if path is within vault directory
        try:
            full_path.relative_to(self.vault_path)
        except ValueError:
            raise ValueError(f"Path traversal detected: {path}")
        
        return full_path
    
    def _is_safe_operation(self, source_path: Path, dest_path: Path) -> bool:
        """
        Check if a move/copy operation is safe (no circular moves).
        
        Args:
            source_path: Source directory path
            dest_path: Destination directory path
            
        Returns:
            bool: True if operation is safe
        """
        try:
            # Check if destination is within source (circular move)
            dest_path.relative_to(source_path)
            return False
        except ValueError:
            # Destination is not within source, operation is safe
            return True
    
    def _get_directory_contents(self, directory: Path) -> List[Dict]:
        """
        Get directory contents (shallow, not recursive).
        
        Args:
            directory: The directory to scan
            
        Returns:
            List[Dict]: List of directory items with metadata
        """
        contents = []
        
        try:
            for item in sorted(directory.iterdir(), key=lambda x: (x.is_file(), x.name.lower())):
                # Skip hidden files and directories
                if item.name.startswith('.'):
                    continue
                
                item_relative_path = item.relative_to(self.vault_path)
                
                contents.append({
                    "name": item.name,
                    "path": f"/{item_relative_path}",
                    "type": "directory" if item.is_dir() else "file",
                    "size": item.stat().st_size if item.is_file() else 0,
                    "modified": int(item.stat().st_mtime)
                })
        except PermissionError:
            # Skip directories we can't read
            pass
        
        return contents
    
    def create_directory(self, path: str) -> Dict[str, str]:
        """
        Create a new directory.
        
        Args:
            path: The directory path
            
        Returns:
            Dict: Success message and path
            
        Raises:
            ValueError: If path is invalid or directory already exists
        """
        dir_path = self._validate_path(path)
        
        if dir_path.exists():
            raise ValueError(f"Directory already exists: {path}")
        
        # Create parent directories if they don't exist
        dir_path.mkdir(parents=True, exist_ok=True)
        
        return {
            "message": "Directory created successfully",
            "path": f"/{path}"
        }
    
    def get_directory(self, path: str) -> Dict[str, Union[str, int, List]]:
        """
        Get directory information and contents.
        
        Args:
            path: The directory path
            
        Returns:
            Dict: Directory metadata and contents
            
        Raises:
            FileNotFoundError: If directory doesn't exist
            ValueError: If path is invalid or not a directory
        """
        dir_path = self._validate_path(path)
        
        if not dir_path.exists():
            raise FileNotFoundError(f"Directory not found: {path}")
        
        if not dir_path.is_dir():
            raise ValueError(f"Path is not a directory: {path}")
        
        try:
            stat = dir_path.stat()
            contents = self._get_directory_contents(dir_path)
            
            return {
                "name": dir_path.name,
                "path": f"/{path}",
                "type": "directory",
                "size": stat.st_size,
                "modified": int(stat.st_mtime),
                "item_count": len(contents),
                "contents": contents
            }
        except OSError as e:
            raise ValueError(f"Cannot access directory: {str(e)}")
    
    def rename_directory(self, old_path: str, new_path: str) -> Dict[str, str]:
        """
        Rename/move a directory.
        
        Args:
            old_path: Current directory path
            new_path: New directory path
            
        Returns:
            Dict: Success message and new path
            
        Raises:
            FileNotFoundError: If source directory doesn't exist
            ValueError: If paths are invalid or operation is unsafe
        """
        source_path = self._validate_path(old_path)
        dest_path = self._validate_path(new_path)
        
        if not source_path.exists():
            raise FileNotFoundError(f"Directory not found: {old_path}")
        
        if not source_path.is_dir():
            raise ValueError(f"Source path is not a directory: {old_path}")
        
        if dest_path.exists():
            raise ValueError(f"Destination already exists: {new_path}")
        
        if not self._is_safe_operation(source_path, dest_path):
            raise ValueError("Cannot move directory into itself")
        
        # Ensure destination parent directory exists
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Move the directory
        source_path.rename(dest_path)
        
        return {
            "message": "Directory renamed successfully",
            "path": f"/{new_path}"
        }
    
    def move_directory(self, source_path: str, dest_path: str) -> Dict[str, str]:
        """
        Move a directory (alias for rename).
        
        Args:
            source_path: Source directory path
            dest_path: Destination directory path
            
        Returns:
            Dict: Success message and new path
        """
        return self.rename_directory(source_path, dest_path)
    
    def copy_directory(self, source_path: str, dest_path: str) -> Dict[str, str]:
        """
        Copy a directory recursively.
        
        Args:
            source_path: Source directory path
            dest_path: Destination directory path
            
        Returns:
            Dict: Success message and new path
            
        Raises:
            FileNotFoundError: If source directory doesn't exist
            ValueError: If paths are invalid or operation is unsafe
        """
        source_dir = self._validate_path(source_path)
        dest_dir = self._validate_path(dest_path)
        
        if not source_dir.exists():
            raise FileNotFoundError(f"Directory not found: {source_path}")
        
        if not source_dir.is_dir():
            raise ValueError(f"Source path is not a directory: {source_path}")
        
        if dest_dir.exists():
            raise ValueError(f"Destination already exists: {dest_path}")
        
        if not self._is_safe_operation(source_dir, dest_dir):
            raise ValueError("Cannot copy directory into itself")
        
        # Ensure destination parent directory exists
        dest_dir.parent.mkdir(parents=True, exist_ok=True)
        
        # Copy the directory recursively
        shutil.copytree(source_dir, dest_dir, symlinks=False)
        
        return {
            "message": "Directory copied successfully",
            "path": f"/{dest_path}"
        }
    
    def delete_directory(self, path: str, recursive: bool = False) -> Dict[str, str]:
        """
        Delete a directory.
        
        Args:
            path: The directory path
            recursive: Whether to delete non-empty directories
            
        Returns:
            Dict: Success message and path
            
        Raises:
            FileNotFoundError: If directory doesn't exist
            ValueError: If path is invalid or directory is not empty and recursive=False
        """
        dir_path = self._validate_path(path)
        
        if not dir_path.exists():
            raise FileNotFoundError(f"Directory not found: {path}")
        
        if not dir_path.is_dir():
            raise ValueError(f"Path is not a directory: {path}")
        
        try:
            # Check if directory is empty
            if not recursive and any(dir_path.iterdir()):
                raise ValueError(f"Directory is not empty: {path}. Use recursive=True to delete non-empty directories.")
            
            if recursive:
                shutil.rmtree(dir_path)
            else:
                dir_path.rmdir()
            
            return {
                "message": "Directory deleted successfully",
                "path": f"/{path}"
            }
        except OSError as e:
            raise ValueError(f"Cannot delete directory: {str(e)}")
