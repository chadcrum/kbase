# KBase Backend

A minimal FastAPI backend for the KBase note-taking application.

## Features

- **File CRUD Operations**: Create, read, update, and delete markdown notes
- **Directory CRUD Operations**: Create, read, update, delete, move, and copy directories
- **JWT Authentication**: Secure token-based authentication for single-user access
- **Path Security**: Protection against directory traversal attacks
- **File Tree API**: Hierarchical listing of notes and directories
- **OpenAPI Documentation**: Auto-generated API docs at `/docs` and `/redoc`
- **Environment Configuration**: Configure vault path and authentication via environment variables

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
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env with your values:
   # VAULT_PATH=/path/to/your/vault
   # SECRET_KEY=your-secret-key-here
   # PASSWORD=your-password-here
   ```
   
   **Generate Secret Key**:
   ```bash
   # Generate a secret key for JWT signing
   openssl rand -hex 32
   ```

3. **Run the Server**:
   ```bash
   # Using uv with all required environment variables
   VAULT_PATH=/path/to/your/vault SECRET_KEY=your-secret-key-here PASSWORD=your-password-here uv run python -m app.main
   
   # Or using the convenience script
   VAULT_PATH=/path/to/your/vault SECRET_KEY=your-secret-key-here PASSWORD=your-password-here uv run python run.py
   
   # Or directly with uvicorn
   VAULT_PATH=/path/to/your/vault SECRET_KEY=your-secret-key-here PASSWORD=your-password-here uv run uvicorn app.main:app --reload
   ```

4. **Access the API**:
   - API Documentation: http://localhost:8000/docs
   - Alternative Docs: http://localhost:8000/redoc
   - Health Check: http://localhost:8000/health
   - **Note**: All API endpoints except `/` and `/health` now require authentication

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Authenticate and get JWT token
- `GET /api/v1/auth/verify` - Verify token validity

### Notes (Protected)
- `GET /api/v1/notes/` - List all notes (tree structure)
- `GET /api/v1/notes/{path}` - Get note content
- `POST /api/v1/notes/{path}` - Create note
- `PUT /api/v1/notes/{path}` - Update note
- `DELETE /api/v1/notes/{path}` - Delete note
- `POST /api/v1/notes/{path}/move` - Move note
- `POST /api/v1/notes/{path}/copy` - Copy note

### Directories (Protected)
- `POST /api/v1/directories/{path}` - Create directory
- `GET /api/v1/directories/{path}` - Get directory metadata
- `PUT /api/v1/directories/{path}` - Rename directory
- `DELETE /api/v1/directories/{path}` - Delete directory
- `POST /api/v1/directories/{path}/move` - Move directory
- `POST /api/v1/directories/{path}/copy` - Copy directory

### Public Endpoints
- `GET /` - Root endpoint with basic information
- `GET /health` - Health check
- `GET /docs` - OpenAPI documentation
- `GET /redoc` - Alternative API documentation

## Testing

Run the test suite:

```bash
# Using uv
uv run pytest -v
```

## Configuration

The application uses environment variables for configuration:

- `VAULT_PATH` (required): Path to the note vault directory
- `SECRET_KEY` (required): Secret key for JWT token signing
- `PASSWORD` (required): Plain text password for authentication
- `ACCESS_TOKEN_EXPIRE_MINUTES` (optional): Token expiration time (default: 30)
- `HOST` (optional): Server host (default: 0.0.0.0)
- `PORT` (optional): Server port (default: 8000)

## Security

- **JWT Authentication**: All API endpoints (except public ones) require valid JWT tokens
- **Password Security**: Plain text password stored in environment variables (suitable for personal use)
- **Path Security**: All file paths are validated to prevent directory traversal attacks
- **Token Security**: JWT tokens expire after 30 minutes by default
- **File Type Validation**: Only markdown files (`.md`, `.markdown`) are supported
- **Path Normalization**: Paths are normalized and checked against the vault directory

## Complete Example

Here's a complete example of setting up and running the backend:

```bash
# 1. Clone and navigate
cd /home/user/kbase/backend

# 2. Install dependencies
uv sync
uv pip install -e ".[dev]"

# 3. Set up environment
cp env.example .env

# 4. Edit .env file with your values:
# VAULT_PATH=/home/user/kbase-vault
# SECRET_KEY=a1b2c3d4e5f6...  # Generate with: openssl rand -hex 32
# PASSWORD=my-secure-password

# 5. Run the server
uv run python -m app.main
```

## Authentication Usage

To use the API, you need to authenticate first:

```bash
# Login to get a JWT token
curl -X POST "http://localhost:8000/api/v1/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"password": "your-password"}'

# Use the token in subsequent requests
curl -X GET "http://localhost:8000/api/v1/notes/" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Development

The backend follows a clean architecture pattern:

- `app/main.py` - FastAPI application setup
- `app/config.py` - Configuration management
- `app/services/file_service.py` - File operations logic
- `app/services/directory_service.py` - Directory operations logic
- `app/api/v1/endpoints/notes.py` - Notes API endpoints
- `app/api/v1/endpoints/directories.py` - Directory API endpoints
- `tests/` - Test suite
