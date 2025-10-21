import { FullConfig } from '@playwright/test';

/**
 * Global teardown for Playwright e2e tests
 * 
 * This runs once after all tests and:
 * 1. Stops the backend server
 * 2. Cleans up the test vault
 * 3. Resets environment variables
 */

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global e2e test teardown...');

  try {
    // Stop backend server
    const backendManager = (global as any).__backendManager;
    if (backendManager) {
      console.log('🛑 Stopping backend server...');
      await backendManager.stopBackend();
      console.log('✅ Backend server stopped');
    }

    // Clean up test vault
    const vaultManager = (global as any).__vaultManager;
    if (vaultManager) {
      console.log('🗑️ Cleaning up test vault...');
      vaultManager.cleanVault();
      console.log('✅ Test vault cleaned up');
    }

    // Clear global references
    delete (global as any).__backendManager;
    delete (global as any).__vaultManager;

    // Reset environment variables
    delete process.env.TEST_BACKEND_URL;
    delete process.env.TEST_VAULT_PATH;
    delete process.env.TEST_SECRET_KEY;
    delete process.env.TEST_PASSWORD;

    console.log('✅ Global teardown completed successfully');

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw here to avoid masking test failures
  }
}

export default globalTeardown;
