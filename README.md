# KBase

A web-based note-taking application inspired by Obsidian and Joplin, designed to be lightweight with minimal moving parts and markdown-first with dual editor support.

## Architecture

- **Backend**: FastAPI with direct filesystem access
- **Frontend**: Vue 3 (planned)
- **Storage**: Markdown files on the host filesystem
- **Real-time**: WebSocket-based synchronization (planned)

## Quick Start

### Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/) package manager
- A directory for your note vault

### Backend Setup

1. **Clone and navigate to the repository**:
   ```bash
   git clone <repository-url>
   cd kbase
   ```

2. **Set up your vault directory**:
   ```bash
   mkdir -p ~/kbase-vault
   # Add some test markdown files if desired
   echo "# Welcome to KBase" > ~/kbase-vault/welcome.md
   ```

3. **Install dependencies and run the backend**:
   ```bash
   cd backend
   uv sync  # Install main dependencies
   uv pip install -e ".[dev]"  # Install dev dependencies
   VAULT_PATH=~/kbase-vault uv run python -m app.main
   ```

4. **Access the API**:
   - API Documentation: http://localhost:8000/docs
   - Alternative Docs: http://localhost:8000/redoc
   - Health Check: http://localhost:8000/health

### Using Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
cd backend
cp env.example .env
# Edit .env and set your VAULT_PATH
```

Then run:
```bash
uv run python -m app.main
```

## API Endpoints

- `GET /api/v1/notes/` - List all notes (tree structure)
- `GET /api/v1/notes/{path}` - Get note content
- `POST /api/v1/notes/{path}` - Create note
- `PUT /api/v1/notes/{path}` - Update note
- `DELETE /api/v1/notes/{path}` - Delete note

## Development

### Backend Development

1. **Install development dependencies**:
   ```bash
   cd backend
   uv sync
   uv pip install -e ".[dev]"
   ```

2. **Run tests**:
   ```bash
   uv run pytest -v
   ```

3. **Run with auto-reload**:
   ```bash
   VAULT_PATH=~/kbase-vault uv run uvicorn app.main:app --reload
   ```

### Project Structure

```
kbase/
├── backend/                 # FastAPI backend
│   ├── app/                # Application code
│   ├── tests/              # Test suite
│   ├── requirements.txt    # Python dependencies
│   └── README.md          # Backend documentation
├── docs/                   # Architecture documentation
└── README.md              # This file
```

## Configuration

The backend uses environment variables for configuration:

- `VAULT_PATH` (required): Path to the note vault directory
- `HOST` (optional): Server host (default: 0.0.0.0)
- `PORT` (optional): Server port (default: 8000)

## Security Features

- Path traversal protection
- File type validation (markdown only)
- Input sanitization
- CORS configuration

## Testing

Run the comprehensive test suite:

```bash
cd backend
uv run pytest -v
```

The test suite includes:
- API endpoint testing
- Path traversal protection
- File CRUD operations
- Error handling
- Security validation

## Future Features

- Vue 3 frontend with dual editor support
- WebSocket real-time synchronization
- Authentication and user management
- Database caching for large vaults
- Search functionality with ripgrep
- PWA capabilities

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

[Add your license here]
