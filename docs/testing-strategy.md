# KBase Testing Strategy

## Overview

KBase implements a comprehensive multi-layered testing strategy that ensures reliability, security, and maintainability across all components. Our testing approach covers unit tests, component tests, integration tests, and end-to-end tests with real backend integration.

## Testing Pyramid

```
    /\
   /  \     E2E Tests (Playwright)
  /____\    - Authentication flows
 /      \   - User workflows
/________\  - Cross-browser testing

   /\
  /  \      Integration Tests
 /____\     - API integration
/      \    - Component communication
/________\  - State management

  /\
 /  \       Unit Tests
/____\      - Functions & methods
/      \    - Store logic
/________\  - Utility functions
```

## Test Types & Coverage

### 1. Unit Tests (Vitest + Vue Test Utils)

**Coverage**: 87% (99+ tests)

**Scope**:
- Store logic (`auth.ts`, `vault.ts`)
- API client (`client.ts`)
- Utility functions
- Component methods
- Type definitions
- Drag-and-drop interactions

**Key Test Files**:
- `stores/auth.test.ts` - Authentication state management
- `stores/vault.test.ts` - File tree state management
- `api/client.test.ts` - HTTP client functionality
- `components/**/*.test.ts` - Component unit tests
- `components/sidebar/FileTreeNode.test.ts` - File tree drag-and-drop with auto-expand

**Test Patterns**:
```typescript
// Store testing
test('should login successfully', async () => {
  const store = useAuthStore()
  const result = await store.login({ password: 'test' })
  expect(result).toBe(true)
  expect(store.isAuthenticated).toBe(true)
})

// Component testing
test('should render login form', () => {
  const wrapper = mount(LoginView)
  expect(wrapper.find('input[type="password"]').exists()).toBe(true)
})
```

### 2. Component Tests (Vue Test Utils)

**Coverage**: User interactions, props, events, conditional rendering

**Key Test Areas**:
- Form interactions and validation
- Event handling
- Props validation
- Conditional rendering
- Error state display
- Loading states
- Drag-and-drop interactions with timers

**Test Patterns**:
```typescript
test('should show error on invalid login', async () => {
  const wrapper = mount(LoginView)
  await wrapper.find('form').trigger('submit')
  expect(wrapper.find('.error-message').exists()).toBe(true)
})

// Drag-and-drop testing with fake timers
test('should auto-expand on drag hover', async () => {
  vi.useFakeTimers()
  await wrapper.find('.node-item').trigger('dragover')
  vi.advanceTimersByTime(600)
  expect(wrapper.emitted('toggleExpand')).toBeTruthy()
  vi.restoreAllMocks()
})
```

### 3. Integration Tests (Vitest)

**Coverage**: Component communication, state flow, API integration

**Key Test Areas**:
- Store-to-component communication
- Router navigation
- API client integration
- Error handling across components

### 4. End-to-End Tests (Playwright)

**Coverage**: Complete user workflows with real backend

**Test Categories**:

#### Authentication Flows (20+ tests)
- ✅ Successful login with correct password
- ✅ Failed login with incorrect password
- ✅ Empty password validation
- ✅ Token storage and persistence
- ✅ Logout functionality
- ✅ Route guards and redirects
- ✅ Token expiry handling
- ✅ Invalid token handling

#### Security Testing (8+ tests)
- ✅ SQL injection prevention
- ✅ XSS attack prevention
- ✅ Input validation
- ✅ Network failure handling
- ✅ Concurrent request handling
- ✅ Storage disabled scenarios

#### UI/UX Validation (6+ tests)
- ✅ Loading states
- ✅ Form validation
- ✅ Accessibility
- ✅ Error message display
- ✅ Page content validation

#### Cross-browser Testing
- ✅ Chromium (Desktop)
- ✅ Firefox (Desktop)
- ✅ WebKit (Desktop)
- ✅ Mobile Chrome
- ✅ Mobile Safari

## Test Infrastructure

### E2E Test Architecture

**Directory Structure**:
```
frontend/e2e/
├── fixtures/              # Test data and vault fixtures
│   ├── vault/            # Sample markdown files
│   └── index.ts          # Fixture management
├── helpers/               # Test utilities
│   ├── auth.ts           # Authentication helpers
│   ├── backend.ts        # Backend management
│   └── vault.ts          # Vault operations
├── pages/                 # Page Object Models
│   ├── LoginPage.ts      # Login page interactions
│   └── HomePage.ts       # Home page interactions
├── specs/                 # Test specifications
│   └── auth.spec.ts      # Authentication test suite
├── global-setup.ts        # Backend server startup
└── global-teardown.ts     # Backend server cleanup
```

**Page Object Model Pattern**:
```typescript
export class LoginPage {
  private page: Page;
  private passwordInput: Locator;
  private loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.passwordInput = page.locator('input[type="password"]');
    this.loginButton = page.locator('button[type="submit"]');
  }

  async login(password: string): Promise<void> {
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
```

### Backend Test Management

**Isolated Test Environment**:
- Dedicated test vault with fixtures
- Separate backend server instance
- Test-specific environment variables
- Automatic cleanup after tests

