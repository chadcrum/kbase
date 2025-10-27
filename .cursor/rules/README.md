# Cursor Project Rules

These rules guide how changes are proposed and implemented in this repository. They focus on three principles:

- Document major changes up front in `docs/`
- Follow a TDD workflow: write failing tests first, then implement, then refactor
- Prefer native framework solutions before creating custom implementations

Rule files in this directory are ordered to indicate precedence and reading sequence.

## Files
- `10-docs-major-changes.md`: Require feature docs for major changes
- `20-tdd-workflow.md`: Core TDD workflow and expectations
- `21-tdd-typescript-react.md`: TDD specifics for TypeScript/Node + React (Vite) + Jest/RTL
- `22-tdd-python-fastapi.md`: TDD specifics for Python (FastAPI) + pytest (+ Playwright optional)
- `30-native-framework-solutions.md`: Prioritize native solutions over custom implementations

## Scope
- CI enforcement is intentionally out of scope for now and can be added later.
- Use the template at `docs/templates/feature-requirement.md` for new feature docs.
