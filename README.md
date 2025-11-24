# KBase

A web-based note-taking application inspired by Obsidian and Joplin, designed to be lightweight with minimal moving parts and markdown-first with dual editor support.

## Architecture

- **Backend**: FastAPI with direct filesystem access
- **Frontend**: Vue 3 with TypeScript and Pinia
- **Storage**: Markdown files on the host filesystem
- **Authentication**: JWT-based security
- **Real-time**: WebSocket-based synchronization (planned)

## Features

### File Management
- **Full CRUD Operations**: Create, read, update, delete files and directories
- **All File Types Supported**: Create and edit files with any extension or no extension
- **Binary File Safety**: Binary files are automatically detected and prevented from being opened in the browser
  - Detection via null byte check, UTF-8 validation, and file size limits (10MB max)
  - Prevents browser crashes and security issues
- **File Explorer Toolbar**: Quick access buttons above the file tree
  - **New File**: Create new files with any extension (validated input)
  - **New Folder**: Create new folders with validated input
  - Input validation prevents path traversal and invalid characters
- **Drag & Drop**: Drag files and directories into other directories to move them
- **Context Menus**: Right-click on any file or directory for quick actions
  - **History**: View and restore previous versions of files (files only)
- **Inline Rename**: Double-click any file/directory name to rename it
- **Delete Confirmation**: Safety dialogs for all delete operations with warnings for recursive deletion
- **Input Validation**: Security-focused validation for all file and folder names

### Editor
- **Monaco Editor**: Full-featured code editor with VS Code experience
  - Syntax highlighting for 30+ programming languages
  - Available for all file types
  - Used by default for non-markdown files
  - Undo/Redo: Ctrl+Z (undo), Ctrl+R or Ctrl+Y (redo)
- **Milkdown Editor**: WYSIWYG markdown editor (optional for .md files only)
  - WYSIWYG editing experience for markdown
  - CommonMark and GitHub Flavored Markdown support
  - Tab indentation: Tab key indents, Shift+Tab outdents
  - Undo/Redo: Ctrl+Z (undo), Ctrl+R or Ctrl+Y (redo)
  - Toggle between Monaco and Milkdown via toolbar button (only visible for .md files)
- **Auto-Save**: Optional automatic saving with 1-second debounce (both editors). Can be enabled/disabled via checkbox in the file explorer dropdown menu. Defaults to enabled. Manual save (Ctrl+S) works regardless of auto-save setting.
- **Save Status**: Visual feedback for saving/saved/error states
- **Editor Preference**: Per-file-type preference stored in localStorage
- **Image Support**: Paste images from clipboard or drag-and-drop to upload
  - Images stored in `/_resources` directory with automatic naming
  - Supports PNG, JPEG, GIF, WebP, SVG formats (up to 10MB)
  - Referenced with absolute paths for consistent access

### Security & Performance
- **JWT Authentication**: Secure token-based authentication
- **Path Security**: Protection against directory traversal attacks
- **Performance Optimized**: Handles large vaults (4000+ files) efficiently with database caching
- **Lazy Loading**: Initial display of 100 files with "Show More" option

### Backend Health Monitoring
- **Connection Status**: Real-time monitoring of backend server connectivity
- **Warning Banner**: Dismissible warning banner when backend is unreachable
- **Auto-Detection**: Automatically detects network errors vs authentication errors
- **Manual Retry**: Retry button to test connection immediately
- **Smart Dismissal**: Auto-dismisses when backend reconnects, reappears on new failures
- **Cross-Platform**: Works on both login screen and main editor interface

### Git Version Control
- **Automatic Versioning**: Vault directory is automatically version controlled with git
- **Auto-Initialization**: Git repository is initialized automatically if it doesn't exist
- **Periodic Commits**: All text files are committed every 5 minutes
- **Binary File Exclusion**: Binary files and `_resources/` directory are automatically excluded
- **Error Reporting**: Git errors are displayed in the web UI via health check endpoint
- **Low Impact**: Background task runs with minimal system load
- **History Tracking**: Full file history available for viewing and reverting changes
- **File History Viewing**: Right-click any file or tab to view its commit history
- **Version Restoration**: Restore any previous version of a file with automatic current state preservation
- **Commit Browser**: Browse all commits for a file with timestamps and commit messages
- **Safe Restore**: Current state is automatically saved before restoring, allowing easy reversion

