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
- **Code Editor**: Monaco Editor (VS Code editor)
- **WYSIWYG Editor**: TipTap (Markdown-based rich text editor)
- **Future**: WebSocket Client, PWA features

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
- `GET /notes/search/` - Omni-search (content, fuzzy, with snippets, sorted by modified date)
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

**SearchService** (integrated in `backend/app/services/file_service.py`):

- Execute ripgrep for content search with line numbers
- Returns up to 3 matching lines per file with snippets
- Fuzzy, case-insensitive search across file content and filenames
- All space-separated phrases in query must match
- Combines filename matching with content search
- Fallback to Python-based search when ripgrep unavailable

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
│   ├── common/
│   │   ├── ConfirmDialog.vue       # Reusable confirmation dialog
│   │   └── InputDialog.vue         # Reusable input dialog for user input
│   ├── editor/
│   │   ├── MonacoEditor.vue        # Monaco code editor wrapper
│   │   ├── TipTapEditor.vue        # TipTap WYSIWYG markdown editor
│   │   └── TipTapToolbar.vue       # Formatting toolbar for TipTap editor
│   ├── layout/
│   │   └── AppLayout.vue           # Main layout wrapper
│   ├── sidebar/
│   │   ├── ContextMenu.vue         # Context menu for file operations
│   │   ├── FileExplorerToolbar.vue # Toolbar with New File/Folder/Refresh buttons
│   │   ├── FileTree.vue            # Recursive tree component
│   │   ├── FileTreeNode.vue        # Individual tree node
│   │   └── Sidebar.vue             # Sidebar container
│   └── viewer/
│       ├── NoteViewer.vue          # Note viewer with editor/preview toggle
│       └── ViewerToolbar.vue       # Toolbar with view mode toggle
├── stores/
│   ├── auth.ts                     # JWT & login state
│   └── vault.ts                    # File tree & note update state
├── router/
│   ├── index.ts                    # Route definitions
│   └── guards.ts                   # Auth guards
├── types/
│   └── index.ts                    # TypeScript type definitions
├── utils/
│   └── languageDetection.ts        # File extension to language mapping
└── views/
    ├── LoginView.vue               # Login page
    └── HomeView.vue                # Main app view
