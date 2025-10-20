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
- **WYSIWYG Editor**: Milkdown (ProseMirror-based, image support)
- **Code Editor**: Monaco Editor (VSCode engine)
- **UI Components**: Consider Vuetify/PrimeVue or build custom
- **WebSocket Client**: Native WebSocket API
- **PWA**: Vite PWA plugin for service worker & manifest
- **Build Tool**: Vite

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

- `POST /auth/login` - Authenticate user
- `POST /auth/refresh` - Refresh JWT token
- `GET /notes` - List all notes (returns tree structure)
- `GET /notes/{path}` - Get note content
- `POST /notes/{path}` - Create note
- `PUT /notes/{path}` - Update note (with conflict detection)
- `DELETE /notes/{path}` - Delete note
- `POST /notes/{path}/move` - Move/rename note 
- `POST /search` - Omni-search (content, fuzzy)
- `GET /config` - Get public config settings

**WebSocket Endpoint** (`/ws`):

- Pushes file change events: `{type: 'file_changed|created|deleted', path: '...'}`
- Client subscribes after authentication

### 3. Core Backend Services

**DatabaseService** (`backend/app/services/db_service.py`):

- SQLite-based metadata cache for performance optimization
- Indexes file tree structure
- Provides fast hierarchical file tree queries
- Auto-rebuilds index when filesystem changes are detected
- Handles large vaults (4000+ files) efficiently

**FileService** (`backend/app/services/file_service.py`):

- CRUD operations on markdown files
- Conflict detection (compare mtime before write)
- Move/rename 
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

**Component Structure**:

```
src/
├── components/
│   ├── editor/
│   │   ├── MilkdownEditor.vue      # WYSIWYG editor
│   │   ├── MonacoEditor.vue        # Code editor
│   │   └── EditorTabs.vue          # Tab management with pin
│   ├── sidebar/
│   │   ├── FileExplorer.vue        # Tree view of notes
│   │   └── Sidebar.vue             # Container
│   ├── search/
│   │   └── OmniSearch.vue          # Modal search (Ctrl+K)
│   └── layout/
│       └── AppLayout.vue           # Main layout
├── stores/
│   ├── auth.ts                     # JWT & login state
│   ├── notes.ts                    # Open notes, active note
│   ├── vault.ts                    # File tree state
│   └── websocket.ts                # WS connection management
├── composables/
│   ├── useApi.ts                   # API client wrapper
│   ├── useWebSocket.ts             # WebSocket handling
│   └── useKeyboard.ts              # Keyboard shortcuts
└── views/
    ├── LoginView.vue
    └── EditorView.vue              # Main app
```

**State Management (Pinia)**:

- `notesStore`: Open tabs, active note, pinned tabs, unsaved changes
- `vaultStore`: File tree
- `authStore`: User session, token refresh
- `websocketStore`: Connection state, reconnection logic

**Key Features**:

- **Omni Search**: Modal (Ctrl+K), filters as you type
- **File Explorer**: Hierarchical tree view with search/filter and lazy loading
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
2. **JWT Security**: httpOnly cookies, short expiry, refresh tokens
3. **File Upload**: Validate image types, size limits, sanitize filenames
4. **CORS**: Configure properly for frontend-backend communication

## PWA Features

1. **Service Worker**: Cache static assets, API responses
2. **Manifest**: App name, icons, theme colors
3. **Offline**: Show cached notes, queue edits for sync
4. **Install Prompt**: iOS and Android support

## Testing Strategy

- **Backend**: pytest with test vault fixtures
- **Frontend**: Vitest + Vue Test Utils
- **E2E**: Playwright for critical flows
- **Search**: Test ripgrep integration with sample notes

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

