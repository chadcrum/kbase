import { FullConfig } from '@playwright/test';
import { createBackendManager, DEFAULT_BACKEND_CONFIG, findAvailablePort } from './helpers/backend.js';
import { createTestVaultManager } from './fixtures/index.js';

/**
 * Global setup for Playwright e2e tests
 * 
 * This runs once before all tests and:
 * 1. Creates a test vault with fixtures
 * 2. Starts the backend server with test configuration
 * 3. Stores configuration for tests to use
 */

async function globalSetup(_config: FullConfig) {
  console.log('🚀 Starting global e2e test setup...');

  try {
    // Find an available port for the backend
    const port = await findAvailablePort(DEFAULT_BACKEND_CONFIG.port);
    console.log(`📡 Using port ${port} for backend server`);

    // Create test vault manager
    const vaultManager = createTestVaultManager('/tmp/kbase-test-vault');
    
    // Create test vault with fixtures
    console.log('📁 Creating test vault with fixtures...');
    await vaultManager.createTestVault();
    console.log('✅ Test vault created successfully');

    // Start backend server
    console.log('🔧 Starting backend server...');
    const backendManager = createBackendManager();
    
    const backendConfig = {
      ...DEFAULT_BACKEND_CONFIG,
      port,
      vaultPath: vaultManager.getVaultPath(),
    };

    await backendManager.startBackend(backendConfig);
    console.log(`✅ Backend server started on port ${port}`);

    // Store configuration for tests
    process.env.TEST_BACKEND_URL = `http://localhost:${port}`;
    process.env.TEST_VAULT_PATH = vaultManager.getVaultPath();
    process.env.TEST_SECRET_KEY = backendConfig.secretKey;
    process.env.TEST_PASSWORD = backendConfig.password;
    
    // Set environment variable for frontend
    process.env.VITE_API_URL = `http://localhost:${port}`;

    // Store backend manager for teardown
    (global as any).__backendManager = backendManager;
    (global as any).__vaultManager = vaultManager;

    console.log('✅ Global setup completed successfully');
    console.log(`   Backend URL: ${process.env.TEST_BACKEND_URL}`);
    console.log(`   Vault Path: ${process.env.TEST_VAULT_PATH}`);

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

export default globalSetup;