**Test Vault Fixtures**:
```
test-vault/
├── welcome.md              # Basic test note
├── folder1/
│   ├── note1.md           # Nested test note
│   └── note2.md           # Multiple files test
└── folder2/
    └── deep/
        └── nested.md      # Deep nesting test
```

## Test Execution

### Local Development

**Unit & Component Tests**:
```bash
npm run test              # Run all tests
npm run test:ui           # Interactive UI mode
npm run test:coverage     # Coverage report
npm run test:run          # CI mode (no watch)
```

**E2E Tests**:
```bash
# One-time setup
npx playwright install

# Run all E2E tests
npm run test:e2e

# Debug mode
npm run test:e2e:ui       # Interactive UI
npm run test:e2e:debug    # Step-through debugging
npm run test:e2e:headed   # Visual execution

# Specific browsers
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

### CI/CD Pipeline

**GitHub Actions Workflow** (`.github/workflows/e2e.yml`):
- **Matrix Strategy**: Tests across all browsers
- **Parallel Execution**: 3-4x faster test runs
- **Artifact Upload**: Test reports, screenshots, videos
- **Test Summary**: Comprehensive results overview

**Pipeline Steps**:
1. Checkout code
2. Setup Node.js & Python
3. Install dependencies
4. Install Playwright browsers
5. Build frontend
6. Run E2E tests
7. Upload artifacts

## Test Data Management

### Fixture Strategy

**Test Vault Fixtures**:
- Isolated test data for each test run
- Sample markdown files with various structures
- Automatic cleanup after test completion
- No interference with development data

**Authentication Fixtures**:
- Test user credentials
- JWT token generation for testing
- Invalid/expired token scenarios
- Security test payloads

### Data Isolation

**Per-Test Isolation**:
- Fresh browser context for each test
- Isolated authentication state
- Independent test vault
- No shared state between tests

## Quality Metrics

### Coverage Targets

- **Unit Tests**: 90%+ coverage
- **Component Tests**: 85%+ coverage
- **E2E Tests**: 100% critical path coverage

### Performance Targets

- **Unit Tests**: < 30 seconds
- **E2E Tests**: < 5 minutes (parallel execution)
- **CI Pipeline**: < 10 minutes total

### Reliability Targets

- **Test Stability**: < 1% flaky test rate
- **CI Success Rate**: > 95%
- **Test Maintenance**: < 2 hours per week

## Best Practices

### Test Writing

1. **Arrange-Act-Assert Pattern**:
   ```typescript
   test('should login successfully', async () => {
     // Arrange
     await loginPage.goto();
     
     // Act
     await loginPage.login('test-password');
     
     // Assert
     await loginPage.expectLoginSuccess();
   });
   ```

2. **Descriptive Test Names**:
   - Use "should" statements
   - Include expected behavior
   - Mention specific conditions

3. **Page Object Model**:
   - Encapsulate page interactions
   - Reusable across tests
   - Maintainable locators

### Test Maintenance

1. **Regular Review**:
   - Weekly test review
   - Flaky test identification
   - Coverage analysis

2. **Test Updates**:
   - Update tests with feature changes
   - Refactor when patterns emerge
   - Remove obsolete tests

3. **Documentation**:
   - Keep test documentation current
   - Document test patterns
   - Update setup instructions

## Troubleshooting

### Common Issues

**E2E Test Failures**:
- Check backend server status
- Verify test vault exists
- Check browser compatibility
- Review test timeouts

**Flaky Tests**:
- Add proper waits
- Use stable selectors
- Avoid timing dependencies
- Review test isolation

**CI Failures**:
- Check environment setup
- Verify dependency versions
- Review test artifacts
- Check resource limits

### Debug Tools

**Playwright Debugging**:
```bash
# Step-through debugging
npm run test:e2e:debug

# Visual debugging
npm run test:e2e:headed

# Trace viewer
npx playwright show-trace trace.zip
```

**Test Reports**:
- HTML reports in `playwright-report/`
- Screenshots on failure
- Video recordings
- Console logs

## Future Enhancements

### Planned Improvements

1. **Visual Regression Testing**:
   - Screenshot comparison
   - UI component testing
   - Cross-browser visual validation

2. **Performance Testing**:
   - Load testing with large vaults
   - Memory usage monitoring
   - API response time validation

3. **Accessibility Testing**:
   - Automated a11y checks
   - Screen reader testing
   - Keyboard navigation validation

4. **API Testing**:
   - Backend API test suite
   - Contract testing
   - Integration test coverage

### Test Expansion

1. **Additional User Flows**:
   - File tree navigation
   - Note viewing and editing
   - Search functionality
   - Settings management
   - Drag-and-drop file operations ✅
   - Directory auto-expand on drag ✅

2. **Error Scenarios**:
   - Network failures
   - Server errors
   - Validation errors
   - Edge cases

3. **Mobile Testing**:
   - Touch interactions
   - Mobile-specific UI
   - Responsive design
   - PWA features

## Conclusion

KBase's testing strategy provides comprehensive coverage across all layers of the application, ensuring reliability, security, and maintainability. The combination of unit tests, component tests, and end-to-end tests with real backend integration creates a robust testing foundation that supports confident development and deployment.

The Page Object Model pattern, isolated test environments, and CI/CD integration make the test suite maintainable and scalable as the application grows. Regular review and updates ensure the testing strategy remains effective and aligned with development needs.
