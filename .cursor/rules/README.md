# Cursor Project Rules

These rules guide how changes are proposed and implemented in this repository. They focus on three principles:

- Document major changes up front in `docs/`
- Follow a TDD workflow: write failing tests first, then implement, then refactor
- Prefer native framework solutions before creating custom implementations

Rule files in this directory are ordered to indicate precedence and reading sequence.

## Core Rules (Always Applied)
- `01-project-overview.mdc`: Project description, tech stack, and architecture
- `02-documentation-requirements.mdc`: Documentation checklist requirements
- `31-feature-development.mdc`: Feature development workflow with TDD

## Language-Specific Rules
- `10-python-backend-standards.mdc`: Python/FastAPI coding standards (applies to `backend/**/*.py`)
- `11-typescript-vue-standards.mdc`: TypeScript/Vue 3 standards (applies to `frontend/**/*.ts,frontend/**/*.vue`)
- `12-testing-backend.mdc`: Backend testing with pytest (applies to `backend/tests/**/*.py`)
- `13-testing-frontend.mdc`: Frontend testing with Vitest and Playwright (applies to test files)

## Architecture & Security
- `20-tdd-workflow.md`: Core TDD workflow and expectations
- `21-tdd-typescript-react.md`: TDD specifics for TypeScript/Node + React (Vite) + Jest/RTL
- `22-tdd-python-fastapi.md`: TDD specifics for Python (FastAPI) + pytest
- `30-native-framework-solutions.md`: Prioritize native solutions over custom implementations
- `20-security-requirements.mdc`: Security patterns for path traversal, input validation, authentication
- `21-api-design-patterns.mdc`: RESTful API design patterns (applies to `backend/app/api/**/*.py`)

## Workflow Rules
- `30-git-workflow.mdc`: Conventional commits and git workflow (always applied)

## Configuration Rules
- `40-environment-config.mdc`: Environment variable configuration (applies to config files)
- `41-build-and-tooling.mdc`: Build tools and package managers (applies to build configs)

## Scope
- CI enforcement is intentionally out of scope for now and can be added later.
- Use the template at `docs/templates/feature-requirement.md` for new feature docs.
