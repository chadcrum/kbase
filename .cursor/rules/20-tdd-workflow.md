# Rule: Test-Driven Development (TDD) Workflow

All feature work should follow TDD:

1. Write minimal failing test(s)
2. Run tests to confirm failure
3. Implement code to satisfy tests
4. Run tests to confirm pass
5. Refactor while keeping tests green
6. Update docs (see `10-docs-major-changes.md`)

## Commit sequencing
- `test: add failing test for <feature>`
- `feat: implement <feature> to satisfy tests` (or `fix:`)
- `refactor: cleanup without changing behavior` and `docs:` as needed

## Evidence in PRs/commits
- First commit shows failing tests (explained in message)
- Subsequent commit makes tests pass
- Refactor commits keep green tests

See stack-specific guidance in `21-tdd-typescript-react.md` and `22-tdd-python-fastapi.md`.