```

**Component Structure**:

- **Editor Components**:
  - `MonacoEditor.vue`: Monaco code editor wrapper with auto-save and syntax highlighting
  - `TipTapEditor.vue`: TipTap WYSIWYG markdown editor with auto-save and rich text features
  - `TipTapToolbar.vue`: Rich formatting toolbar for TipTap with buttons for bold, italic, headings, lists, code blocks, etc.
  - `ViewerToolbar.vue`: Toolbar with icon-based view mode toggle and save status
  - `NoteViewer.vue`: Orchestrates dual-editor system with bidirectional sync
- **Layout Components**:
  - `AppLayout.vue`: Main application layout
  - `Sidebar.vue`: File tree sidebar container
  - `FileTree.vue`: Hierarchical file tree display
  - `FileTreeNode.vue`: Individual tree node rendering with drag-and-drop, context menus, and inline rename
  - `FileExplorerToolbar.vue`: Toolbar positioned at top of sidebar with create and refresh actions
- **Common Components**:
  - `ConfirmDialog.vue`: Reusable confirmation modal for destructive actions
  - `InputDialog.vue`: Reusable input dialog with validation for user text input
  - `ContextMenu.vue`: Right-click context menu with customizable items
  - `OmniSearch.vue`: Modal search interface with content snippets and line numbers

**State Management (Pinia)**:

- `authStore`: User session, JWT token management, login/logout
- `vaultStore`: File tree state, selected note, loading states, expanded paths, note updates, save state, sorting preferences
  - **File Operations**: `deleteFile()`, `renameFile()`, `moveFile()`, `createNote()`
  - **Directory Operations**: `deleteDirectory()`, `renameDirectory()`, `moveDirectory()`, `createDirectory()`
  - **Sorting**: `setSortBy()`, `setSortOrder()`, `toggleSortOrder()`, `sortedFileTree` (computed)
    - Supports sorting by name, created date, and modified date
    - Maintains folder-first ordering in all sort modes
    - Sort preferences persisted to localStorage
  - **Tree Navigation**: `collapseAll()`, `hasExpandedPaths` (computed)
  - **UI State**: `isSidebarCollapsed`, `toggleSidebar()`
    - Global sidebar visibility state for collapse/expand functionality
    - Accessible across components for coordinated UI updates
    - **Auto-Expansion**: Vault root (`/`) is automatically expanded on initial load and after collapse operations
      - Ensures first-level files and folders are always visible for better UX
      - Improves discoverability of vault contents without requiring user interaction
    - Collapse all expanded directories with a single action (preserves root expansion)
    - Track expanded state for UI button disable/enable logic
  - All CRUD operations automatically refresh the file tree and handle selection updates
  - `createNote()` automatically opens newly created files in the editor

**Key Features** (Current MVP):

- **Authentication**: JWT-based login with password protection
- **Omni Search**: Fast, comprehensive search across all notes
  - **Modal Interface**: Keyboard-activated search modal (Ctrl+K / Cmd+K)
  - **Content Snippets**: Shows up to 3 matching lines per file with line numbers
  - **Search Highlighting**: Matched search terms highlighted in yellow within snippets
  - **Keyboard Navigation**: Full keyboard support for power users
    - Arrow keys (↑/↓) navigate through results with wrap-around
    - Enter opens the selected result
    - First result auto-selected when results appear
    - Selection resets to first item on new search
    - Visual indication of selected item with blue highlight
  - **Fuzzy Search**: Case-insensitive, flexible partial matching
  - **Multi-phrase Search**: All space-separated phrases must match
  - **File & Content Search**: Searches both filenames and file contents
  - **Real-time Results**: Debounced search with instant visual feedback
  - **Line Numbers**: Monospace-formatted snippets show exact match locations
  - **XSS Protection**: HTML-escaped content prevents security vulnerabilities
  - **Performance**: Uses ripgrep for fast search, limited to 50 results
  - **Smart Sorting**: Results automatically sorted by last modified date (most recent first)
    - Helps surface recently updated files for better relevance
- **File Explorer**: Advanced file management with full CRUD operations
  - Hierarchical tree view with expand/collapse functionality
    - **Default Expansion**: Vault root is auto-expanded to show first-level items by default
    - Provides immediate visibility of top-level files and folders on page load
    - Collapse All action resets nested directories but preserves first-level visibility
    - **Directory Item Counts**: Each directory shows total count of nested items (files + subdirectories)
      - Recursive counting of all children at any depth
      - Displayed in lighter color (#9ca3af) with smaller font (0.75rem)
      - Format: `(123)` next to directory name
      - Helps users understand directory size at a glance
  - **File Explorer Toolbar**: Quick access toolbar at the top of the sidebar
    - **New Folder Button**: Create new folders at root level with input validation
    - **New File Button**: Create new markdown files at root level with input validation
    - **Refresh Button**: Manually refresh the file tree (disabled during loading)
    - **Sort Controls**: 
      - **Sort Order Toggle**: Switch between ascending/descending sort order
      - **Sort Criteria Dropdown**: Choose sort method (Name, Created Date, Modified Date)
      - Sort preferences persist in localStorage across sessions
      - Folders always appear before files in sorted results
      - Sorting applies recursively to all nested folders
    - **Collapse All Button**: Quickly collapse all expanded directories
      - Always visible in toolbar (disabled when no directories are expanded)
      - Provides instant reset of tree view to collapsed state
      - Useful for navigating large directory structures
    - Input validation prevents path traversal attacks and invalid characters
    - Auto-appends `.md` extension for new files
  - **Drag & Drop**: Drag files and directories into other directories to move them
  - **Context Menus**: Right-click on files/directories for operations
    - Delete (with confirmation)
    - Rename (inline editing)
    - Move to Root
  - **Inline Rename**: Double-click file/directory names to rename
  - **Delete Confirmation**: Safety dialogs for all delete operations
  - **Recursive Directory Deletion**: Delete directories with all contents (with confirmation)
  - **Input Validation**: All file and folder names validated for security
    - Prevents path traversal (no `../` or absolute paths)
    - Blocks reserved system names (CON, PRN, AUX, etc.)
    - Validates against invalid characters
- **Dual-Editor System**: Toggle between Monaco code editor and TipTap WYSIWYG editor
  - **Code Mode (Monaco)**: Full-featured code editor with syntax highlighting for all text-based files
    - Auto-save functionality (1 second debounce)
    - Syntax highlighting for 30+ languages
    - Dark theme matching VS Code
    - Language detection from file extensions
  - **Markdown Mode (TipTap)**: WYSIWYG rich text editor for markdown files
    - Auto-save functionality (1 second debounce, matching Monaco)
    - Rich text editing with live preview
    - Task list support with interactive checkboxes
      - Improved vertical alignment for better readability
      - Checkbox and text properly centered on the same baseline
    - Tab/Shift-Tab for list indentation
    - Custom markdown serialization
    - Bidirectional sync with Monaco editor
  - **Smart Defaults**: Automatically selects TipTap for .md files, Monaco for other file types
  - **Icon-Based Toggle**: Single toggle button with dynamic icon - shows `</>` when in Monaco (Code) mode, `Md` when in TipTap (Markdown) mode
- **Auto-Save**: Automatic saving with visual feedback (saving/saved/error states)
- **Sidebar Toggle**: Collapsible file explorer for maximizing editor space
  - Toggle button in toolbar (left side, before file name)
  - Smooth animation (0.3s ease) for collapse/expand
  - Icon changes direction: `«` (hide) / `»` (show)
  - State managed in vault store for global access
  - Useful for distraction-free writing or small screens
- **Responsive Design**: Clean, modern interface with mobile support
- **Error Handling**: Comprehensive error states and user feedback

**Future Features**:

- **Search Enhancements**: Context lines around matches, jump to line on click, more advanced filtering
- **Performance Optimized**: Handles large vaults (4000+ files) with lazy loading
- **Conflict Resolution**: Modal on save conflict with diff view
- **Image Paste**: Intercept paste events, upload to backend, insert markdown
- **PWA**: Offline viewing of cached notes, background sync

### 5. Configuration System

**Configuration Management** (`backend/app/config.py`):

The application uses Pydantic Settings for type-safe configuration management with environment variables loaded from a `.env` file.

**Required Environment Variables**:
- `VAULT_PATH` - Path to the note vault directory (supports tilde expansion, e.g., `~/kbase-vault`)
- `SECRET_KEY` - Secret key for JWT token signing (generate with: `openssl rand -hex 32`)
- `PASSWORD` - Plain text password for authentication

**Optional Environment Variables**:
- `HOST` - Server host (default: `0.0.0.0`)
- `PORT` - Server port (default: `8000`)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Token expiration time (default: `30`)
- `ALGORITHM` - JWT signing algorithm (default: `HS256`)
- `APP_NAME` - Application name (default: `KBase`)
- `APP_VERSION` - Application version (default: `0.1.0`)

**Configuration Features**:
- **Path Validation**: Vault path is validated at startup to ensure it exists and is a directory
- **Path Expansion**: Supports tilde (`~`) expansion for home directory paths
- **Type Safety**: All configuration values are type-checked using Pydantic
- **Auto-loading**: `.env` file is automatically loaded from the backend directory

**Example `.env` file**:
```bash
VAULT_PATH=~/kbase-vault
SECRET_KEY=your-generated-secret-key-here
PASSWORD=your-secure-password
ACCESS_TOKEN_EXPIRE_MINUTES=30
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