### Progressive Web App (PWA)
- **Installable**: Add to home screen on mobile devices and desktop browsers
- **Offline Support**: Cache static assets and recently accessed notes
- **Mobile-Optimized**: Full responsive design with touch-friendly interfaces
- **Update Notifications**: Automatic detection and prompts for app updates
- **Native Feel**: Standalone mode provides app-like experience

## PWA Installation

### Android (Chrome)
1. Open KBase in Chrome browser
2. Tap the menu (☰) button
3. Select "Add to Home screen" or "Install app"
4. Confirm installation
5. Access KBase from your home screen like a native app

### iOS (Safari)
1. Open KBase in Safari browser
2. Tap the Share button (□↑)
3. Select "Add to Home Screen"
4. Edit the name if desired, then tap "Add"
5. KBase will appear on your home screen

### Desktop (Chrome/Edge/Firefox)
1. Look for the install banner at the top of the browser
2. Click "Install" or use the install icon in the address bar
3. KBase will open as a standalone window
4. Access it from your applications menu

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) package manager
- A directory for your note vault

### Quick Start (Single Command)

For the fastest way to get started, you can run both frontend and backend together:

1. **Install all dependencies**:
   ```bash
   npm run install:all
   ```

2. **Set up your environment**:
   ```bash
   # Create vault directory
   mkdir -p ~/kbase-vault
   echo "# Welcome to KBase" > ~/kbase-vault/welcome.md
   
   # Configure backend
   cd backend
   cp env.example .env
   # Edit .env and set VAULT_PATH, SECRET_KEY, and PASSWORD
   cd ..
   ```

3. **Start both frontend and backend**:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000/docs

**Note**: The backend requires a `.env` file with `VAULT_PATH`, `SECRET_KEY`, and `PASSWORD` configured.

### Quick Start (Podman Compose Build)

Use this workflow when you want Podman to build the image locally and manage the container with Compose.

1. **Create a vault directory** (Podman prefers absolute paths):
   ```bash
   mkdir -p "$HOME/kbase-vault"
   echo "# Welcome to KBase" > "$HOME/kbase-vault/welcome.md"
   ```
2. **Copy the sample compose file**:
   ```bash
   cp compose.example.yaml compose.yaml
   ```
3. **Update secrets in `compose.yaml`**:
   - Replace the `SECRET_KEY` placeholder with a value from `openssl rand -hex 32`
   - Set a strong `PASSWORD`
4. **Build the image with Podman Compose**:
   ```bash
   podman-compose -f compose.yaml build
   ```
5. **Run the stack**:
   ```bash
   podman-compose -f compose.yaml up -d
   ```
6. **Access KBase** at http://localhost:8000 and sign in with the password you configured.

To stop everything later, run:
```bash
podman-compose -f compose.yaml down
```

### Podman Compose Helper Script

- Use `bash scripts/rebuild-container.sh` to stop, rebuild, and restart the stack via Podman Compose.
- The script must be run from within the repository and assumes `compose.yaml` (or `compose.yml`) exists at the project root.

## Docker Deployment

KBase is available as a pre-built Docker image from GitHub Container Registry (GHCR). This is the easiest way to deploy KBase in production.

### Quick Docker Setup

1. **Pull the latest image**:
   ```bash
   docker pull ghcr.io/yourusername/kbase:latest
   ```

2. **Create your vault directory**:
   ```bash
   mkdir -p ~/kbase-vault
   echo "# Welcome to KBase" > ~/kbase-vault/welcome.md
   ```

3. **Run the container**:
   ```bash
   docker run -d \
     --name kbase \
     -p 8000:8000 \
     -v ~/kbase-vault:/app/vault \
     -e VAULT_PATH=/app/vault \
     -e SECRET_KEY=$(openssl rand -hex 32) \
     -e PASSWORD=your-secure-password \
     ghcr.io/yourusername/kbase:latest
   ```

