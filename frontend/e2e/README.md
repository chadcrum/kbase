# KBase E2E Tests

This directory contains end-to-end tests for the KBase application using Playwright.

## Overview

The E2E test suite provides comprehensive coverage of critical user workflows, with a focus on authentication flows, security testing, and cross-browser compatibility.

## Test Structure

```
e2e/
├── fixtures/              # Test data and vault fixtures
│   ├── vault/            # Sample markdown files for testing
│   │   ├── welcome.md
│   │   ├── folder1/
│   │   └── folder2/
│   └── index.ts          # Fixture management utilities
├── helpers/               # Test utilities and helpers
│   ├── auth.ts           # Authentication helper functions
│   ├── backend.ts        # Backend server management
│   └── vault.ts          # Vault file operations
├── pages/                 # Page Object Models
│   ├── LoginPage.ts      # Login page interactions
│   └── HomePage.ts       # Home page interactions
├── specs/                 # Test specifications
│   ├── auth.spec.ts      # Authentication test suite
│   └── setup.spec.ts     # Setup verification tests
├── global-setup.ts        # Backend server startup
├── global-teardown.ts     # Backend server cleanup
└── README.md             # This file
```

## Test Categories

### Authentication Tests (20+ tests)

**Successful Login Flow**:
- Login with correct password
- Token storage and persistence
- Page reload authentication
- Password input autofocus
- Enter key login

**Failed Login Flow**:
- Incorrect password handling
- Empty password validation
- Loading state management
- Error message display
- Retry functionality

**Logout Flow**:
- Successful logout
- Token cleanup
- Route protection after logout

**Token Management**:
- Valid token access
- Invalid token handling
- Expired token handling
- Missing token handling
- Token refresh

**Route Guards**:
- Unauthenticated redirects
- Authenticated redirects
- Direct navigation protection
- Back button behavior

**Security Testing**:
- SQL injection prevention
- XSS attack prevention
- Input validation
- Network failure handling
- Concurrent request handling

## Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

3. Ensure backend is running (tests will start their own instance)

### Test Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run with interactive UI
npm run test:e2e:ui

# Run in debug mode (step through)
npm run test:e2e:debug

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Run mobile tests
npm run test:e2e -- --project="Mobile Chrome"
npm run test:e2e -- --project="Mobile Safari"
```

### Test Configuration

Tests are configured in `playwright.config.ts`:

- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Parallel Execution**: Tests run in parallel for faster execution
- **Retries**: 2 retries in CI, 0 in local development
- **Timeouts**: 30s per test, 10s for assertions
- **Artifacts**: Screenshots and videos on failure

## Test Environment

### Backend Management

Tests automatically manage the backend server:

1. **Global Setup**: Starts backend with test configuration
2. **Test Isolation**: Each test gets fresh browser context
3. **Global Teardown**: Stops backend and cleans up

### Test Vault

Each test run gets an isolated test vault:

- **Location**: `/tmp/kbase-test-vault`
- **Fixtures**: Sample markdown files with various structures
- **Cleanup**: Automatic cleanup after test completion

### Environment Variables

Tests use the following environment variables:

- `TEST_BACKEND_URL`: Backend server URL
- `TEST_VAULT_PATH`: Test vault directory path
- `TEST_SECRET_KEY`: JWT signing secret
- `TEST_PASSWORD`: Test user password

## Page Object Model

Tests use the Page Object Model pattern for maintainability:

### LoginPage

```typescript
const loginPage = new LoginPage(page);

// Navigate to login
await loginPage.goto();

// Perform login
await loginPage.login('password');

// Assertions
await loginPage.expectLoginSuccess();
await loginPage.expectLoginError('Invalid password');
```

### HomePage

```typescript
const homePage = new HomePage(page);

// Navigate to home
await homePage.goto();

// Check authentication
await homePage.expectAuthenticated();

// Logout
await homePage.clickLogout();
```

## Helper Utilities

### AuthHelper

```typescript
const authHelper = createAuthHelper(page);

// Login
await authHelper.login({ password: 'test' });

// Check authentication
const isAuth = await authHelper.isAuthenticated();

// Get token
const token = await authHelper.getStoredToken();

// Clear auth
await authHelper.clearAuth();
```

### Backend Management

```typescript
const backendManager = createBackendManager();

// Start backend
await backendManager.startBackend(config);

// Stop backend
await backendManager.stopBackend();
```

## Debugging

### Visual Debugging

```bash
# Run with browser visible
npm run test:e2e:headed

# Step through tests
npm run test:e2e:debug
```

### Trace Viewer

```bash
# View test traces
npx playwright show-trace trace.zip
```

### Test Reports

- **HTML Report**: `playwright-report/index.html`
- **Screenshots**: `test-results/` directory
- **Videos**: `test-results/` directory

## CI/CD Integration

Tests run automatically on:

- **Push to main/develop**: Full test suite
- **Pull Requests**: Full test suite
- **Manual Trigger**: Workflow dispatch

### GitHub Actions

The CI pipeline:

1. Sets up Node.js and Python
2. Installs dependencies
3. Installs Playwright browsers
4. Builds frontend
5. Runs E2E tests
6. Uploads artifacts

## Troubleshooting

### Common Issues

**Backend not starting**:
- Check Python dependencies
- Verify backend directory exists
- Check port availability

**Tests timing out**:
- Increase timeout in config
- Check network connectivity
- Verify test vault exists

**Flaky tests**:
- Add proper waits
- Use stable selectors
- Check test isolation

### Debug Commands

```bash
# Check test configuration
npx playwright test --list

# Run specific test
npx playwright test auth.spec.ts

# Run with verbose output
npx playwright test --reporter=list

# Check browser installation
npx playwright install --dry-run
```

## Best Practices

### Writing Tests

1. **Use Page Object Model**: Encapsulate page interactions
2. **Descriptive Names**: Use "should" statements
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Wait for Elements**: Use proper waits, not timeouts
5. **Test Isolation**: Each test should be independent

### Maintaining Tests

1. **Regular Updates**: Update tests with feature changes
2. **Remove Obsolete Tests**: Clean up unused tests
3. **Review Flaky Tests**: Fix unstable tests promptly
4. **Document Patterns**: Share test patterns with team

## Future Enhancements

- **Visual Regression Testing**: Screenshot comparison
- **Performance Testing**: Load testing with large vaults
- **Accessibility Testing**: Automated a11y checks
- **API Testing**: Backend API test coverage
- **Additional User Flows**: File navigation, note editing, search

## Contributing

When adding new tests:

1. Follow existing patterns
2. Use Page Object Model
3. Add proper documentation
4. Test across all browsers
5. Update this README if needed
