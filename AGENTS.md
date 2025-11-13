# KBase - AI Agent Guide

Welcome to the KBase development workspace. This guide provides AI agents with essential information and links to navigate the codebase and development workflows.

## Project Overview

**KBase** is a web-based note-taking application inspired by Obsidian and Joplin, designed to be lightweight with minimal moving parts and markdown-first with dual editor support.

### Tech Stack

- **Frontend**: Vue 3 with TypeScript, Pinia for state management
- **Backend**: FastAPI (Python 3.11+)
- **Editor**: Monaco Editor (VS Code experience)
- **Storage**: Markdown files on filesystem
- **Authentication**: JWT-based
- **Build Tools**: Vite (frontend), uv (backend)
- **Testing**: Playwright (e2e), Vitest (unit), pytest (backend)

### Repository Structure

```
kbase/
├── .cursor/              # Cursor IDE rules and workflow configuration
│   ├── rules/           # Development workflow rules
│   └── commands/        # Custom commands
├── backend/             # FastAPI backend application
│   ├── app/            # Application code
│   └── tests/          # Backend test suite
├── frontend/            # Vue 3 frontend application
│   ├── src/            # Source code
│   └── e2e/            # End-to-end tests
├── docs/                # Architecture and technical documentation
└── kbase-vault/         # Sample note vault
```

For detailed project documentation, see [README.md](README.md).

---

## Development Workflow

Follow standard development practices for all changes. For major changes (new features, significant UX changes, API changes, architecture changes):
1. Create documentation in `docs/` using the template at `docs/templates/feature-requirement.md`
2. Include a link to the doc in your first commit message
3. Implement the changes
4. Keep the doc updated as the solution evolves
5. Write tests for new functionality
6. Update relevant documentation

Reference: `.cursor/rules/10-docs-major-changes.md`

---

## Critical Development Rules

### Documentation Requirements

**🚨 CRITICAL**: All code changes MUST be accompanied by documentation updates. This is non-negotiable.

See `.cursorrules` for the complete documentation checklist. Key points:
- Update `docs/architecture-design.md` for architecture changes
- Update `docs/api-endpoints.md` for API changes
- Update `README.md` for setup/usage changes
- Create feature docs in `docs/templates/` for new major features

Reference: `.cursorrules` (lines 1-217), `.cursor/rules/10-docs-major-changes.md`

### Security Requirements

Security is paramount. Always validate:
- Path traversal protection (use `os.path.abspath()` and `os.path.commonpath()`)
- Input validation (Pydantic models, sanitization)
- JWT authentication on protected endpoints
- File type validation

Reference: `.cursorrules` (lines 64-82)

### Test Coverage

- Maintain **80%+ coverage**
- Write tests for all new functionality
- Include error conditions and edge cases
- Test security features explicitly

Reference: `.cursorrules` (lines 85-98)

### Code Quality

**Python Backend**:
- PEP 8 style guidelines
- Type hints required
- Comprehensive docstrings
- Functions max 50 lines

**Frontend (TypeScript/Vue)**:
- TypeScript strict mode
- Composition API
- Pinia for state management
- Component-focused architecture

Reference: `.cursorrules` (lines 39-62)

---

## Quick Reference

### Development Setup

```bash
# Install dependencies
npm run install:all

# Start both frontend and backend
npm run dev

# Run tests
npm run test              # All tests (includes type-check for frontend)
npm run test:backend      # Backend only
npm run test:frontend     # Frontend only (runs type-check + tests)

# Type-checking (run before committing frontend changes)
cd frontend && npm run type-check  # Check TypeScript types without building
```

### Documentation Links

| Topic | File |
|-------|------|
| Architecture | `docs/architecture-design.md` |
| API Endpoints | `docs/api-endpoints.md` |
| Testing Strategy | `docs/testing-strategy.md` |
| Performance | `docs/performance-optimizations.md` |
| Initial Design | `docs/initial-mvp-design.md` |

### Common Tasks

**Adding a new API endpoint**:
1. If major change, create documentation in `docs/` first
2. Implement the endpoint
3. Write tests for the endpoint
4. Update `docs/api-endpoints.md`
5. Update `docs/architecture-design.md`

**Adding a new UI feature**:
1. If major change, create documentation in `docs/` first
2. Implement the feature
3. Write tests for the feature
4. Update relevant documentation

**Fixing a bug**:
1. Identify root cause
2. Write test that reproduces the bug
3. Fix implementation
4. Update docs if behavior changed

---

## Project Conventions

### Commit Messages

Use conventional commits: `type(scope): description`

Examples:
- `feat(api): add note search endpoint`
- `fix(auth): resolve JWT token validation issue`
- `docs(api): update endpoint documentation`
- `perf(cache): optimize file metadata caching`

### Branch Naming

Use descriptive names: `feature/note-search`, `fix/auth-bug`, `docs/api-update`

### Pre-Commit Checklist

Before every commit:
- [ ] **Type-check passes** (`cd frontend && npm run type-check`)
  - **CRITICAL**: Type errors cause build failures in CI/CD and Podman
  - Frontend automatically runs type-check before tests (`npm run test:run`)
- [ ] All tests pass (`npm run test`)
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Security considerations addressed
- [ ] Commit message follows convention

Reference: `.cursorrules` (lines 152-159), `.cursor/rules/30-git-workflow.mdc`

---

## Before Starting Work

**Essential checklist before beginning any task:**

1. **Understand the Context**
   - [ ] Review related code and documentation
   - [ ] Understand the existing implementation
   - [ ] Check for related tests

2. **Plan Your Approach**
   - [ ] Major change? → Create documentation in `docs/` first
   - [ ] Plan your implementation
   - [ ] Update documentation as you go

3. **Set Up Development Environment**
   - [ ] Run `npm run install:all`
   - [ ] Verify `.env` files are configured
   - [ ] Start development servers

4. **Familiarize Yourself**
   - [ ] Read relevant documentation
   - [ ] Understand the code structure
   - [ ] Review existing tests

---

## Getting Help

**For Workflow Questions**:
- Documentation: See `.cursor/rules/10-docs-major-changes.md`

**For Technical Questions**:
- Architecture: See `docs/architecture-design.md`
- API Design: See `docs/api-endpoints.md`
- Testing: See `docs/testing-strategy.md`

**For Rules & Standards**:
- Core rules: See `.cursorrules`
- Development workflow: See `.cursor/rules/README.md`

---

## Remember

1. **Type-check is mandatory** - Always run `npm run type-check` before committing frontend changes
2. **Documentation is mandatory** - Never commit without updating docs
3. **Write tests** - Write tests for new functionality
4. **Security first** - Always validate inputs and protect against path traversal
5. **Test coverage** - Maintain 80%+ coverage
6. **Code quality** - Follow style guidelines and best practices

**Happy coding!** 🚀