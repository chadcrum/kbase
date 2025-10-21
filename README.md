# KBase

A web-based note-taking application inspired by Obsidian and Joplin, designed to be lightweight with minimal moving parts and markdown-first with dual editor support.

## Architecture

- **Backend**: FastAPI with direct filesystem access
- **Frontend**: Vue 3 with TypeScript and Pinia
- **Storage**: Markdown files on the host filesystem
- **Authentication**: JWT-based security
- **Real-time**: WebSocket-based synchronization (planned)

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
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
   
   # Set up authentication (required)
   cp env.example .env
   # Edit .env and add your SECRET_KEY and PASSWORD
   
   # Generate a secret key (optional - you can use any string)
   openssl rand -hex 32
   
   # Run with all required environment variables
   VAULT_PATH=~/kbase-vault SECRET_KEY=your-secret-key-here PASSWORD=your-password-here uv run python -m app.main
   ```

4. **Access the API**:
   - API Documentation: http://localhost:8000/docs
   - Alternative Docs: http://localhost:8000/redoc
   - Health Check: http://localhost:8000/health
   - **Note**: All API endpoints except `/`, `/health`, `/docs`, `/redoc` require authentication

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env and ensure VITE_API_URL=http://localhost:8000
   ```

4. **Start the frontend**:
   ```bash
   npm run dev
   ```

5. **Access the application**:
   - Frontend: http://localhost:5173
   - Login with the password you set in the backend configuration

## Complete Setup Example

Here's a complete example from start to finish:

```bash
# 1. Clone repository
git clone <repository-url>
cd kbase

# 2. Create vault directory
mkdir -p ~/kbase-vault
echo "# Welcome to KBase" > ~/kbase-vault/welcome.md

# 3. Set up backend
cd backend
uv sync
uv pip install -e ".[dev]"

# 4. Generate secret key
SECRET_KEY=$(openssl rand -hex 32)
echo "Generated SECRET_KEY: $SECRET_KEY"

# 5. Set up environment
cp env.example .env
# Edit .env and set:
# VAULT_PATH=/home/user/kbase-vault
# SECRET_KEY=<the generated key>
# PASSWORD=my-secure-password

# 6. Run the server
uv run python -m app.main
```

## Authentication Example

Once the server is running, authenticate and use the API:

```bash
# Login to get JWT token
TOKEN=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"password": "my-secure-password"}' | jq -r '.access_token')

# Use the token to access protected endpoints
curl -X GET "http://localhost:8000/api/v1/notes/" \
     -H "Authorization: Bearer $TOKEN"
```

### Using Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
cd backend
cp env.example .env
# Edit .env and set your VAULT_PATH, SECRET_KEY, and PASSWORD
```

Example `.env` file:
```bash
VAULT_PATH=/home/user/kbase-vault
SECRET_KEY=your-secret-key-here
PASSWORD=your-password-here
```

Then run:
```bash
uv run python -m app.main
```

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

### Frontend Development

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Run tests**:
   ```bash
   npm run test
   ```

3. **Run with auto-reload**:
   ```bash
   npm run dev
   ```

### Full Stack Development

1. **Start backend** (terminal 1):
   ```bash
   cd backend
   VAULT_PATH=~/kbase-vault uv run uvicorn app.main:app --reload
   ```

2. **Start frontend** (terminal 2):
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000/docs

### Project Structure

```
kbase/
├── backend/                 # FastAPI backend
│   ├── app/                # Application code
│   ├── tests/              # Test suite
│   ├── requirements.txt    # Python dependencies
│   └── README.md          # Backend documentation
├── frontend/               # Vue 3 frontend
│   ├── src/               # Source code
│   ├── tests/             # Test suite
│   ├── package.json       # Node.js dependencies
│   └── README.md          # Frontend documentation
├── docs/                   # Architecture documentation
└── README.md              # This file
```

## Configuration

The backend uses environment variables for configuration:

- `VAULT_PATH` (required): Path to the note vault directory
- `SECRET_KEY` (required): Secret key for JWT token signing
- `PASSWORD` (required): Plain text password for authentication
- `ACCESS_TOKEN_EXPIRE_MINUTES` (optional): Token expiration time (default: 30)
- `HOST` (optional): Server host (default: 0.0.0.0)
- `PORT` (optional): Server port (default: 8000)

## Security Features

- JWT Authentication for all API endpoints (except public ones)
- Plain text password storage (suitable for personal use)
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
- Directory CRUD operations
- Error handling
- Security validation

## Current Features

- **Backend**: Complete REST API with authentication
- **Frontend**: Vue 3 application with file tree navigation and note viewing
- **Authentication**: JWT-based login system
- **File Management**: Full CRUD operations for notes and directories
- **Testing**: Comprehensive test suite (92+ tests, 87% coverage)

## Future Features

- Rich text editor with markdown support
- WebSocket real-time synchronization
- Global search functionality with ripgrep
- Database caching for large vaults
- PWA capabilities and offline support
- Image upload and management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT License

Copyright (c) 2024 KBase

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
