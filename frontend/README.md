# KBase Frontend

A Vue 3 frontend for the KBase note-taking application, providing a clean interface for viewing and navigating markdown notes.

## Features

- **Authentication**: Secure JWT-based login system
- **File Tree Navigation**: Hierarchical view of your note vault with full CRUD operations
  - File Explorer Toolbar with New File and New Folder buttons
  - Input validation for file and folder creation (security-focused)
  - Drag & Drop files and directories
  - Right-click context menus (Delete, Rename, Move to Root)
  - Inline rename (double-click)
  - Delete confirmation dialogs
- **Monaco Editor**: Full-featured code editor with auto-save and syntax highlighting
- **Responsive Design**: Works on desktop and mobile devices
- **Comprehensive Testing**: 170+ tests with high coverage

## Technology Stack

- **Vue 3** (Composition API + TypeScript)
- **Pinia** for state management
- **Vue Router** for navigation
- **Vitest** + Vue Test Utils for testing
- **Axios** for HTTP requests
- **Vite** for build tooling

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Running KBase backend (see main README.md)

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
# Start development server
npm run dev

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build
```

### Environment Configuration

Create a `.env` file in the frontend directory:

```bash
VITE_API_URL=http://localhost:8000
```

## Project Structure

```
src/
├── api/                    # API client and HTTP utilities
├── components/             # Vue components
│   ├── common/            # Reusable common components (dialogs, etc.)
│   ├── editor/            # Monaco editor components
│   ├── layout/            # Layout components
│   ├── sidebar/           # File tree navigation and toolbar
│   └── viewer/            # Note display components
├── stores/                # Pinia stores for state management
├── router/                # Vue Router configuration
├── types/                 # TypeScript type definitions
└── views/                 # Page-level components
```

## Key Components

### Authentication
- `LoginView.vue`: Password-based login form
- `auth.ts` store: JWT token management and authentication state

### Navigation
- `Sidebar.vue`: Container for file tree and toolbar
- `FileExplorerToolbar.vue`: Toolbar with New File and New Folder buttons
- `FileTree.vue`: Hierarchical tree component
- `FileTreeNode.vue`: Individual tree node with expand/collapse
- `ContextMenu.vue`: Right-click context menu component

### Common Components
- `InputDialog.vue`: Reusable input dialog with validation
- `ConfirmDialog.vue`: Reusable confirmation dialog

### Note Display
- `NoteViewer.vue`: Monaco editor for all file types
- `vault.ts` store: File tree state and note selection

## Testing

The frontend includes comprehensive testing with:

- **Unit Tests**: Store logic, API client, utility functions
- **Component Tests**: User interactions, props, events
- **Integration Tests**: Component communication and state flow
- **E2E Tests**: Full user workflows with Playwright

### Unit & Component Tests

Run tests with:
```bash
npm run test              # Run all tests
npm run test:run          # Run tests once (CI mode)
npm run test:coverage     # Run with coverage report
npm run test:ui           # Run with UI interface
```

### E2E Tests

The frontend includes comprehensive end-to-end testing with Playwright:

- **Authentication Flows**: Login, logout, token persistence, route guards
- **Security Testing**: SQL injection, XSS prevention, input validation
- **Cross-browser Testing**: Chromium, Firefox, WebKit, Mobile browsers
- **CI/CD Integration**: Automated testing on GitHub Actions

Run E2E tests with:
```bash
# Install Playwright browsers (one-time)
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run with UI (debug mode)
npm run test:e2e:ui

# Run specific browser
npm run test:e2e:chromium

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode (step through tests)
npm run test:e2e:debug
```

**E2E Test Structure**:
```
e2e/
├── fixtures/           # Test vault with sample markdown files
├── helpers/            # Test utilities (auth, backend, vault)
├── pages/              # Page Object Models (LoginPage, HomePage)
├── specs/              # Test specifications (auth.spec.ts)
├── global-setup.ts     # Backend server startup
└── global-teardown.ts  # Backend server cleanup
```

## Development Guidelines

### Code Style
- Use TypeScript for all new files
- Follow Vue 3 Composition API patterns
- Use Pinia stores for shared state
- Write tests for all new functionality

### Component Guidelines
- Keep components focused and single-purpose
- Use proper TypeScript interfaces for props
- Include comprehensive error handling
- Test user interactions and edge cases

### State Management
- Use Pinia stores for global state
- Keep component state local when possible
- Handle loading and error states consistently

## API Integration

The frontend communicates with the KBase backend through:

- **Authentication**: JWT tokens stored in localStorage
- **File Operations**: REST API for CRUD operations
- **Real-time Updates**: WebSocket support (planned)

## Future Enhancements

- **Note Editing**: Rich text editor with markdown support
- **Search**: Global search across all notes
- **Real-time Sync**: WebSocket-based live updates
- **PWA Features**: Offline support and installability
- **Advanced Navigation**: Bookmarks, recent files, favorites

## Contributing

1. Follow the existing code structure and patterns
2. Write tests for new functionality
3. Ensure all tests pass before submitting
4. Update documentation for new features

## Troubleshooting

### Common Issues

**CORS Errors**: Ensure the backend is running and CORS is configured properly.

**Authentication Issues**: Check that JWT tokens are being stored and sent correctly.

**Build Errors**: Ensure all dependencies are installed and Node.js version is compatible.

### Development Tips

- Use Vue DevTools for debugging component state
- Check browser network tab for API request issues
- Use Vitest UI for interactive test debugging

