"""File service for handling note operations."""

import os
import shutil
import subprocess
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
                    # Include all directories, even if empty
                    children.append(dir_tree)
                elif self._is_markdown_file(item):
                    # Add markdown files with timestamps
                    stat = item.stat()
                    children.append({
                        "name": item.name,
                        "path": f"/{item_relative_path}",
                        "type": "file",
                        "created": int(stat.st_ctime),
                        "modified": int(stat.st_mtime)
                    })
        
        except PermissionError:
            # Skip directories we can't read
            pass
        
        # Get directory timestamps
        try:
            stat = directory.stat()
            created = int(stat.st_ctime)
            modified = int(stat.st_mtime)
        except (OSError, PermissionError):
            created = None
            modified = None
        
        return {
            "name": directory.name if relative_path else "vault",
            "path": f"/{relative_path}" if relative_path else "/",
            "type": "directory",
            "children": children,
            "created": created,
            "modified": modified
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
        
        # Get the normalized path (relative to vault)
        normalized_path = file_path.relative_to(self.vault_path.resolve())
        
        try:
            content = file_path.read_text(encoding='utf-8')
            stat = file_path.stat()
            
            return {
                "content": content,
                "path": f"/{normalized_path}",
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
        
        # Get the normalized path (relative to vault)
        normalized_path = file_path.relative_to(self.vault_path.resolve())
        
        return {
            "message": "Note created successfully",
            "path": f"/{normalized_path}"
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
        
        # Get the normalized path (relative to vault)
        normalized_path = file_path.relative_to(self.vault_path.resolve())
        
        return {
            "message": "Note updated successfully",
            "path": f"/{normalized_path}"
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
        
        # Get the normalized path before deleting (relative to vault)
        normalized_path = file_path.relative_to(self.vault_path.resolve())
        
        # Delete the file
        file_path.unlink()
        
        return {
            "message": "Note deleted successfully",
            "path": f"/{normalized_path}"
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
        
        # Get the normalized path (relative to vault)
        normalized_path = dest_path.relative_to(self.vault_path.resolve())
        
        return {
            "message": "Note renamed successfully",
            "path": f"/{normalized_path}"
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
        
        # Get the normalized path (relative to vault)
        normalized_path = dest_file.relative_to(self.vault_path.resolve())
        
        return {
            "message": "Note copied successfully",
            "path": f"/{normalized_path}"
        }
    
    def search_notes(self, query: str, limit: int = 50) -> Dict[str, Union[List[Dict], int]]:
        """
        Search for notes by content and filename using ripgrep.
        
        The search is fuzzy and case-insensitive. All space-separated phrases in the query
        must match somewhere in the file (either in content or filename).
        
        Args:
            query: Search query (space-separated phrases)
            limit: Maximum number of results to return
            
        Returns:
            Dict: Search results with list of matching files, snippets, and total count
        """
        if not query or not query.strip():
            return {"results": [], "total": 0}
        
        # Split query into phrases (by spaces, ignoring multiple spaces)
        phrases = [p for p in query.split() if p.strip()]
        
        if not phrases:
            return {"results": [], "total": 0}
        
        # Find files matching all phrases using ripgrep
        matching_files_with_snippets = self._search_with_ripgrep(phrases)
        
        # Limit results
        limited_files = list(matching_files_with_snippets.items())[:limit]
        
        # Build result structure
        results = []
        for file_path, snippets in limited_files:
            # Get relative path from vault root
            try:
                rel_path = file_path.relative_to(self.vault_path.resolve())
                results.append({
                    "path": f"/{rel_path}",
                    "name": file_path.name,
                    "snippets": snippets
                })
            except ValueError:
                # Skip files outside vault (shouldn't happen due to validation)
                continue
        
        return {
            "results": results,
            "total": len(results)
        }
    
    def _search_with_ripgrep(self, phrases: List[str]) -> Dict[Path, List[Dict[str, Union[int, str]]]]:
        """
        Use ripgrep to find files matching all phrases with snippets.
        
        A file matches if all phrases are found somewhere in the file content or filename.
        Returns up to 3 matching lines per file with line numbers.
        
        Args:
            phrases: List of search phrases (all must match)
            
        Returns:
            Dict: Mapping of file paths to list of snippets (line_number, content)
        """
        # First pass: Find files matching all phrases
        all_matches = None
        
        for phrase in phrases:
            # Search for this phrase in file contents AND filenames
            phrase_matches = set()
            
            try:
                # Search file contents with ripgrep (case-insensitive)
                result = subprocess.run(
                    [
                        'rg',
                        '-i',  # case insensitive
                        '-l',  # list files only
                        '--type-add', 'md:*.md',
                        '--type-add', 'md:*.markdown',
                        '--type', 'md',
                        phrase
                    ],
                    cwd=str(self.vault_path),
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                # Parse ripgrep output (one filename per line)
                if result.returncode == 0 and result.stdout.strip():
                    for line in result.stdout.strip().split('\n'):
                        if line:
                            file_path = self.vault_path / line.strip()
                            if file_path.exists() and file_path.is_file():
                                phrase_matches.add(file_path)
                
                # Also search filenames using ripgrep --files with case-insensitive glob
                # This is much faster than Python's rglob
                files_result = subprocess.run(
                    [
                        'rg',
                        '--files',
                        '--type-add', 'md:*.md',
                        '--type-add', 'md:*.markdown',
                        '--type', 'md',
                        '--iglob', f'*{phrase}*'  # case-insensitive glob for filename matching
                    ],
                    cwd=str(self.vault_path),
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                # Add matching files
                if files_result.returncode == 0 and files_result.stdout.strip():
                    for line in files_result.stdout.strip().split('\n'):
                        if line:
                            file_path = self.vault_path / line.strip()
                            if file_path.exists() and file_path.is_file():
                                phrase_matches.add(file_path)
            
            except subprocess.TimeoutExpired:
                # If ripgrep times out, continue with what we have
                pass
            except FileNotFoundError:
                # ripgrep not installed, fall back to basic search
                phrase_matches = self._fallback_search_files(phrase)
            
            # Intersect with previous matches (all phrases must match)
            if all_matches is None:
                all_matches = phrase_matches
            else:
                all_matches = all_matches.intersection(phrase_matches)
            
            # Early exit if no matches
            if not all_matches:
                break
        
        if not all_matches:
            return {}
        
        # Second pass: Get snippets for matching files
        # Combine all phrases into a single regex pattern (OR operation)
        combined_pattern = '|'.join(phrases)
        
        results_with_snippets = {}
        
        try:
            # Search with line numbers and get matching content
            result = subprocess.run(
                [
                    'rg',
                    '-i',  # case insensitive
                    '-n',  # show line numbers
                    '--max-count', '3',  # limit to first 3 matches per file
                    '--type-add', 'md:*.md',
                    '--type-add', 'md:*.markdown',
                    '--type', 'md',
                    combined_pattern
                ],
                cwd=str(self.vault_path),
                capture_output=True,
                text=True,
                timeout=5
            )
            
            # Parse ripgrep output: "filename:line_number:content"
            if result.returncode == 0 and result.stdout.strip():
                for line in result.stdout.strip().split('\n'):
                    if ':' in line:
                        parts = line.split(':', 2)
                        if len(parts) >= 3:
                            filename = parts[0]
                            line_number = parts[1]
                            content = parts[2]
                            
                            file_path = self.vault_path / filename
                            
                            # Only include files that matched all phrases
                            if file_path in all_matches:
                                if file_path not in results_with_snippets:
                                    results_with_snippets[file_path] = []
                                
                                # Add snippet if we haven't reached the limit
                                if len(results_with_snippets[file_path]) < 3:
                                    try:
                                        results_with_snippets[file_path].append({
                                            "line_number": int(line_number),
                                            "content": content.strip()
                                        })
                                    except ValueError:
                                        # Skip if line_number is not an integer
                                        continue
        
        except subprocess.TimeoutExpired:
            # If ripgrep times out, continue with what we have
            pass
        except FileNotFoundError:
            # ripgrep not installed, fall back to basic search
            results_with_snippets = self._fallback_search_with_snippets(all_matches, phrases)
        
        # Add files without content matches (filename matches only)
        for file_path in all_matches:
            if file_path not in results_with_snippets:
                results_with_snippets[file_path] = []
        
        return results_with_snippets
    
    def _fallback_search_files(self, phrase: str) -> set[Path]:
        """
        Fallback search method when ripgrep is not available - returns only file paths.
        
        Args:
            phrase: Search phrase
            
        Returns:
            set: Set of matching file paths
        """
        matches = set()
        phrase_lower = phrase.lower()
        
        # Search all markdown files
        for md_file in self.vault_path.rglob('*.md'):
            try:
                # Check filename
                if phrase_lower in md_file.name.lower():
                    matches.add(md_file)
                    continue
                
                # Check content
                content = md_file.read_text(encoding='utf-8').lower()
                if phrase_lower in content:
                    matches.add(md_file)
            except (UnicodeDecodeError, PermissionError):
                # Skip files we can't read
                continue
        
        return matches
    
    def _fallback_search_with_snippets(
        self, 
        file_paths: set[Path], 
        phrases: List[str]
    ) -> Dict[Path, List[Dict[str, Union[int, str]]]]:
        """
        Fallback method to extract snippets when ripgrep is not available.
        
        Args:
            file_paths: Set of file paths to search in
            phrases: List of search phrases
            
        Returns:
            Dict: Mapping of file paths to list of snippets
        """
        results = {}
        combined_pattern = '|'.join([p.lower() for p in phrases])
        
        for file_path in file_paths:
            snippets = []
            try:
                # Read file and search for matches
                lines = file_path.read_text(encoding='utf-8').split('\n')
                for line_num, line_content in enumerate(lines, start=1):
                    line_lower = line_content.lower()
                    # Check if any phrase matches
                    if any(phrase.lower() in line_lower for phrase in phrases):
                        snippets.append({
                            "line_number": line_num,
                            "content": line_content.strip()
                        })
                        # Limit to 3 matches
                        if len(snippets) >= 3:
                            break
            except (UnicodeDecodeError, PermissionError):
                # Skip files we can't read
                pass
            
            results[file_path] = snippets
        
        return results
