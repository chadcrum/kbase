"""Tests for git service."""

import subprocess
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from app.services.git_service import GitService


@pytest.fixture
def temp_vault() -> Path:
    """Create a temporary vault directory for testing."""
    with tempfile.TemporaryDirectory() as temp_dir:
        vault_path = Path(temp_dir) / "test_vault"
        vault_path.mkdir()
        
        # Create some test files
        (vault_path / "note1.md").write_text("# Test Note 1\n\nThis is a test note.")
        (vault_path / "note2.md").write_text("# Test Note 2\n\nAnother test note.")
        
        # Create a binary file (PNG header)
        (vault_path / "image.png").write_bytes(b'\x89PNG\r\n\x1a\n' + b'\x00' * 100)
        
        # Create _resources directory with an image
        resources_dir = vault_path / "_resources"
        resources_dir.mkdir()
        (resources_dir / "test.jpg").write_bytes(b'\xff\xd8\xff' + b'\x00' * 100)
        
        yield vault_path


@pytest.fixture
def git_service(temp_vault: Path) -> GitService:
    """Create a git service instance with temporary vault."""
    with patch('app.services.git_service.settings') as mock_settings:
        mock_settings.vault_path = temp_vault
        service = GitService()
        service.vault_path = temp_vault
        yield service


class TestGitAvailability:
    """Test git availability detection."""
    
    def test_git_available_when_git_exists(self, git_service: GitService):
        """Test that git is detected as available when git command works."""
        with patch('subprocess.run') as mock_run:
            mock_run.return_value = MagicMock(returncode=0)
            assert git_service._is_git_available() is True
    
    def test_git_unavailable_when_git_not_found(self, git_service: GitService):
        """Test that git is detected as unavailable when git command fails."""
        with patch('subprocess.run') as mock_run:
            mock_run.side_effect = FileNotFoundError()
            assert git_service._is_git_available() is False
    
    def test_git_unavailable_on_timeout(self, git_service: GitService):
        """Test that git is detected as unavailable on timeout."""
        with patch('subprocess.run') as mock_run:
            mock_run.side_effect = subprocess.TimeoutExpired(['git', '--version'], 5)
            assert git_service._is_git_available() is False


class TestBinaryFileDetection:
    """Test binary file detection."""
    
    def test_text_file_not_binary(self, git_service: GitService, temp_vault: Path):
        """Test that text files are not detected as binary."""
        text_file = temp_vault / "note1.md"
        assert git_service._is_binary_file(text_file) is False
    
    def test_binary_file_detected(self, git_service: GitService, temp_vault: Path):
        """Test that binary files are detected correctly."""
        binary_file = temp_vault / "image.png"
        assert git_service._is_binary_file(binary_file) is True
    
    def test_large_file_detected_as_binary(self, git_service: GitService, temp_vault: Path):
        """Test that files larger than 10MB are detected as binary."""
        large_file = temp_vault / "large.txt"
        # Create a file larger than 10MB
        large_file.write_bytes(b'0' * (11 * 1024 * 1024))
        assert git_service._is_binary_file(large_file) is True
    
    def test_nonexistent_file_not_binary(self, git_service: GitService, temp_vault: Path):
        """Test that nonexistent files are not detected as binary."""
        nonexistent = temp_vault / "nonexistent.txt"
        assert git_service._is_binary_file(nonexistent) is False


class TestGitInitialization:
    """Test git repository initialization."""
    
    def test_initialize_git_when_not_exists(self, git_service: GitService, temp_vault: Path):
        """Test that git is initialized when .git doesn't exist."""
        with patch('subprocess.run') as mock_run:
            mock_run.return_value = MagicMock(returncode=0)
            with patch.object(git_service, '_is_git_available', return_value=True):
                result = git_service.initialize_git()
                assert result is True
                assert git_service._initialized is True
                mock_run.assert_called_once()
                assert mock_run.call_args[0][0] == ['git', 'init']
    
    def test_initialize_git_when_already_exists(self, git_service: GitService, temp_vault: Path):
        """Test that git initialization is skipped when .git already exists."""
        git_dir = temp_vault / ".git"
        git_dir.mkdir()
        
        with patch.object(git_service, '_is_git_available', return_value=True):
            result = git_service.initialize_git()
            assert result is True
            assert git_service._initialized is True
    
    def test_initialize_git_fails_when_git_unavailable(self, git_service: GitService):
        """Test that git initialization fails when git is not available."""
        with patch.object(git_service, '_is_git_available', return_value=False):
            result = git_service.initialize_git()
            assert result is False
            assert git_service._last_error is not None
    
    def test_initialize_git_handles_errors(self, git_service: GitService):
        """Test that git initialization handles errors gracefully."""
        with patch('subprocess.run') as mock_run:
            mock_run.return_value = MagicMock(returncode=1, stderr="Error message")
            with patch.object(git_service, '_is_git_available', return_value=True):
                result = git_service.initialize_git()
                assert result is False
                assert git_service._last_error is not None


