import { spawn, ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Backend management utilities for e2e tests
 * 
 * Handles starting, stopping, and health checking the KBase backend
 * server for isolated test environments.
 */

export interface BackendConfig {
  port: number;
  vaultPath: string;
  secretKey: string;
  password: string;
  host?: string;
}

export interface BackendProcess {
  pid: number;
  process: ChildProcess;
  config: BackendConfig;
}

export class BackendManager {
  private backendProcess: BackendProcess | null = null;
  private readonly backendPath: string;

  constructor() {
    // Path to the backend directory
    this.backendPath = join(__dirname, '../../../backend');
  }

  /**
   * Start the backend server with test configuration
   */
  async startBackend(config: BackendConfig): Promise<BackendProcess> {
    if (this.backendProcess) {
      throw new Error('Backend is already running');
    }

    // Validate backend directory exists
    if (!existsSync(this.backendPath)) {
      throw new Error(`Backend directory not found: ${this.backendPath}`);
    }

    // Set environment variables for the backend
    const env = {
      ...process.env,
      VAULT_PATH: config.vaultPath,
      SECRET_KEY: config.secretKey,
      PASSWORD: config.password,
      PORT: config.port.toString(),
      HOST: config.host || '0.0.0.0',
      // Additional required environment variables
      PYTHONPATH: this.backendPath,
      PYTHONUNBUFFERED: '1',
    };

    // Start the backend process using the virtual environment
    const backendProcess = spawn('python', ['run.py'], {
      cwd: this.backendPath,
      env: {
        ...env,
        PATH: `${this.backendPath}/.venv/bin:${process.env.PATH}`,
        VIRTUAL_ENV: `${this.backendPath}/.venv`,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Wait for backend to be ready
    await this.waitForBackend(`http://localhost:${config.port}`);

    this.backendProcess = {
      pid: backendProcess.pid!,
      process: backendProcess,
      config,
    };

    return this.backendProcess;
  }

  /**
   * Stop the backend server
   */
  async stopBackend(): Promise<void> {
    if (!this.backendProcess) {
      return;
    }

    return new Promise((resolve) => {
      const process = this.backendProcess!.process;
      
      // Handle process termination
      process.on('exit', () => {
        this.backendProcess = null;
        resolve();
      });

      // Kill the process
      if (process.pid) {
        process.kill('SIGTERM');
        
        // Force kill after 5 seconds if it doesn't stop gracefully
        setTimeout(() => {
          if (process.pid && !process.killed) {
            process.kill('SIGKILL');
          }
        }, 5000);
      } else {
        resolve();
      }
    });
  }

  /**
   * Check if backend is running
   */
  isRunning(): boolean {
    return this.backendProcess !== null;
  }

  /**
   * Get backend configuration
   */
  getConfig(): BackendConfig | null {
    return this.backendProcess?.config || null;
  }

  /**
   * Wait for backend to be ready by polling health endpoint
   */
  private async waitForBackend(url: string, timeout: number = 30000): Promise<void> {
    const startTime = Date.now();
    const healthUrl = `${url}/health`;

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(healthUrl);
        if (response.ok) {
          return;
        }
      } catch (error) {
        // Backend not ready yet, continue polling
      }

      // Wait 500ms before next attempt
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error(`Backend failed to start within ${timeout}ms`);
  }

  /**
   * Get backend logs (for debugging)
   */
  getLogs(): string[] {
    if (!this.backendProcess) {
      return [];
    }

    // Note: In a real implementation, you might want to capture stdout/stderr
    // For now, we'll return an empty array
    return [];
  }
}

/**
 * Default backend configuration for tests
 */
export const DEFAULT_BACKEND_CONFIG: BackendConfig = {
  port: 8001,
  vaultPath: '/tmp/kbase-test-vault',
  secretKey: 'test-secret-key-for-jwt-signing-in-e2e-tests',
  password: 'test-password',
  host: '0.0.0.0',
};

/**
 * Create a backend manager instance
 */
export function createBackendManager(): BackendManager {
  return new BackendManager();
}

/**
 * Utility function to check if a port is available
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}/health`);
    return !response.ok; // If we get a response, port is in use
  } catch {
    return true; // Port is available
  }
}

/**
 * Find an available port starting from the given port
 */
export async function findAvailablePort(startPort: number = 8001): Promise<number> {
  let port = startPort;
  
  while (port < startPort + 100) {
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  
  throw new Error(`No available port found starting from ${startPort}`);
}

// Global backend manager for e2e tests
let globalBackendManager: BackendManager | null = null;

/**
 * Start the backend server for e2e tests
 * Uses the global backend manager to ensure only one instance runs
 */
export async function startBackend(config?: Partial<BackendConfig>): Promise<void> {
  if (!globalBackendManager) {
    globalBackendManager = new BackendManager();
  }
  
  if (globalBackendManager.isRunning()) {
    console.log('⚠️ Backend is already running');
    return;
  }
  
  const finalConfig = {
    ...DEFAULT_BACKEND_CONFIG,
    ...config,
  };
  
  await globalBackendManager.startBackend(finalConfig);
}

/**
 * Stop the backend server for e2e tests
 */
export async function stopBackend(): Promise<void> {
  if (globalBackendManager) {
    await globalBackendManager.stopBackend();
  }
}
