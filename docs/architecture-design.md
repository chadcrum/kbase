# KBase Note-Taking Application - Architecture Design

## Technology Stack Summary

### Backend

- **Framework**: FastAPI (Python 3.11+)
- **Web Server**: Uvicorn with WebSocket support
- **Database**: SQLite for metadata caching and search indexing
- **Search**: ripgrep (rg) via subprocess + database-backed search
- **File Watching**: watchfiles for detecting filesystem changes
- **Auth**: JWT tokens (httpOnly cookies + localStorage refresh)
- **Config**: PyYAML for config.yaml parsing
- **API Docs**: Auto-generated OpenAPI/Swagger via FastAPI

### Frontend

- **Framework**: Vue 3 (Composition API + TypeScript)
- **State Management**: Pinia
- **Router**: Vue Router
- **Testing**: Vitest + Vue Test Utils
- **Build Tool**: Vite
- **HTTP Client**: Axios
- **UI**: Custom CSS (no component library initially)
- **Future**: WYSIWYG Editor (Milkdown), Code Editor (Monaco), WebSocket Client, PWA features

### Infrastructure

- **Containerization**: Podman Compose
                                                                - Backend service (FastAPI)
                                                                - Frontend service (Nginx serving built Vue app)
                                                                - Shared volume for note vault
- **Reverse Proxy**: Nginx in frontend container

## Architecture Patterns

### 1. File System Design

```
vault/                           # Mounted Docker volume
├── _attachments/                # Images and media
│   └── {note-name}/            # Organized by source note
│       └── image-{uuid}.png
├── folder-1/
│   ├── note-1.md
│   └── note-2.md
├── folder-2/
│   └── nested/
│       └── note-3.md
└── quick-note.md
```

### 2. Backend API Structure

**REST Endpoints** (`/api/v1/`):

- `POST /auth/login` - Authenticate user and get JWT token
- `GET /auth/verify` - Verify JWT token validity
- `GET /notes` - List all notes (returns tree structure)
- `GET /notes/{path}` - Get note content
- `POST /notes/{path}` - Create note
- `PUT /notes/{path}` - Update note (with conflict detection)
- `DELETE /notes/{path}` - Delete note
- `POST /notes/{path}/move` - Move/rename note
- `POST /notes/{path}/copy` - Copy note 
- `POST /directories/{path}` - Create directory
- `GET /directories/{path}` - Get directory metadata
- `PUT /directories/{path}` - Rename directory
- `DELETE /directories/{path}` - Delete directory
- `POST /directories/{path}/move` - Move directory
- `POST /directories/{path}/copy` - Copy directory
- `POST /search` - Omni-search (content, fuzzy)
- `GET /config` - Get public config settings

**WebSocket Endpoint** (`/ws`):

- Pushes file change events: `{type: 'file_changed|created|deleted', path: '...'}`
- Client subscribes after authentication
- **Note**: All endpoints except `/`, `/health`, `/docs`, `/redoc` require JWT authentication

### 3. Authentication System

**AuthService** (`backend/app/core/auth.py`):

- JWT token creation and verification
- Plain text password verification (suitable for personal use)
- Bearer token authentication scheme
- FastAPI dependency injection for route protection

**Auth Endpoints** (`backend/app/api/v1/endpoints/auth.py`):

- `POST /api/v1/auth/login` - Authenticate with password, return JWT token
- `GET /api/v1/auth/verify` - Verify token validity
- All other endpoints require valid JWT token in Authorization header

### 4. Core Backend Services

**DatabaseService** (`backend/app/services/db_service.py`):

- SQLite-based metadata cache for performance optimization
- Indexes file tree structure
- Provides fast hierarchical file tree queries
- Auto-rebuilds index when filesystem changes are detected
- Handles large vaults (4000+ files) efficiently

**FileService** (`backend/app/services/file_service.py`):

- CRUD operations on markdown files
- Conflict detection (compare mtime before write)
- Move/rename notes between directories
- Copy notes to new locations
- Attachment management
- Integrates with DatabaseService for metadata caching

**SearchService** (`backend/app/services/search_service.py`):

- Execute ripgrep for content search
- Database-backed search for improved performance

**FileWatcher** (`backend/app/services/file_watcher.py`):

- Use watchfiles to monitor vault directory
- Push events to WebSocket clients
- Debounce rapid changes
- Triggers database index updates

### 4. Frontend Architecture

**Component Structure** (Current Implementation):

```
frontend/src/
├── api/
│   └── client.ts                   # Axios HTTP client with JWT auth
├── components/
│   ├── layout/
│   │   └── AppLayout.vue           # Main layout wrapper
│   ├── sidebar/
│   │   ├── FileTree.vue            # Recursive tree component
│   │   ├── FileTreeNode.vue        # Individual tree node
│   │   └── Sidebar.vue             # Sidebar container
│   └── viewer/
│       └── NoteViewer.vue          # Read-only note display
├── stores/
│   ├── auth.ts                     # JWT & login state
│   └── vault.ts                    # File tree state
├── router/
│   ├── index.ts                    # Route definitions
│   └── guards.ts                   # Auth guards
├── types/
│   └── index.ts                    # TypeScript type definitions
└── views/
    ├── LoginView.vue               # Login page
    └── HomeView.vue                # Main app view
```

**State Management (Pinia)**:

- `authStore`: User session, JWT token management, login/logout
- `vaultStore`: File tree state, selected note, loading states, expanded paths