class TestGitignore:
    """Test .gitignore management."""
    
    def test_ensure_gitignore_creates_file(self, git_service: GitService, temp_vault: Path):
        """Test that .gitignore is created if it doesn't exist."""
        gitignore_path = temp_vault / ".gitignore"
        assert not gitignore_path.exists()
        
        result = git_service.ensure_gitignore()
        assert result is True
        assert gitignore_path.exists()
        
        content = gitignore_path.read_text()
        assert "_resources/" in content
        assert ".git/" in content
        assert "*.png" in content
    
    def test_ensure_gitignore_updates_existing(self, git_service: GitService, temp_vault: Path):
        """Test that .gitignore is updated if content doesn't match."""
        gitignore_path = temp_vault / ".gitignore"
        gitignore_path.write_text("# Old content")
        
        result = git_service.ensure_gitignore()
        assert result is True
        
        content = gitignore_path.read_text()
        assert "_resources/" in content
    
    def test_ensure_gitignore_skips_if_correct(self, git_service: GitService, temp_vault: Path):
        """Test that .gitignore is not rewritten if content is correct."""
        gitignore_path = temp_vault / ".gitignore"
        git_service.ensure_gitignore()
        
        # Get the content that was written
        first_content = gitignore_path.read_text()
        
        # Call again
        git_service.ensure_gitignore()
        second_content = gitignore_path.read_text()
        
        # Content should be the same
        assert first_content == second_content


class TestCommitChanges:
    """Test commit functionality."""
    
    def test_commit_changes_when_git_unavailable(self, git_service: GitService):
        """Test that commit fails when git is not available."""
        with patch.object(git_service, '_is_git_available', return_value=False):
            result = git_service.commit_changes()
            assert result is False
            assert git_service._last_error is not None
    
    def test_commit_changes_initializes_git_if_needed(self, git_service: GitService):
        """Test that commit initializes git if needed."""
        with patch.object(git_service, '_is_git_available', return_value=True):
            with patch.object(git_service, 'initialize_git', return_value=True) as mock_init:
                with patch.object(git_service, 'ensure_gitignore', return_value=True):
                    with patch('subprocess.run') as mock_run:
                        # Mock git status (no changes)
                        mock_run.return_value = MagicMock(returncode=0, stdout="")
                        result = git_service.commit_changes()
                        assert result is True
                        mock_init.assert_called_once()
    
    def test_commit_changes_when_no_changes(self, git_service: GitService, temp_vault: Path):
        """Test that commit succeeds when there are no changes."""
        # Initialize git first
        with patch.object(git_service, '_is_git_available', return_value=True):
            with patch('subprocess.run') as mock_run:
                # Mock git init
                mock_run.return_value = MagicMock(returncode=0)
                git_service.initialize_git()
                
                # Mock git status (no changes) and diff (no staged changes)
                def run_side_effect(*args, **kwargs):
                    cmd = args[0] if args else kwargs.get('args', [])
                    if cmd == ['git', 'status', '--porcelain']:
                        return MagicMock(returncode=0, stdout="")
                    elif cmd == ['git', 'diff', '--cached', '--quiet']:
                        return MagicMock(returncode=0)
                    return MagicMock(returncode=0)
                
                mock_run.side_effect = run_side_effect
                result = git_service.commit_changes()
                assert result is True
    
    def test_commit_changes_stages_text_files(self, git_service: GitService, temp_vault: Path):
        """Test that commit stages text files but not binary files."""
        with patch.object(git_service, '_is_git_available', return_value=True):
            with patch('subprocess.run') as mock_run:
                # Mock git init
                mock_run.return_value = MagicMock(returncode=0)
                git_service.initialize_git()
                
                # Mock git status (has changes) and operations
                call_count = 0
                def run_side_effect(*args, **kwargs):
                    nonlocal call_count
                    cmd = args[0] if args else kwargs.get('args', [])
                    call_count += 1
                    
                    if cmd == ['git', 'status', '--porcelain']:
                        return MagicMock(returncode=0, stdout="note1.md\n")
                    elif cmd == ['git', 'add', '.']:
                        return MagicMock(returncode=0)
                    elif cmd == ['git', 'diff', '--cached', '--quiet']:
                        return MagicMock(returncode=1)  # Has staged changes
                    elif cmd == ['git', 'commit', '-m', 'Auto-commit']:
                        return MagicMock(returncode=0)
                    return MagicMock(returncode=0)
                
                mock_run.side_effect = run_side_effect
                result = git_service.commit_changes()
                assert result is True
                # Verify git add was called
                add_calls = [call for call in mock_run.call_args_list 
                           if len(call[0]) > 0 and call[0][0] == ['git', 'add', '.']]
                assert len(add_calls) > 0
    
    def test_commit_changes_handles_errors(self, git_service: GitService):
        """Test that commit handles errors gracefully."""
        with patch.object(git_service, '_is_git_available', return_value=True):
            with patch.object(git_service, 'initialize_git', return_value=True):
                with patch.object(git_service, 'ensure_gitignore', return_value=True):
                    with patch('subprocess.run') as mock_run:
                        mock_run.side_effect = subprocess.TimeoutExpired(['git'], 10)
                        result = git_service.commit_changes()
                        assert result is False
                        assert git_service._last_error is not None


class TestGetStatus:
    """Test status reporting."""
    
    def test_get_status_when_not_initialized(self, git_service: GitService):
        """Test status when git is not initialized."""
        with patch.object(git_service, '_is_git_available', return_value=False):
            status = git_service.get_status()
            assert status["enabled"] is False
            assert status["last_commit"] is None
            assert status["last_error"] is None
    
    def test_get_status_when_initialized(self, git_service: GitService, temp_vault: Path):
        """Test status when git is initialized."""
        git_dir = temp_vault / ".git"
        git_dir.mkdir()
        
        with patch.object(git_service, '_is_git_available', return_value=True):
            git_service._last_commit_time = 1234567890.0
            status = git_service.get_status()
            assert status["enabled"] is True
            assert status["last_commit"] == 1234567890.0
    
    def test_get_status_with_error(self, git_service: GitService):
        """Test status when there's an error."""
        git_service._last_error = "Test error"
        git_service._last_error_time = 1234567890.0
        
        status = git_service.get_status()
        assert status["last_error"] == "Test error"
        assert status["last_error_time"] == 1234567890.0

