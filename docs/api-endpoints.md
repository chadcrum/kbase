# API Endpoints Documentation

This document provides detailed information about all available API endpoints in the KBase note-taking application.

## Base URL
All API endpoints are prefixed with `/api/v1/`

## Authentication
All endpoints (except login and config) require authentication via JWT token in the Authorization header using Bearer scheme, unless authentication is disabled via the `DISABLE_AUTH` environment variable.

### Configuration Endpoints (`/api/v1/config/`)

#### Get Config
- **GET** `/`
- **Description**: Get public configuration settings including authentication status
- **Response**:
```json
{
  "auth_enabled": true
}
```
- **Status Codes**: 
  - 200 (success)
- **Notes**:
  - This endpoint is always accessible (no authentication required)
  - Used by frontend to determine if authentication is required
  - When `auth_enabled` is `false`, all endpoints are accessible without authentication

### Authentication Endpoints (`/api/v1/auth/`)

#### Login
- **POST** `/login`
- **Description**: Authenticate and receive a JWT access token
- **Request Body**:
```json
{
  "password": "your-password",
  "remember_me": false
}
```
- **Parameters**:
  - `password` (required): The authentication password
  - `remember_me` (optional): If true, extends token expiration to 30 days (default: 7 days)
- **Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```
- **Status Codes**: 
  - 200 (success)
  - 401 (incorrect password)
- **Notes**:
  - Default token expiration: 7 days
  - With `remember_me=true`: 30 days
  - Token must be included in subsequent requests via `Authorization: Bearer <token>` header
  - Token is stored in localStorage by the frontend for persistent sessions

#### Verify Token
- **GET** `/verify`
- **Description**: Verify if the current JWT token is valid
- **Headers**: 
  - `Authorization: Bearer <token>`
- **Response**:
```json
{
  "valid": true
}
```
- **Status Codes**: 
  - 200 (valid token)
  - 401 (invalid/expired token)
- **Notes**:
  - Used by frontend on app initialization to restore session
  - Automatically called on page refresh to maintain login state

## Notes API (`/api/v1/notes/`)

### List Notes
- **GET** `/`
- **Description**: List all notes in a tree structure
- **Response**: Hierarchical file tree with directories and notes
- **Example Response**:
```json
{
  "name": "vault",
  "path": "/",
  "type": "directory",
  "created": 1640995200,
  "modified": 1640995200,
  "children": [
    {
      "name": "note1.md",
      "path": "/note1.md",
      "type": "file",
      "created": 1640995200,
      "modified": 1640995300
    },
    {
      "name": "folder1",
      "path": "/folder1",
      "type": "directory",
      "created": 1640995100,
      "modified": 1640995400,
      "children": [...]
    }
  ]
}
```
- **Notes**:
  - `created` and `modified` are Unix timestamps (seconds since epoch)
  - Timestamps are included for both files and directories
  - Timestamps are optional and may be `null` if not available

### Get Note
- **GET** `/{path}`
- **Description**: Get file content and metadata
- **Parameters**: 
  - `path` (path parameter): The file path (e.g., `note1.md`, `script.py`, `config.json`, or `file-without-extension`)
- **Response**: File content and metadata
- **Status Codes**: 
  - 200 (success)
  - 404 (file not found)
  - 400 (binary file or invalid path)
- **Example Response**:
```json
{
  "content": "# My Note\n\nThis is the note content.",
  "path": "/note1.md",
  "size": 45,
  "modified": 1640995200
}
```
- **Notes**:
  - Supports any file extension or no extension
  - Binary files are rejected with a 400 error
  - Files larger than 10MB are rejected to prevent browser crashes
  - Only UTF-8 text files can be opened

### Create Note
- **POST** `/{path}`
- **Description**: Create a new file
- **Parameters**: 
  - `path` (path parameter): The file path (any extension or no extension)
- **Request Body**:
```json
{
  "content": "# New Note\n\nThis is a new note."
}
```
- **Response**: Success message and path
- **Status Codes**: 200 (created), 409 (already exists), 400 (invalid path)
- **Notes**:
  - Supports any file extension or no extension
  - No automatic extension enforcement

### Update Note
- **PUT** `/{path}`
- **Description**: Update an existing file's content
- **Parameters**: 
  - `path` (path parameter): The file path
- **Request Body**:
```json
{
  "content": "# Updated Note\n\nThis is the updated content."
}
```
- **Response**: Success message and path
- **Status Codes**: 200 (updated), 404 (not found), 400 (invalid path or binary file)
- **Notes**:
  - Frontend editors (Monaco and Milkdown) implement auto-save with 1 second debounce
  - Changes are automatically saved after user stops typing
  - Save status feedback provided in UI (saving/saved/error states)
  - Milkdown editor available for markdown (.md) files as optional alternative to Monaco
  - Milkdown saves natively as markdown (no conversion needed)
  - Binary files cannot be updated (returns 400 error)

### Delete Note
- **DELETE** `/{path}`
- **Description**: Delete a note
- **Parameters**: 
  - `path` (path parameter): The note path
- **Response**: Success message and path
- **Status Codes**: 200 (deleted), 404 (not found), 400 (invalid path)

### Move Note
- **POST** `/{path}/move`
- **Description**: Move or rename a note to a new location
- **Parameters**: 
  - `path` (path parameter): The current note path
- **Request Body**:
```json
{
  "destination": "new-location/renamed-note.md"
}
```
- **Response**: Success message and new path
- **Status Codes**: 200 (moved), 404 (source not found), 409 (destination exists), 400 (invalid path)
- **Notes**: 
  - Can rename within same directory: `{"destination": "new-name.md"}`
  - Can move between directories: `{"destination": "folder/note.md"}`
  - Can move to root: `{"destination": "note.md"}`

### Copy Note
- **POST** `/{path}/copy`
- **Description**: Copy a note to a new location
- **Parameters**: 
  - `path` (path parameter): The source note path
- **Request Body**:
```json
{
  "destination": "new-location/copied-note.md"
}
```
- **Response**: Success message and new path
- **Status Codes**: 200 (copied), 404 (source not found), 409 (destination exists), 400 (invalid path)
- **Notes**: 
  - Original note is preserved
  - Destination path must not already exist
  - Parent directories are created automatically if they don't exist

### Search Notes
- **GET** `/search/`
- **Description**: Search for files by content and filename with content snippets
- **Query Parameters**:
  - `q` (required): Search query (space-separated phrases, all must match)
  - `limit` (optional): Maximum number of results (1-100, default: 50)
- **Response**: Search results with matching files and content snippets
- **Example Response**:
```json
{
  "results": [
    {
      "path": "/folder/note.md",
      "name": "note.md",
      "snippets": [
        {
          "line_number": 15,
          "content": "This line contains the search term"
        },
        {
          "line_number": 42,
          "content": "Another matching line with the term"
        }
      ],
      "modified": 1640995200
    }
  ],
  "total": 1
}
```
- **Status Codes**: 200 (success), 500 (search failed)
- **Notes**:
  - Search is case-insensitive and fuzzy
  - Searches across all file types (not just markdown)
  - Binary files are automatically filtered out from results
  - All space-separated phrases in query must match (either in filename or content)
  - Returns up to 3 matching lines per file with line numbers
  - Uses ripgrep for fast search, falls back to Python search if unavailable
  - Empty snippets array indicates filename-only match
  - Results are limited by the `limit` parameter (default 50)
  - Results sorted by modified date (most recent first)

### Get File History
- **GET** `/{path}/history`
- **Description**: Get commit history for a file
- **Parameters**: 
  - `path` (path parameter): The file path
- **Response**: List of commits with metadata
- **Example Response**:
```json
{
  "commits": [
    {
      "hash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
      "timestamp": 1640995200,
      "message": "Auto-commit: note.md",
      "is_current": true
    },
    {
      "hash": "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1",
      "timestamp": 1640995100,
      "message": "Auto-commit: note.md",
      "is_current": false
    }
  ]
}
```
- **Status Codes**: 
  - 200 (success)
  - 404 (file not found)
  - 400 (invalid path or git error)
- **Notes**:
  - Returns empty commits array if file has no git history
  - `is_current` indicates if commit matches current working tree version
  - Commits are ordered from most recent to oldest
  - Requires git to be initialized and available

### Get File Content at Commit
- **GET** `/{path}/history/{commit_hash}`
- **Description**: Get file content from a specific commit
- **Parameters**: 
  - `path` (path parameter): The file path
  - `commit_hash` (path parameter): The full commit hash
- **Response**: File content and commit metadata
- **Example Response**:
```json
{
  "content": "# My Note\n\nThis is the note content from that commit.",
  "hash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
  "timestamp": 1640995200
}
```
- **Status Codes**: 
  - 200 (success)
  - 404 (file or commit not found)
  - 400 (invalid path or commit hash)
- **Notes**:
  - Returns raw file content (no markdown rendering)
  - Use full commit hash (40 characters)
  - File must exist in the specified commit

### Commit File
- **POST** `/{path}/history/commit`
- **Description**: Commit the current state of a file
- **Parameters**: 
  - `path` (path parameter): The file path
- **Response**: Success message and path
- **Status Codes**: 
  - 200 (committed or no changes)
  - 404 (file not found)
  - 400 (invalid path or git error)
- **Notes**:
  - Ensures current state is saved before restore operations
  - Creates commit with message "Auto-commit: {filename}"
  - Returns success even if no changes to commit
  - Requires git to be initialized and available

### Restore File from Commit
- **POST** `/{path}/history/restore`
- **Description**: Restore a file from a specific commit
- **Parameters**: 
  - `path` (path parameter): The file path
- **Request Body**:
```json
{
  "commit_hash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0"
}
```
- **Response**: Success message and path
- **Status Codes**: 
  - 200 (restored)
  - 404 (file or commit not found)
  - 400 (invalid path or commit hash)
- **Notes**:
  - Automatically commits current state before restoring
  - Replaces file content with content from specified commit
  - Creates a new commit with the restored version
  - Current version remains in git history for recovery
  - Requires git to be initialized and available

## Directories API (`/api/v1/directories/`)

### Create Directory
- **POST** `/{path}`
- **Description**: Create a new directory
- **Parameters**: 
  - `path` (path parameter): The directory path
- **Response**: Success message and path
- **Status Codes**: 200 (created), 409 (already exists), 400 (invalid path)

### Get Directory
- **GET** `/{path}`
- **Description**: Get directory information and contents
- **Parameters**: 
  - `path` (path parameter): The directory path
- **Response**: Directory metadata and contents
- **Status Codes**: 200 (found), 404 (not found), 400 (invalid path)

### Rename Directory
- **PUT** `/{path}`
- **Description**: Rename a directory
- **Parameters**: 
  - `path` (path parameter): The current directory path
- **Request Body**:
```json
{
  "new_name": "new-directory-name"
}
```
- **Response**: Success message and new path
- **Status Codes**: 200 (renamed), 404 (not found), 409 (destination exists), 400 (invalid path)

### Delete Directory
- **DELETE** `/{path}`
- **Description**: Delete a directory
- **Parameters**: 
  - `path` (path parameter): The directory path
  - `recursive` (query parameter): Whether to delete non-empty directories (default: false)
- **Response**: Success message and path
- **Status Codes**: 200 (deleted), 404 (not found), 400 (invalid path or not empty)

### Move Directory
- **POST** `/{path}/move`
- **Description**: Move a directory to a new location
- **Parameters**: 
  - `path` (path parameter): The current directory path
- **Request Body**:
```json
{
  "destination": "new-location/directory-name"
}
```
- **Response**: Success message and new path
- **Status Codes**: 200 (moved), 404 (not found), 409 (destination exists), 400 (invalid path)

### Copy Directory
- **POST** `/{path}/copy`
- **Description**: Copy a directory to a new location
- **Parameters**: 
  - `path` (path parameter): The source directory path
- **Request Body**:
```json
{
  "destination": "new-location/directory-name"
}
```
- **Response**: Success message and new path
- **Status Codes**: 200 (copied), 404 (not found), 409 (destination exists), 400 (invalid path)

## Common Response Models

### NoteResponse
```json
{
  "message": "Operation completed successfully",
  "path": "/path/to/note.md"
}
```

### NoteData
```json
{
  "content": "Note content here",
  "path": "/path/to/note.md",
  "size": 123,
  "modified": 1640995200
}
```

### SearchResponse
```json
{
  "results": [
    {
      "path": "/path/to/note.md",
      "name": "note.md",
      "snippets": [
        {
          "line_number": 10,
          "content": "Matching line content"
        }
      ]
    }
  ],
  "total": 1
}
```

### SearchResult
```json
{
  "path": "/path/to/note.md",
  "name": "note.md",
  "snippets": [
    {
      "line_number": 10,
      "content": "Matching line content"
    }
  ]
}
```

### Snippet
```json
{
  "line_number": 10,
  "content": "Matching line content"
}
```

### DirectoryResponse
```json
{
  "message": "Operation completed successfully",
  "path": "/path/to/directory"
}
```

### DirectoryData
```json
{
  "name": "directory-name",
  "path": "/path/to/directory",
  "type": "directory",
  "size": 0,
  "modified": 1640995200,
  "item_count": 5,
  "contents": [
    {
      "name": "file.md",
      "path": "/path/to/file.md",
      "type": "file",
      "size": 123,
      "modified": 1640995200
    }
  ]
}
```

## Images API (`/api/v1/images/`)

### Upload Image
- **POST** `/upload`
- **Description**: Upload an image file to the vault's `_resources` directory
- **Request Body**: Multipart form data with `file` field
- **Response**: Success message and image path
- **Example Request**:
  ```bash
  curl -X POST "http://localhost:8000/api/v1/images/upload" \
    -H "Authorization: Bearer <token>" \
    -F "file=@image.png"
  ```
- **Example Response**:
  ```json
  {
    "message": "Image uploaded successfully",
    "path": "/_resources/abc123def.png"
  }
  ```
- **Supported Formats**: PNG, JPEG, GIF, WebP, SVG
- **File Size Limit**: 10MB maximum
- **Status Codes**:
  - 200: Success
  - 400: Invalid file type or size
  - 401: Unauthorized
  - 500: Server error

## Error Responses

All endpoints return consistent error responses:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common Status Codes
- **200**: Success
- **400**: Bad Request (invalid parameters)
- **404**: Not Found (resource doesn't exist)
- **409**: Conflict (resource already exists)
- **500**: Internal Server Error

## Path Validation

All endpoints validate file paths to prevent directory traversal attacks:
- Paths containing `../` or `..\\` patterns are rejected
- Paths starting with `/` are allowed and normalized (representing absolute paths within vault)
- All paths must be within the configured vault directory
- Path traversal protection uses `os.path.commonpath()` to verify vault boundaries
- Invalid characters are handled appropriately

## File Type Support

- **All File Types**: The API supports any file extension or files without extensions
- **Binary File Safety**: Binary files are automatically detected and rejected when attempting to open or update
  - Detection methods: null byte check, UTF-8 validation, file size limit (10MB)
  - Binary files cannot be opened in the browser editor
- **Editor Behavior**:
  - Markdown files (`.md`, `.markdown`) can use either Monaco or Milkdown editor
  - All other file types use Monaco editor only
  - Editor toggle button only appears for markdown files
- Directory operations work with any valid directory name

## Health Check Endpoint

### Health Check
- **GET** `/health`
- **Description**: Health check endpoint that returns server status and git version control information
- **Authentication**: Not required (public endpoint)
- **Response**:
```json
{
  "status": "healthy",
  "vault_path": "/path/to/vault",
  "git_status": {
    "enabled": true,
    "last_commit": 1640995200.0,
    "last_error": null,
    "last_error_time": null
  }
}
```
- **Status Codes**: 
  - 200 (success)
- **Response Fields**:
  - `status`: Server status (always "healthy" if endpoint is reachable)
  - `vault_path`: Path to the vault directory
  - `git_status`: Git version control status object
    - `enabled`: Boolean indicating if git is available and initialized
    - `last_commit`: Unix timestamp (seconds) of last successful commit, or null if no commits yet
    - `last_error`: Error message from last failed git operation, or null if no errors
    - `last_error_time`: Unix timestamp (seconds) of last error, or null if no errors
- **Notes**:
  - This endpoint is always accessible (no authentication required)
  - Used by frontend to monitor git version control status and display errors
  - Git status is updated every 5 minutes when background commit task runs
  - If git is not installed, `enabled` will be `false` and errors will be reported
