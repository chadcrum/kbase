# Rule: Document Major Changes in `docs/`

Any major change MUST be documented under `docs/` before implementation begins. Create a new document using `docs/templates/feature-requirement.md` and link it in your initial commit message.

## What qualifies as a major change
- New features or user-visible functionality
- Significant UX changes or navigation changes
- Data model or API contract changes
- Cross-cutting refactors impacting multiple modules

## Required content
- Summary and motivation
- User stories and acceptance criteria
- Test plan (unit/integration/e2e)
- Architecture/design notes and risks

## Expected workflow
1. Create a doc from `docs/templates/feature-requirement.md`
2. Include a link to the doc in the first commit/PR description
3. Implement via TDD (see `20-tdd-workflow.md`)
4. Keep the doc updated as the solution evolves

## Notes
- Small fixes and routine refactors that do not change behavior are not considered major changes.
