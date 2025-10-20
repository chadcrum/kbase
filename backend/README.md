# KBase Backend

A minimal FastAPI backend for the KBase note-taking application.

## Features

- **File CRUD Operations**: Create, read, update, and delete markdown notes
- **Directory CRUD Operations**: Create, read, update, delete, move, and copy directories
- **Path Security**: Protection against directory traversal attacks
- **File Tree API**: Hierarchical listing of notes and directories
- **OpenAPI Documentation**: Auto-generated API docs at `/docs` and `/redoc`
- **Environment Configuration**: Configure vault path via environment variables

## Quick Start

1. **Install Dependencies** (using uv):
   ```bash
   # Install main dependencies
   uv sync
   
   # Install dev dependencies (includes pytest)
   uv pip install -e ".[dev]"
   ```

2. **Set Environment Variables**:
   ```bash
   export VAULT_PATH=/path/to/your/vault
   # Or create a .env file with:
   # VAULT_PATH=/path/to/your/vault
   ```

3. **Run the Server**:
   ```bash
   # Using uv
   VAULT_PATH=/path/to/your/vault uv run python -m app.main
   
   # Or using the convenience script
   VAULT_PATH=/path/to/your/vault uv run python run.py
   
   # Or directly with uvicorn
   VAULT_PATH=/path/to/your/vault uv run uvicorn app.main:app --reload
   ```

4. **Access the API**:
   - API Documentation: http://localhost:8000/docs
   - Alternative Docs: http://localhost:8000/redoc
   - Health Check: http://localhost:8000/health

## API Endpoints

### Notes
- `GET /api/v1/notes/` - List all notes (tree structure)
- `GET /api/v1/notes/{path}` - Get note content
- `POST /api/v1/notes/{path}` - Create note
- `PUT /api/v1/notes/{path}` - Update note
- `DELETE /api/v1/notes/{path}` - Delete note

### Directories
- `POST /api/v1/directories/{path}` - Create directory
- `GET /api/v1/directories/{path}` - Get directory metadata
- `PUT /api/v1/directories/{path}` - Rename directory
- `DELETE /api/v1/directories/{path}` - Delete directory
- `POST /api/v1/directories/{path}/move` - Move directory
- `POST /api/v1/directories/{path}/copy` - Copy directory

## Testing

Run the test suite:

```bash
# Using uv
uv run pytest -v
```

## Configuration

The application uses environment variables for configuration:

- `VAULT_PATH` (required): Path to the note vault directory
- `HOST` (optional): Server host (default: 0.0.0.0)
- `PORT` (optional): Server port (default: 8000)

## Security

- All file paths are validated to prevent directory traversal attacks
- Only markdown files (`.md`, `.markdown`) are supported
- Paths are normalized and checked against the vault directory

## Development

The backend follows a clean architecture pattern:

- `app/main.py` - FastAPI application setup
- `app/config.py` - Configuration management
- `app/services/file_service.py` - File operations logic
- `app/services/directory_service.py` - Directory operations logic
- `app/api/v1/endpoints/notes.py` - Notes API endpoints
- `app/api/v1/endpoints/directories.py` - Directory API endpoints
- `tests/` - Test suite
