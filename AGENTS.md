<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

---

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
├── openspec/            # Spec-driven development specifications
└── kbase-vault/         # Sample note vault
```

For detailed project documentation, see [README.md](README.md).

---

## Development Workflows

KBase uses structured workflows for different types of changes. Choose the appropriate workflow based on your task:

### When to Use Which Workflow

| Task Type | Workflow | Reference |
|-----------|----------|-----------|
| **Bug Fix** (restore intended behavior) | Direct TDD fix | `.cursor/rules/20-tdd-workflow.md` |
| **New Feature** | OpenSpec proposal → Implementation | `openspec/AGENTS.md` |
| **Breaking Change** | OpenSpec proposal | `openspec/AGENTS.md` |
| **Architecture Change** | OpenSpec proposal | `openspec/AGENTS.md` |
| **Documentation Update** | Direct update | `.cursor/rules/10-docs-major-changes.md` |
| **Typo/Formatting** | Direct fix | No special workflow |

---

## OpenSpec Workflow (Features & Changes)

> **IMPORTANT**: OpenSpec is the authoritative source for spec-driven development.  
> See `openspec/AGENTS.md` for complete instructions. This section is a brief overview only.

For **new features**, **breaking changes**, or **architectural modifications**, use the OpenSpec spec-driven development workflow.

### When to use OpenSpec

**Always use OpenSpec for**:
- New features or capabilities
- Breaking changes (API, schema, behavior)
- Architecture changes
- Major performance optimizations
- Security pattern updates

**Never use OpenSpec for**:
- Bug fixes (restore intended behavior)
- Typos, formatting, comments
- Dependency updates (non-breaking)
- Configuration changes
- Tests for existing behavior

> Refer to the decision tree in `openspec/AGENTS.md` for detailed guidance.

### Quick Reference

- **Complete workflow**: See `openspec/AGENTS.md`
- **Project conventions**: See `openspec/project.md`
- **Current specs**: `openspec/specs/` (what IS built)
- **Proposals**: `openspec/changes/` (what SHOULD change)

### Essential Commands

```bash
openspec list                  # Show active proposals
openspec list --specs          # Show all capabilities
openspec show <item>           # Display details
openspec validate <item>       # Validate changes
openspec archive <change-id>   # Mark proposal complete
```

---

## TDD Workflow (Bug Fixes & Small Changes)

For **bug fixes** and **small incremental changes**, follow the Test-Driven Development workflow.

### Key Files
- **Workflow**: `.cursor/rules/20-tdd-workflow.md` - Core TDD process
- **TypeScript Guide**: `.cursor/rules/21-tdd-typescript-react.md` - Frontend TDD
- **Python Guide**: `.cursor/rules/22-tdd-python-fastapi.md` - Backend TDD

### TDD Process
1. **Red**: Write failing test
2. **Green**: Implement minimal fix
3. **Refactor**: Clean up while keeping tests green

See `.cursor/rules/README.md` for the complete workflow overview.

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
npm run test              # All tests
npm run test:backend      # Backend only
npm run test:frontend     # Frontend only
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
1. Check `openspec/specs/` for existing spec
2. Create OpenSpec proposal if no spec exists
3. Follow TDD workflow: write test → implement → refactor
4. Update `docs/api-endpoints.md`
5. Update `docs/architecture-design.md`

**Adding a new UI feature**:
1. Check `openspec/specs/` for existing spec
2. Create OpenSpec proposal if no spec exists
3. Follow TDD workflow
4. Update relevant documentation

**Fixing a bug**:
1. Identify root cause
2. Write failing test (TDD Red phase)
3. Fix implementation (TDD Green phase)
4. Refactor if needed (TDD Refactor phase)
5. Update docs if behavior changed

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
- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Security considerations addressed
- [ ] Commit message follows convention

Reference: `.cursorrules` (lines 139-159)

---

## Before Starting Work

**Essential checklist before beginning any task:**

1. **Understand the Context**
   - [ ] Read relevant specs in `openspec/specs/` (if exists)
   - [ ] Check pending proposals in `openspec/changes/`
   - [ ] Review related code and documentation

2. **Choose the Right Workflow**
   - [ ] New feature? → OpenSpec workflow
   - [ ] Bug fix? → TDD workflow
   - [ ] Architecture change? → OpenSpec workflow

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
- OpenSpec: See `openspec/AGENTS.md`
- TDD: See `.cursor/rules/20-tdd-workflow.md`
- Documentation: See `.cursor/rules/10-docs-major-changes.md`

**For Technical Questions**:
- Architecture: See `docs/architecture-design.md`
- API Design: See `docs/api-endpoints.md`
- Testing: See `docs/testing-strategy.md`

**For Rules & Standards**:
- Core rules: See `.cursorrules`
- Development workflow: See `.cursor/rules/README.md`
- Project conventions: See `openspec/project.md`

---

## Remember

1. **Documentation is mandatory** - Never commit without updating docs
2. **Follow the right workflow** - OpenSpec for features, TDD for fixes
3. **Security first** - Always validate inputs and protect against path traversal
4. **Test coverage** - Maintain 80%+ coverage
5. **Code quality** - Follow style guidelines and best practices

**Happy coding!** 🚀