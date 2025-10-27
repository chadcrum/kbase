# Project Context

## Purpose

KBase is a web-based markdown note-taking application inspired by Obsidian and Joplin, designed to be lightweight with minimal moving parts. The project emphasizes a markdown-first approach with a focus on simplicity and direct filesystem access.

**Key Goals:**
- Lightweight, minimal architecture with filesystem-based storage
- Personal knowledge management with markdown files
- Progressive Web App (PWA) with installability
- Currently uses Monaco Editor for all file types
- Planned future: dual editor support (markdown WYSIWYG editor for Markdown files, Monaco for other file types)
- **Note**: Currently no offline capabilities despite PWA setup

## Tech Stack

**Backend:**
- **Framework**: FastAPI (Python 3.11+)
- **Web Server**: Uvicorn
- **Storage**: Direct filesystem operations (no database/caching layer currently implemented)
- **Authentication**: JWT tokens
- **Search**: ripgrep for content search (with Python fallback)
- **Validation**: Pydantic for configuration and request/response validation

**Frontend:**
- **Framework**: Vue 3 with Composition API and TypeScript
- **State Management**: Pinia
- **Routing**: Vue Router
- **Editor**: Monaco Editor (VS Code editor)
- **Build Tool**: Vite
- **HTTP Client**: Axios
- **PWA**: vite-plugin-pwa for installability features

**Testing:**
- **Backend**: pytest with httpx
- **Frontend**: Vitest + Vue Test Utils (87% test coverage)
- **E2E**: Playwright with multi-browser support

**Infrastructure:**
- **Containerization**: Docker (multi-stage build)
- **Registry**: GitHub Container Registry (GHCR)
- **CI/CD**: GitHub Actions

## Project Conventions

### Code Style

**Python:**
- Follow PEP 8 style guidelines
- Use type hints for all function parameters and return values
- Write comprehensive docstrings for all public functions and classes
- Use meaningful variable and function names
- Keep functions small and focused (max 50 lines)
- Use dependency injection for services
- Linting: Ruff
- Type checking: mypy
- Naming: snake_case

**TypeScript/Vue:**
- Prefer Composition API over Options API
- Type-safe with strict TypeScript
- Variable/function naming: camelCase
- Component naming: PascalCase
- Linting: ESLint

### Architecture Patterns

- **RESTful API Design**: Follow REST conventions with appropriate HTTP status codes
- **Dependency Injection**: Use FastAPI's dependency injection system
- **State Management**: Pinia stores for global state
- **Component Architecture**: Component-based UI with single-responsibility principle
- **Service Layer**: Business logic separated into service classes (`FileService`, `DirectoryService`)
- **Storage Architecture**: Direct filesystem access with no database abstraction layer
- **Authentication**: JWT-based auth with FastAPI dependency injection for route protection
- **Page Object Model**: Used for E2E tests for maintainability

### Testing Strategy

- **Unit Tests**: Target 90%+ coverage (currently 87%)
- **Component Tests**: Target 85%+ coverage
- **E2E Tests**: 100% critical path coverage required
- **Test Patterns**: Page Object Model for E2E tests
- **Test Isolation**: Isolated test environments with dedicated test vaults
- **CI/CD**: Automated testing on all PRs via GitHub Actions

### Git Workflow

- **Commit Format**: Conventional commits: `type(scope): description`
  - Examples: `feat(api): add note search endpoint`, `fix(auth): resolve JWT validation issue`
- **Branch Naming**: `feature/`, `fix/`, `docs/` prefixes
- **Pre-commit Requirements**: All documentation must be updated before commits
- **Pre-commit Checklist**: Tests, docs, security, performance assessment

## Domain Context

KBase is a personal knowledge management system focused on markdown note-taking:

- **Storage Model**: Filesystem-based vault directory containing markdown files
- **File Operations**: Direct filesystem scanning for file tree operations (no database caching)
- **Authentication**: JWT-based, suitable for single-user personal use
- **File Structure**: Hierarchical directory structure with `.md` files
- **Search**: Content-based search using ripgrep across file contents and filenames
- **Real-time**: Real-time sync capabilities planned but not yet implemented
- **Performance**: Uses frontend lazy loading (initially shows 100 files) rather than backend caching
- **Editor**: Currently Monaco Editor for all file types; future dual-editor support planned

**Important Architecture Note:**

The documentation in `docs/architecture-design.md` and `docs/performance-optimizations.md` mentions SQLite for metadata caching, but this is **not currently implemented**. The actual implementation uses:
- Direct filesystem scanning via `FileService` and `DirectoryService`
- No database layer exists
- Performance relies on frontend lazy loading rather than backend caching

## Important Constraints

**Technical Constraints:**
- Python 3.11+ required
- Node.js 18+ required
- Single-user architecture (personal use, not multi-user)
- Plain text password storage in environment variables (suitable for personal use only)
- Path traversal protection mandatory for all file operations
- Filesystem-based architecture means large vaults scan filesystem on every request

**Business Constraints:**
- Personal use only (not designed for multi-user scenarios)
- Simple password-based authentication
- No user management system

**Performance Constraints:**
- Large vaults (4000+ files) may have performance issues due to lack of backend caching
- Frontend lazy loading helps but doesn't solve backend scanning overhead
- Search performance depends on ripgrep availability

## External Dependencies

**Runtime Dependencies:**
- **Monaco Editor**: VS Code editor component used for all file editing
- **ripgrep**: Fast text search tool (with Python fallback if unavailable)
- **FastAPI ecosystem**: Uvicorn, Pydantic, python-jose

**Development Dependencies:**
- **Playwright**: For E2E testing across multiple browsers
- **Vitest**: Frontend unit and component testing
- **pytest**: Backend testing framework

**Infrastructure Dependencies:**
- **GitHub Container Registry (GHCR)**: Docker image hosting
- **GitHub Actions**: CI/CD pipeline
- **Docker**: Containerization platform