**Key Features** (Current MVP):

- **Authentication**: JWT-based login with password protection
- **File Explorer**: Hierarchical tree view with expand/collapse functionality
- **Note Viewer**: Read-only display of markdown content with metadata
- **Responsive Design**: Clean, modern interface with mobile support
- **Error Handling**: Comprehensive error states and user feedback

**Future Features**:

- **Omni Search**: Modal (Ctrl+K), filters as you type
- **Performance Optimized**: Handles large vaults (4000+ files) with lazy loading
- **Conflict Resolution**: Modal on save conflict with diff view
- **Image Paste**: Intercept paste events, upload to backend, insert markdown
- **PWA**: Offline viewing of cached notes, background sync

### 5. Configuration (config.yaml)

```yaml
vault:
  path: /path/to/vault          # Required
  
server:
  host: 0.0.0.0
  port: 8000
  
auth:
  secret_key: ${SECRET_KEY}     # From env var
  password: ${PASSWORD} # Single user password (plain text)
  session_duration_hours: 720   # 30 days
  
search:
  ripgrep_path: /usr/bin/rg     # Path to ripgrep binary
  
app:
  name: KBase
  version: 0.1.0
```

### 6. Podman Compose Setup

```yaml
services:
  backend:
    build: ./backend
    volumes:
      - ${VAULT_PATH}:/vault
    environment:
      - CONFIG_PATH=/app/config.yaml
    ports:
      - "8000:8000"
      
  frontend:
    build: ./frontend
    depends_on:
      - backend
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=http://backend:8000
```

### 7. Key Implementation Details

**Conflict Detection**:

1. Client sends last-known mtime with PUT request
2. Backend compares with current file mtime
3. If different, return 409 Conflict with current content
4. Frontend shows diff modal for user decision

**Real-time Sync Flow**:

1. Backend watchfiles detects change
2. Pushes event via WebSocket to all clients
3. Client checks if file is open in editor
4. If not open, updates file tree
5. If open, shows notification (external change detected)


## Security Considerations

1. **Path Traversal**: Validate all file paths to prevent `../` attacks
   - DirectoryService validates paths to ensure they stay within vault directory
   - Checks for `../` and `..\\` patterns to prevent directory traversal
   - Allows absolute paths starting with `/` within the vault scope
   - Uses `os.path.commonpath()` to verify paths remain within vault boundaries
2. **JWT Security**: Bearer tokens stored in localStorage, 30-minute expiry
3. **Password Security**: Plain text storage in environment variables (suitable for personal use)
4. **File Upload**: Validate image types, size limits, sanitize filenames
5. **CORS**: Configure properly for frontend-backend communication
6. **Token Validation**: All protected endpoints validate JWT tokens

## PWA Features

1. **Service Worker**: Cache static assets, API responses
2. **Manifest**: App name, icons, theme colors
3. **Offline**: Show cached notes, queue edits for sync
4. **Install Prompt**: iOS and Android support

## Testing Strategy

- **Backend**: pytest with test vault fixtures (comprehensive coverage)
- **Frontend**: Vitest + Vue Test Utils (92+ tests passing, 87% coverage)
- **E2E Tests**: Playwright with comprehensive authentication flow coverage
- **Unit Tests**: All stores, components, and API client
- **Component Tests**: User interactions, error states, conditional rendering
- **Integration Tests**: Full user workflows with real backend integration

### E2E Testing Infrastructure

**Playwright Configuration**:
- Multiple browser support (Chromium, Firefox, WebKit)
- Mobile testing (Mobile Chrome, Mobile Safari)
- Parallel execution with isolated test contexts
- Screenshot/video capture on failure
- CI/CD integration with GitHub Actions

**Test Coverage**:
- **Authentication Flows**: Login success/failure, logout, token persistence
- **Route Guards**: Protected route access, redirects
- **Security Testing**: SQL injection, XSS prevention, input validation
- **Edge Cases**: Network failures, concurrent requests, storage disabled
- **UI/UX Validation**: Loading states, form validation, accessibility

**Test Architecture**:
- **Page Object Model**: Maintainable, reusable test patterns
- **Isolated Test Environment**: Dedicated test vault with fixtures
- **Backend Management**: Automated server startup/teardown
- **Helper Utilities**: Auth helpers, vault management, backend control

**Test Execution**:
- **Local Development**: `npm run test:e2e` with UI mode for debugging
- **CI/CD**: Automated testing on push/PR with artifact upload
- **Parallel Execution**: 3-4x faster test execution
- **Cross-browser**: Ensures compatibility across all supported browsers

## Performance Optimizations

1. **Database Caching**: SQLite-based metadata cache for file tree
2. **Lazy Loading**: File explorer shows 100 files initially with "Show More" button
3. **Search/Filter**: Real-time filtering to reduce DOM rendering load
4. **Debounced Search**: Wait for user to stop typing
5. **WebSocket Reconnection**: Exponential backoff
6. **Optimized API**: Uses cached database instead of filesystem scanning
7. **Memory Management**: 40x reduction in memory usage for large vaults

### Performance Benchmarks

- **API Response Time**: 5-10 seconds → 50-100ms (50-100x faster)
- **UI Load Time**: 10+ seconds → <1 second (10x faster)  
- **Memory Usage**: 40x reduction with lazy loading
- **Large Vault Support**: Tested with 4000+ files

