# TDD Guidance: Python (FastAPI) + pytest (+ Playwright optional)

## Test locations and patterns
- Tests live in `tests/`
- Filenames: `test_*.py`

## Commands (typical)
- Install deps: `pip install -r requirements.txt`
- Run tests: `pytest -q`
- E2E (optional): `playwright test`

## Failing-first examples
- API route: write a test using `TestClient` expecting a 200 and response shape; implement route to satisfy test.
- Service function: write unit test for edge cases; implement function and dependencies.

## Tips
- Isolate I/O with dependency overrides
- Use factories/fixtures for data setup
- Mock external services and time for determinism
