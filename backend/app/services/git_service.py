"""Git service for automatic version control of the vault."""

import logging
import subprocess
import time
from pathlib import Path
from typing import Dict, List, Optional, Union

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
            # Configure safe directory when we first detect git is available
            if self._git_available:
                self._configure_safe_directory()
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
    
    def _configure_safe_directory(self) -> bool:
        """
        Configure git to trust the vault directory.
        This is needed when the vault directory is owned by a different user
        (e.g., in containers where the directory is mounted from the host).
        
        Returns:
            bool: True if configuration was successful or already set
        """
        try:
            vault_path_str = str(self.vault_path.resolve())
            result = subprocess.run(
                ['git', 'config', '--global', '--add', 'safe.directory', vault_path_str],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                logger.info(f"Configured git safe.directory for {vault_path_str}")
                return True
            else:
                # If it's already configured, that's fine
                if 'already exists' in result.stderr.lower():
                    logger.debug(f"Git safe.directory already configured for {vault_path_str}")
                    return True
                logger.warning(f"Failed to configure git safe.directory: {result.stderr}")
                return False
        except Exception as e:
            logger.warning(f"Error configuring git safe.directory: {str(e)}")
            return False
    
    def _configure_git_user(self) -> bool:
        """
        Configure git user name and email for commits.
        Uses default values if not already configured.
        
        Returns:
            bool: True if configuration was successful
        """
        try:
            # Check if user.name is already set
            name_result = subprocess.run(
                ['git', 'config', '--global', 'user.name'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            # Only set if not already configured
            if name_result.returncode != 0 or not name_result.stdout.strip():
                subprocess.run(
                    ['git', 'config', '--global', 'user.name', 'KBase'],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                logger.info("Configured git user.name to 'KBase'")
            
            # Check if user.email is already set
            email_result = subprocess.run(
                ['git', 'config', '--global', 'user.email'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            # Only set if not already configured
            if email_result.returncode != 0 or not email_result.stdout.strip():
                subprocess.run(
                    ['git', 'config', '--global', 'user.email', 'kbase@localhost'],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                logger.info("Configured git user.email to 'kbase@localhost'")
            
            return True
        except Exception as e:
            logger.warning(f"Error configuring git user: {str(e)}")
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
        
        # Configure safe directory to avoid ownership issues
        self._configure_safe_directory()
        
        # Configure git user identity for commits
        self._configure_git_user()
        
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
    
    def get_file_commits(self, path: str) -> List[Dict[str, Union[str, int]]]:
        """
        Get commit history for a specific file.
        
        Args:
            path: The file path (relative to vault root)
            
        Returns:
            List[Dict]: List of commits with hash, timestamp, and message
            Each dict contains: hash (str), timestamp (int), message (str)
            
        Raises:
            ValueError: If git is not available or path is invalid
        """
        if not self._is_git_available():
            raise ValueError("Git is not available on this system")
        
        # Ensure git is initialized
        if not self._initialized:
            if not self.initialize_git():
                raise ValueError("Failed to initialize git repository")
        
        # Validate path is within vault
        file_path = self.vault_path / path.lstrip('/')
        logger.info(f"Looking for file at: {file_path}")
        logger.info(f"File exists: {file_path.exists()}, Is file: {file_path.is_file() if file_path.exists() else 'N/A'}")
        
        if not file_path.exists() or not file_path.is_file():
            raise ValueError(f"File not found: {path}")
        
        # Get relative path from vault root
        try:
            rel_path = file_path.relative_to(self.vault_path.resolve())
            logger.info(f"Relative path: {rel_path}")
        except ValueError:
            raise ValueError(f"Path is outside vault: {path}")
        
        try:
            # Use git log --follow to track file renames
            # Format: hash|timestamp|message
            # Use as_posix() to ensure forward slashes (git expects this)
            git_path = rel_path.as_posix()
            logger.info(f"Running git log for path: {repr(git_path)}")
            logger.info(f"Full command: git log --follow --format=%H|%ct|%s -- {repr(git_path)}")
            
            result = subprocess.run(
                ['git', 'log', '--follow', '--format=%H|%ct|%s', '--', git_path],
                cwd=str(self.vault_path),
                capture_output=True,
                text=True,
                timeout=30
            )
            
            logger.info(f"Git log return code: {result.returncode}")
            logger.info(f"Git log stdout length: {len(result.stdout)}")
            logger.info(f"Git log stderr: {result.stderr[:200] if result.stderr else 'None'}")
            
            if result.returncode != 0:
                # Log the error for debugging
                logger.warning(f"Git log failed for path '{git_path}': {result.stderr}")
                # If file has no history, return empty list
                if 'does not exist' in result.stderr or 'no such path' in result.stderr.lower() or 'fatal:' in result.stderr.lower():
                    logger.info(f"No history found for path '{git_path}' (file may not be tracked)")
                    return []
                error_msg = f"Git log failed: {result.stderr}"
                self._last_error = error_msg
                self._last_error_time = time.time()
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            commits = []
            for line in result.stdout.strip().split('\n'):
                if not line.strip():
                    continue
                parts = line.split('|', 2)
                if len(parts) >= 2:
                    commit_hash = parts[0]
                    try:
                        timestamp = int(parts[1])
                        message = parts[2] if len(parts) > 2 else ""
                        commits.append({
                            "hash": commit_hash,
                            "timestamp": timestamp,
                            "message": message
                        })
                    except ValueError:
                        # Skip invalid timestamp
                        continue
            
            return commits
            
        except subprocess.TimeoutExpired:
            error_msg = "Git log operation timed out"
            self._last_error = error_msg
            self._last_error_time = time.time()
            logger.error(error_msg)
            raise ValueError(error_msg)
        except Exception as e:
            error_msg = f"Error getting file commits: {str(e)}"
            self._last_error = error_msg
            self._last_error_time = time.time()
            logger.error(error_msg, exc_info=True)
            raise ValueError(error_msg)
    
    def get_file_content_at_commit(self, path: str, commit_hash: str) -> str:
        """
        Get file content from a specific commit.
        
        Args:
            path: The file path (relative to vault root)
            commit_hash: The commit hash
            
        Returns:
            str: File content at that commit
            
        Raises:
            ValueError: If git is not available, commit is invalid, or file doesn't exist in that commit
        """
        if not self._is_git_available():
            raise ValueError("Git is not available on this system")
        
        # Ensure git is initialized
        if not self._initialized:
            if not self.initialize_git():
                raise ValueError("Failed to initialize git repository")
        
        # Validate path is within vault
        file_path = self.vault_path / path.lstrip('/')
        try:
            rel_path = file_path.relative_to(self.vault_path.resolve())
        except ValueError:
            raise ValueError(f"Path is outside vault: {path}")
        
        try:
            # Use git show to get file content at specific commit
            # Use as_posix() to ensure forward slashes (git expects this)
            git_path = rel_path.as_posix()
            result = subprocess.run(
                ['git', 'show', f'{commit_hash}:{git_path}'],
                cwd=str(self.vault_path),
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                error_msg = f"Failed to get file content: {result.stderr}"
                if 'not found' in result.stderr.lower() or 'does not exist' in result.stderr.lower():
                    raise ValueError(f"File not found in commit {commit_hash[:8]}")
                self._last_error = error_msg
                self._last_error_time = time.time()
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            return result.stdout
            
        except subprocess.TimeoutExpired:
            error_msg = "Git show operation timed out"
            self._last_error = error_msg
            self._last_error_time = time.time()
            logger.error(error_msg)
            raise ValueError(error_msg)
        except ValueError:
            # Re-raise ValueError (file not found)
            raise
        except Exception as e:
            error_msg = f"Error getting file content at commit: {str(e)}"
            self._last_error = error_msg
            self._last_error_time = time.time()
            logger.error(error_msg, exc_info=True)
            raise ValueError(error_msg)
    
    def commit_single_file(self, path: str) -> bool:
        """
        Commit only the specified file.
        
        Args:
            path: The file path (relative to vault root)
            
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
        
        # Validate path is within vault
        file_path = self.vault_path / path.lstrip('/')
        if not file_path.exists() or not file_path.is_file():
            error_msg = f"File not found: {path}"
            self._last_error = error_msg
            self._last_error_time = time.time()
            logger.error(error_msg)
            return False
        
        # Check if file is binary
        if self._is_binary_file(file_path):
            error_msg = f"Cannot commit binary file: {path}"
            self._last_error = error_msg
            self._last_error_time = time.time()
            logger.error(error_msg)
            return False
        
        try:
            # Get relative path from vault root
            try:
                rel_path = file_path.relative_to(self.vault_path.resolve())
            except ValueError:
                error_msg = f"Path is outside vault: {path}"
                self._last_error = error_msg
                self._last_error_time = time.time()
                logger.error(error_msg)
                return False
            
            # Use as_posix() to ensure forward slashes (git expects this)
            git_path = rel_path.as_posix()
            
            # Check if file has changes
            status_result = subprocess.run(
                ['git', 'status', '--porcelain', git_path],
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
            
            # Stage the file
            add_result = subprocess.run(
                ['git', 'add', git_path],
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
                ['git', 'diff', '--cached', '--quiet', git_path],
                cwd=str(self.vault_path),
                capture_output=True,
                text=True,
                timeout=10
            )
            
            # If diff returns 0, there are no staged changes
            if diff_result.returncode == 0:
                return True
            
            # Commit the file with descriptive message
            filename = file_path.name
            commit_result = subprocess.run(
                ['git', 'commit', '-m', f'Auto-commit: {filename}'],
                cwd=str(self.vault_path),
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if commit_result.returncode == 0:
                self._last_commit_time = time.time()
                self._last_error = None
                self._last_error_time = None
                logger.info(f"Successfully committed file: {path}")
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
            error_msg = f"Error committing file: {str(e)}"
            self._last_error = error_msg
            self._last_error_time = time.time()
            logger.error(error_msg, exc_info=True)
            return False
    
    def get_current_commit_for_file(self, path: str) -> Optional[str]:
        """
        Get the commit hash that contains the current working tree version of the file.
        Returns None if file has uncommitted changes or no history.
        
        Args:
            path: The file path (relative to vault root)
            
        Returns:
            Optional[str]: Commit hash if file matches HEAD, None if uncommitted changes or no history
        """
        if not self._is_git_available():
            return None
        
        # Ensure git is initialized
        if not self._initialized:
            if not self.initialize_git():
                return None
        
        # Validate path is within vault
        file_path = self.vault_path / path.lstrip('/')
        if not file_path.exists() or not file_path.is_file():
            return None
        
        try:
            # Get relative path from vault root
            try:
                rel_path = file_path.relative_to(self.vault_path.resolve())
            except ValueError:
                return None
            
            # Use as_posix() to ensure forward slashes (git expects this)
            git_path = rel_path.as_posix()
            
            # Check if file has uncommitted changes
            status_result = subprocess.run(
                ['git', 'status', '--porcelain', git_path],
                cwd=str(self.vault_path),
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if status_result.returncode != 0:
                return None
            
            # If file has changes, return None (not committed)
            if status_result.stdout.strip():
                return None
            
            # Get the commit hash for HEAD version of this file
            log_result = subprocess.run(
                ['git', 'log', '-1', '--format=%H', '--', git_path],
                cwd=str(self.vault_path),
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if log_result.returncode == 0 and log_result.stdout.strip():
                return log_result.stdout.strip()
            
            return None
            
        except (subprocess.TimeoutExpired, Exception):
            return None

