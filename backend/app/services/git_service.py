"""Git service for automatic version control of the vault."""

import logging
import subprocess
import time
from pathlib import Path
from typing import Dict, Optional

from app.config import settings

logger = logging.getLogger(__name__)


class GitService:
    """Service for managing git version control in the vault."""
    
    def __init__(self):
        """Initialize the git service."""
        self.vault_path = settings.vault_path
        self._git_available: Optional[bool] = None
        self._last_commit_time: Optional[float] = None
        self._last_error: Optional[str] = None
        self._last_error_time: Optional[float] = None
        self._initialized = False
    
    def _is_git_available(self) -> bool:
        """Check if git is available on the system."""
        if self._git_available is not None:
            return self._git_available
        
        try:
            result = subprocess.run(
                ['git', '--version'],
                capture_output=True,
                text=True,
                timeout=5
            )
            self._git_available = result.returncode == 0
            return self._git_available
        except (FileNotFoundError, subprocess.TimeoutExpired):
            self._git_available = False
            return False
    
    def _is_binary_file(self, path: Path) -> bool:
        """
        Check if a file is binary.
        
        Uses the same logic as FileService to detect binary files.
        
        Args:
            path: The file path to check
            
        Returns:
            bool: True if binary, False if text
        """
        if not path.exists() or not path.is_file():
            return False
        
        # Check file size (reject files > 10MB)
        file_size = path.stat().st_size
        if file_size > 10 * 1024 * 1024:  # 10MB
            return True
        
        try:
            # Read first 512 bytes to check for null bytes
            with open(path, 'rb') as f:
                chunk = f.read(512)
                # Check for null bytes (binary indicator)
                if b'\x00' in chunk:
                    return True
            
            # Attempt UTF-8 validation on entire file (for small files)
            # For larger files, we've already checked the first 512 bytes
            if file_size <= 1024 * 1024:  # 1MB - validate entire file
                try:
                    path.read_text(encoding='utf-8')
                except UnicodeDecodeError:
                    return True
            else:
                # For larger files, try to decode first chunk
                try:
                    chunk.decode('utf-8')
                except UnicodeDecodeError:
                    return True
                    
        except (IOError, PermissionError):
            # If we can't read the file, assume it's binary for safety
            return True
        
        return False
    
    def initialize_git(self) -> bool:
        """
        Initialize git repository if it doesn't exist.
        
        Returns:
            bool: True if git is initialized or already exists, False on error
        """
        if not self._is_git_available():
            error_msg = "Git is not available on this system"
            self._last_error = error_msg
            self._last_error_time = time.time()
            logger.warning(error_msg)
            return False
        
        git_dir = self.vault_path / '.git'
        if git_dir.exists() and git_dir.is_dir():
            self._initialized = True
            return True
        
        try:
            result = subprocess.run(
                ['git', 'init'],
                cwd=str(self.vault_path),
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                self._initialized = True
                logger.info(f"Initialized git repository in {self.vault_path}")
                return True
            else:
                error_msg = f"Failed to initialize git: {result.stderr}"
                self._last_error = error_msg
                self._last_error_time = time.time()
                logger.error(error_msg)
                return False
                
        except subprocess.TimeoutExpired:
            error_msg = "Git initialization timed out"
            self._last_error = error_msg
            self._last_error_time = time.time()
            logger.error(error_msg)
            return False
        except Exception as e:
            error_msg = f"Error initializing git: {str(e)}"
            self._last_error = error_msg
            self._last_error_time = time.time()
            logger.error(error_msg, exc_info=True)
            return False
    
    def ensure_gitignore(self) -> bool:
        """
        Create or update .gitignore file with appropriate patterns.
        
        Returns:
            bool: True if .gitignore is created/updated successfully
        """
        gitignore_path = self.vault_path / '.gitignore'
        
        # Define .gitignore patterns
        gitignore_content = """# Binary files (common extensions)
*.png
*.jpg
*.jpeg
*.gif
*.bmp
*.ico
*.svg
*.webp
*.pdf
*.zip
*.tar
*.gz
*.exe
*.dll
*.so
*.dylib

# Resources directory
_resources/

# Git directory
.git/
"""
        
        try:
            # Check if .gitignore exists and has the correct content
            if gitignore_path.exists():
                existing_content = gitignore_path.read_text(encoding='utf-8')
                # If content matches, no need to update
                if existing_content.strip() == gitignore_content.strip():
                    return True
            
            # Write .gitignore
            gitignore_path.write_text(gitignore_content, encoding='utf-8')
            logger.info(f"Created/updated .gitignore in {self.vault_path}")
            return True
            
        except Exception as e:
            error_msg = f"Error creating .gitignore: {str(e)}"
            self._last_error = error_msg
            self._last_error_time = time.time()
            logger.error(error_msg, exc_info=True)
            return False
    
    def commit_changes(self) -> bool:
        """
        Stage and commit all text files in the vault.
        
        Returns:
            bool: True if commit was successful or no changes, False on error
        """
        if not self._is_git_available():
            error_msg = "Git is not available on this system"
            self._last_error = error_msg
            self._last_error_time = time.time()
            logger.warning(error_msg)
            return False
        
        # Ensure git is initialized
        if not self._initialized:
            if not self.initialize_git():
                return False
        
        # Ensure .gitignore exists
        if not self.ensure_gitignore():
            return False
        
        try:
            # Check if there are any changes
            status_result = subprocess.run(
                ['git', 'status', '--porcelain'],
                cwd=str(self.vault_path),
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if status_result.returncode != 0:
                error_msg = f"Git status failed: {status_result.stderr}"
                self._last_error = error_msg
                self._last_error_time = time.time()
                logger.error(error_msg)
                return False
            
            # If no changes, nothing to commit
            if not status_result.stdout.strip():
                return True
            
            # Find all text files and stage them
            text_files = []
            for file_path in self.vault_path.rglob('*'):
                # Skip .git directory
                if '.git' in file_path.parts:
                    continue
                
                # Skip .gitignore itself (it's already handled)
                if file_path.name == '.gitignore':
                    continue
                
                if file_path.is_file() and not self._is_binary_file(file_path):
                    # Get relative path from vault root
                    try:
                        rel_path = file_path.relative_to(self.vault_path)
                        text_files.append(rel_path)
                    except ValueError:
                        # File is outside vault (shouldn't happen)
                        continue
            
            # Stage all text files
            if text_files:
                # Use git add . to stage all files (gitignore will handle exclusions)
                add_result = subprocess.run(
                    ['git', 'add', '.'],
                    cwd=str(self.vault_path),
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if add_result.returncode != 0:
                    error_msg = f"Git add failed: {add_result.stderr}"
                    self._last_error = error_msg
                    self._last_error_time = time.time()
                    logger.error(error_msg)
                    return False
            
            # Check if there are staged changes
            diff_result = subprocess.run(
                ['git', 'diff', '--cached', '--quiet'],
                cwd=str(self.vault_path),
                capture_output=True,
                text=True,
                timeout=10
            )
            
            # If diff returns 0, there are no staged changes
            if diff_result.returncode == 0:
                return True
            
            # Commit changes
            commit_result = subprocess.run(
                ['git', 'commit', '-m', 'Auto-commit'],
                cwd=str(self.vault_path),
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if commit_result.returncode == 0:
                self._last_commit_time = time.time()
                self._last_error = None
                self._last_error_time = None
                logger.info("Successfully committed changes to git")
                return True
            else:
                error_msg = f"Git commit failed: {commit_result.stderr}"
                self._last_error = error_msg
                self._last_error_time = time.time()
                logger.error(error_msg)
                return False
                
        except subprocess.TimeoutExpired:
            error_msg = "Git operation timed out"
            self._last_error = error_msg
            self._last_error_time = time.time()
            logger.error(error_msg)
            return False
        except Exception as e:
            error_msg = f"Error committing changes: {str(e)}"
            self._last_error = error_msg
            self._last_error_time = time.time()
            logger.error(error_msg, exc_info=True)
            return False
    
    def get_status(self) -> Dict:
        """
        Get the current git service status.
        
        Returns:
            Dict: Status information including enabled, last_commit, last_error, etc.
        """
        git_available = self._is_git_available()
        git_initialized = self._initialized or (self.vault_path / '.git').exists()
        
        return {
            "enabled": git_available and git_initialized,
            "last_commit": self._last_commit_time,
            "last_error": self._last_error,
            "last_error_time": self._last_error_time
        }

