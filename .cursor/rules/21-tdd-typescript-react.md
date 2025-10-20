# TDD Guidance: TypeScript/Node + React (Vite) + Jest/RTL

## Test locations and patterns
- Unit/integration tests: `**/__tests__/**` and `*.test.ts` / `*.test.tsx`
- Component tests use React Testing Library

## Commands (typical)
- Install: `npm i`
- Run all tests: `npm test` or `npx jest`
- Watch: `npm test -- --watch`

## Failing-first examples
- Component behavior: write a test asserting rendered text/aria changes based on props/state, see it fail, then implement component logic.
- Hook behavior: test initial return values and effects with mocked dependencies; implement the hook to pass.

## Tips
- Prefer testing behavior over implementation details
- Use accessible queries in RTL (`getByRole`, `getByLabelText`)
- Keep tests deterministic; mock network and time as needed