4. **Access the application**:
   - Open http://localhost:8000 in your browser
   - Login with the password you set in the `PASSWORD` environment variable

### Docker Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VAULT_PATH` | Yes | Path to your notes directory inside the container | `/app/vault` |
| `DISABLE_AUTH` | No | Disable authentication (for development/local use only, default: false) | `false` |
| `SECRET_KEY` | Yes* | JWT signing key (generate with `openssl rand -hex 32`) | `a1b2c3d4e5f6...` |
| `PASSWORD` | Yes* | Login password for the application | `my-secure-password` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Token expiration time in minutes (default: 10080) | `10080` |
| `HOST` | No | Server host (default: 0.0.0.0) | `0.0.0.0` |
| `PORT` | No | Server port (default: 8000) | `8000` |

*Required only if `DISABLE_AUTH=false` (authentication enabled)

### Docker Compose Example

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  kbase:
    image: ghcr.io/yourusername/kbase:latest
    container_name: kbase
    ports:
      - "8000:8000"
    volumes:
      - ./vault:/app/vault
    environment:
      - VAULT_PATH=/app/vault
      - SECRET_KEY=your-secret-key-here
      - PASSWORD=your-password-here
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Run with:
```bash
docker-compose up -d
```

### Production Considerations

- **Security**: Change the default password and secret key
- **Volumes**: Mount your vault directory to persist data
- **Networking**: Use reverse proxy (nginx/traefik) for HTTPS
- **Updates**: Pull new images regularly for security updates
- **Backups**: Regularly backup your vault directory

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
- `GET /api/v1/notes/{path}/history` - Get commit history for a file
- `GET /api/v1/notes/{path}/history/{commit_hash}` - Get file content at specific commit
- `POST /api/v1/notes/{path}/history/commit` - Commit current state of file
- `POST /api/v1/notes/{path}/history/restore` - Restore file from commit

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

**Option 1: Single Command (Recommended)**

Start both frontend and backend together:
```bash
npm run dev
```

This will run both services concurrently with colored output to distinguish between them.

**Option 2: Separate Terminals**

If you prefer to run them separately:

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

**Access application**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/docs

### Available NPM Scripts

The root `package.json` provides convenient scripts for development:

- `npm run dev` - Start both frontend and backend in parallel
- `npm run dev:backend` - Start only the backend server
- `npm run dev:frontend` - Start only the frontend dev server
- `npm run install:all` - Install dependencies for both frontend and backend
- `npm run test` - Run all tests (backend and frontend)
- `npm run test:backend` - Run backend tests only
- `npm run test:frontend` - Run frontend tests only

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
├── package.json           # Root-level scripts for full-stack development
└── README.md              # This file
```

## Configuration

The backend uses environment variables for configuration:

- `VAULT_PATH` (required): Path to the note vault directory
- `DISABLE_AUTH` (optional): Disable authentication (defaults to `true` in dev mode, `false` in production)
  - Development mode is automatically detected when `ENV=development`, `ENVIRONMENT=development`, or `DEBUG=true`
  - When authentication is disabled, `SECRET_KEY` and `PASSWORD` are not required
  - All endpoints become accessible without authentication
  - Can be explicitly set to override automatic detection
  - **Warning**: Only use disabled auth for local development, never in production
- `SECRET_KEY` (required if auth enabled): Secret key for JWT token signing
- `PASSWORD` (required if auth enabled): Plain text password for authentication
- `ACCESS_TOKEN_EXPIRE_MINUTES` (optional): Token expiration time (default: 10080 = 7 days)
- `HOST` (optional): Server host (default: 0.0.0.0)
- `PORT` (optional): Server port (default: 8000)

## Security Features

- JWT Authentication for all API endpoints (except public ones, configurable via `DISABLE_AUTH`)
- Optional authentication disable for development/local use
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

- WebSocket real-time synchronization for live collaboration
- Image upload and management
- Advanced markdown features (tables, task lists, etc.)
- Tags and categories

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
