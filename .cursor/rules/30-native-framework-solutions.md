# Rule: Prefer Native Framework Solutions

When implementing new features or solving problems, prioritize native framework and library solutions before creating custom implementations.

## Decision Process

1. **Research native solutions first**
   - Check framework documentation for built-in features
   - Look for official plugins or extensions
   - Review community-recommended approaches
   - Consider recent framework updates that might address the need

2. **Evaluate native options**
   - Assess if the native solution meets requirements without significant workarounds
   - Consider maintenance burden (native solutions are typically better maintained)
   - Evaluate performance implications
   - Check compatibility with existing codebase

3. **Custom solution only as fallback**
   - Consider custom solutions only if:
     - No native solution exists for the requirement
     - Native solution proves too difficult to integrate
     - Native solution has critical limitations that cannot be worked around
     - Clear business case exists for custom implementation

## Framework-Specific Considerations

### Vue.js / Frontend
- Use Composition API and built-in directives
- Leverage Vue Router for navigation
- Use Pinia for state management (already adopted)
- Prefer official Vue components and patterns
- Consider VueUse for common utilities

### FastAPI / Backend
- Use FastAPI's dependency injection system
- Leverage Pydantic models for validation
- Use built-in security features (OAuth2, JWT)
- Prefer FastAPI/Starlette middleware and extensions
- Use native async patterns

### General
- Use standard library when possible
- Prefer well-maintained, official packages
- Consider existing dependencies before adding new ones
- Document why a custom solution was chosen over native alternatives

## Documentation Requirements

If choosing a custom solution over a native one, document:
- What native solutions were evaluated
- Why they were insufficient
- Trade-offs of the custom approach
- Long-term maintenance considerations

## Notes
- This rule does not mean avoiding all third-party libraries
- Prefer libraries that align with framework conventions
- Balance pragmatism with long-term maintainability
- When in doubt, implement a minimal version first, then iterate