**Monaco Editor Integration**:

The Monaco editor provides a professional code editing experience with syntax highlighting and auto-save.

1. **Component Architecture**:
   - `MonacoEditor.vue`: Wraps Monaco editor with Vue lifecycle
   - Lazy-loads Monaco library on component mount
   - Handles editor initialization, content synchronization, and cleanup
   
2. **Auto-Save Implementation**:
   - Debounced save (1000ms delay after last keystroke)
   - Emits `save` event with content to parent component
   - Parent (NoteViewer) calls vault store's `updateNote` action
   - Visual feedback via ViewerToolbar (saving/saved/error states)
   
3. **Language Detection**:
   - Utility function `detectLanguage(filename)` maps extensions to Monaco language IDs
   - Supports 30+ file types (markdown, javascript, python, json, etc.)
   - Falls back to 'plaintext' for unknown extensions
   - Updates language when file path changes
   
4. **Editor Configuration**:
   - Theme: VS Code dark theme (`vs-dark`)
   - Auto-layout enabled for responsive resize
   - Minimap enabled for navigation
   - Word wrap enabled for better readability
   - Tab size: 2 spaces
   - No custom toolbar (Monaco's built-in commands accessible via keyboard shortcuts)
   
5. **View Mode Toggle**:
   - ViewerToolbar provides toggle between "Editor" and "Preview" modes
   - Editor mode: Full Monaco editor for editing
   - Preview mode: Formatted text with metadata display
   - Mode state managed in NoteViewer component
   
6. **Save Status Flow**:
   ```
   User types → Debounce (1s) → Emit 'save' event → 
   NoteViewer sets status='saving' → Call updateNote API →
   Success: status='saved' (2s) → Clear status
   Error: status='error' (5s) → Clear status
   ```

7. **Performance Optimizations**:
   - Monaco library loaded only once and cached
   - Editor instance reused when switching files
   - ResizeObserver for efficient layout updates
   - Automatic cleanup on component unmount

**TipTap WYSIWYG Editor Integration**:

The TipTap editor provides a rich WYSIWYG markdown editing experience with bidirectional sync to the Monaco code editor.

1. **Component Architecture**:
   - `TipTapEditor.vue`: Wraps TipTap editor with Vue Composition API
   - Initialized with markdown content and converts to/from markdown on save
   - Handles editor initialization, content synchronization, and cleanup
   - Matches Monaco's API for seamless integration (same props and events)
   
2. **Auto-Save Implementation**:
   - Debounced save (1000ms delay after last edit, matching Monaco)
   - Emits `save` event with markdown content to parent component
   - Parent (NoteViewer) calls vault store's `updateNote` action
   - Visual feedback via ViewerToolbar (saving/saved/error states)
   
3. **Bidirectional Sync** (Simplified v-show Architecture):
   - Both editors share the same `editableContent` ref in NoteViewer via v-model
   - Uses `v-show` instead of `v-if` to keep both editors mounted simultaneously
   - Hidden editor has `disabled` prop set to `true`
   - Eliminates lifecycle complexity - no mount/unmount when switching editors
   - **Critical Fix**: `disabled` prop only prevents EMITTING, not RECEIVING updates
     - ✅ **Watchers**: No `disabled` check - both editors always receive updates
     - ✅ **Event Handlers**: Check `disabled` - only active editor emits changes
     - ✅ **Result**: Both editors stay perfectly in sync at all times
   - Simple, reliable sync with no complex flags or async timing issues:
     - Both editors receive ALL updates via watchers (always in sync)
     - Only active editor emits changes (prevents infinite loops)
     - Content comparison prevents redundant updates (simple `!==` check)
     - No `isUpdatingFromEditor`, `isSettingContent`, or `lastEmittedContent` flags needed
   - Fixed markdown serialization bug: List items now correctly extract text from paragraph nodes
   - Significantly reduced code complexity (~100 lines of flag management removed)
   - Seamless switching preserves all unsaved changes in both directions
   - Faster editor switching since no remounting is needed
   - **Zero data loss**: Text in lists, checkboxes, and all content types fully preserved
   
4. **TipTap Extensions**:
   - **StarterKit**: Core functionality (headings, bold, italic, lists, code, blockquotes, etc.)
   - **TaskList**: Container for checkbox lists
   - **TaskItem**: Interactive checkboxes with nested support
   - **Placeholder**: Shows "Start writing..." hint in empty editor
   - **Custom Tab Extension**: Keyboard shortcuts for list indentation
     - Tab: Indent list items (sink)
     - Shift-Tab: Outdent list items (lift)
     - Works with both regular lists and task lists
   
5. **Markdown Support**:
   - Custom markdown serializer for proper task list conversion
   - Converts between TipTap's internal format and markdown string
   - Preserves markdown syntax for checkboxes: `- [ ]` and `- [x]`
   - Maintains compatibility with standard markdown files
   
6. **Checkbox Features**:
   - Interactive checkboxes with click-to-toggle functionality
   - Proper vertical alignment of checkboxes and text
   - Support for nested task lists
   - Checkbox state persists to markdown as `[ ]` or `[x]`
   
7. **Formatting Toolbar**:
   - `TipTapToolbar.vue`: Rich formatting toolbar integrated into TipTap editor
   - Formatting options grouped logically with visual separators:
     - **Text Formatting**: Bold, Italic, Strikethrough, Inline Code
     - **Headings**: H1, H2, H3
     - **Lists**: Bullet List, Numbered List, Task List
     - **Blocks**: Blockquote, Code Block, Horizontal Rule
     - **History**: Undo, Redo
   - Active state highlighting for current formatting
   - Tooltips with keyboard shortcuts
   - Clean, modern design matching the overall app aesthetic
   
8. **Editor Styling**:
   - Clean, minimal interface with white background
   - Prose-friendly typography with proper heading sizes
   - Code blocks with dark theme (matching Monaco aesthetic)
   - Proper spacing for paragraphs, lists, and blockquotes
   - Responsive design for mobile and desktop
   
9. **Default Editor Selection**:
   - TipTap is default for `.md` files (markdown-first editing experience)
   - Monaco is default for all other file types (code-first editing)
   - Selection happens automatically in NoteViewer when file changes
   - Users can toggle between editors at any time via toolbar
   
10. **View Mode Toggle**:
   - ViewerToolbar provides single icon-based toggle button between editors
   - Toggle button icon changes to reflect current active editor:
     - When Monaco is active: Shows `</>` icon (click to switch to TipTap)
     - When TipTap is active: Shows `Md` icon (click to switch to Monaco)
   - Tooltips indicate the mode being switched to ("Switch to Markdown" / "Switch to Code")
   - Clean, minimal design with active state highlighting
   - Same save status display for both editors

**File Explorer CRUD Operations**:

The file explorer provides comprehensive file and directory management through an intuitive user interface.

1. **Drag & Drop Implementation**:
   - Native HTML5 drag-and-drop API
   - Visual feedback during drag operations (opacity change on dragging item, border highlight on drop target)
   - Drag any file or directory onto a target directory to move it
   - Prevents invalid operations (dropping on self, dropping parent into child)
   - Automatically refreshes file tree after successful drop
   - Uses JSON data transfer for cross-browser compatibility
   - **Auto-Expand Feature**:
     - Collapsed directories automatically expand after hovering for 600ms during drag
     - Timer is cancelled if drag leaves the directory before 600ms
     - Directories expand immediately upon successful drop if still collapsed
     - Timer cleanup on drag end prevents memory leaks
     - Only directories are auto-expanded; files are ignored
   
2. **Context Menu System**:
   - Right-click on any file or directory to open context menu
   - Context menu positioned at cursor with automatic viewport boundary detection
   - Click-outside or ESC key to close
   - Menu items:
     - **Rename**: Activates inline rename mode
     - **Move to Root**: Moves item to vault root directory
     - **Delete**: Shows confirmation dialog (styled as dangerous action)
   - Menu items styled with icons for better UX
   
3. **Inline Rename**:
   - Double-click any file/directory name to activate rename mode
   - Input field replaces name with current value pre-filled
   - Smart text selection (excludes file extension for files)
   - Confirm with Enter key, cancel with ESC key or blur
   - Validates new name before submission
   - Automatically refreshes file tree and updates selection after rename
   
4. **Delete Confirmation**:
   - Reusable `ConfirmDialog` component for all delete operations
   - Different messages for files vs directories
   - Directories: Warns about recursive deletion of all contents
   - Styled as dangerous action (red button)
   - Keyboard shortcuts: ESC to cancel, Enter to confirm
   - Prevents accidental deletions with clear messaging
   
5. **API Client Integration**:
   - Dedicated methods for all CRUD operations
   - `deleteFile()`, `renameFile()`, `moveFile()` for file operations
   - `deleteDirectory()`, `renameDirectory()`, `moveDirectory()`, `createDirectory()` for directory operations
   - Proper error handling with user-friendly error messages
   - Automatic path encoding for URL safety
   
6. **Vault Store CRUD Actions**:
   - All operations integrated into vault store for centralized state management
   - Automatic file tree refresh after any CRUD operation
   - Smart selection handling:
     - Clear selection if deleted file was selected
     - Update selection if renamed file was selected
     - Clear selection if it was inside a moved/deleted directory
   - Error state management with descriptive error messages
   - Loading state management for better UX

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
8. **Directory Item Counting**: Recursive counting computed on-demand in Vue components
   - Uses computed properties for reactive updates
   - Counting happens client-side during tree rendering
   - Efficient for typical vault sizes (< 5000 files)
   - Minimal performance impact due to Vue's caching mechanism
9. **Search Result Sorting**: Results sorted by modified date on backend
   - Sorting done once before sending to frontend
   - No additional frontend processing needed
   - Helps surface most relevant (recent) files first

### Performance Benchmarks

- **API Response Time**: 5-10 seconds → 50-100ms (50-100x faster)
- **UI Load Time**: 10+ seconds → <1 second (10x faster)  
- **Memory Usage**: 40x reduction with lazy loading
- **Large Vault Support**: Tested with 4000+ files

