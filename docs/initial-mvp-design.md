# Initial MVP Design

This document contains the initial design concepts and requirements for the KBase note-taking application.

## Core Concept

KBase is a web-based note-taking application inspired by Obsidian and Joplin, designed to be:
- Fully web-based with filesystem storage
- Lightweight with minimal moving parts
- Markdown-first with dual editor support
- Real-time synchronized across devices

## Key Features

### File System Integration
- All notes stored as markdown files on the host filesystem
- Directory structure preserved and browsable
- No database dependency - filesystem is the source of truth

### Editor Experience
- CodeMirror text editor (primary)
- Supports all file types with language detection
- Auto-save functionality with visual feedback

### Search and Discovery
- Omni-search modal (Ctrl+K)
- Full-text search across content and titles


### Real-time Collaboration
- WebSocket-based synchronization
- Conflict detection and resolution
- Multi-device support
- Offline capability with PWA

## Technical Architecture

### Backend (FastAPI)
- RESTful API with OpenAPI documentation
- WebSocket support for real-time sync
- File system operations with conflict detection
- Search integration with ripgrep

### Frontend (Vue 3)
- Progressive Web App (PWA) capabilities
- Responsive design for desktop and mobile
- State management with Pinia
- Real-time updates via WebSocket

### Infrastructure
- Podman containerization
- Nginx reverse proxy
- Shared volume for note vault
- Environment-based configuration

## User Experience

### Navigation
- Sidebar with file explorer
- Search functionality
- Recent notes

### Editing
- Conflict resolution

### Mobile Support
- Touch-optimized interface
- Responsive layout
- Offline capability
- Native app-like experience

## Security and Performance

### Security
- JWT-based authentication
- Path traversal protection
- File upload validation
- CORS configuration

### Performance
- Virtual scrolling for large file trees
- Debounced search queries
- Lazy loading of content
- Efficient WebSocket reconnection
