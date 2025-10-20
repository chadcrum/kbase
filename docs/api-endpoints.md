# API Endpoints Documentation

This document provides detailed information about all available API endpoints in the KBase note-taking application.

## Base URL
All API endpoints are prefixed with `/api/v1/`

## Authentication
All endpoints (except login) require authentication via JWT token in cookies.

## Notes API (`/api/v1/notes/`)

### List Notes
- **GET** `/`
- **Description**: List all notes in a tree structure
- **Response**: Hierarchical file tree with directories and notes
- **Example Response**:
```json
{
  "name": "vault",
  "type": "directory",
  "children": [
    {
      "name": "note1.md",
      "path": "/note1.md",
      "type": "file"
    },
    {
      "name": "folder1",
      "path": "/folder1",
      "type": "directory",
      "children": [...]
    }
  ]
}
```

### Get Note
- **GET** `/{path}`
- **Description**: Get note content and metadata
- **Parameters**: 
  - `path` (path parameter): The note path (e.g., `note1.md` or `folder/note.md`)
- **Response**: Note content and metadata
- **Example Response**:
```json
{
  "content": "# My Note\n\nThis is the note content.",
  "path": "/note1.md",
  "size": 45,
  "modified": 1640995200
}
```

### Create Note
- **POST** `/{path}`
- **Description**: Create a new note
- **Parameters**: 
  - `path` (path parameter): The note path
- **Request Body**:
```json
{
  "content": "# New Note\n\nThis is a new note."
}
```
- **Response**: Success message and path
- **Status Codes**: 200 (created), 409 (already exists), 400 (invalid path)

### Update Note
- **PUT** `/{path}`
- **Description**: Update an existing note's content
- **Parameters**: 
  - `path` (path parameter): The note path
- **Request Body**:
```json
{
  "content": "# Updated Note\n\nThis is the updated content."
}
```
- **Response**: Success message and path
- **Status Codes**: 200 (updated), 404 (not found), 400 (invalid path)

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

## File Extensions

- Note files automatically get `.md` extension if not provided
- Only markdown files (`.md`, `.markdown`) are supported for notes
- Directory operations work with any valid directory name
