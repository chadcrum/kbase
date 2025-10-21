import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Test vault fixture management
 * 
 * Provides utilities to create, manage, and clean up test vaults
 * with sample markdown files for e2e testing.
 */

export interface TestVaultConfig {
  vaultPath: string;
  fixturesPath: string;
}

export class TestVaultManager {
  private vaultPath: string;
  private fixturesPath: string;

  constructor(config: TestVaultConfig) {
    this.vaultPath = config.vaultPath;
    this.fixturesPath = config.fixturesPath;
  }

  /**
   * Create a fresh test vault with fixture files
   */
  async createTestVault(): Promise<void> {
    // Clean up existing vault if it exists
    this.cleanVault();

    // Create vault directory
    mkdirSync(this.vaultPath, { recursive: true });

    // Copy fixture files to vault
    await this.copyFixturesToVault();
  }

  /**
   * Clean up the test vault directory
   */
  cleanVault(): void {
    if (existsSync(this.vaultPath)) {
      rmSync(this.vaultPath, { recursive: true, force: true });
    }
  }

  /**
   * Reset vault to initial state (clean and recreate)
   */
  async resetVault(): Promise<void> {
    this.cleanVault();
    await this.createTestVault();
  }

  /**
   * Add a new note to the vault
   */
  addNote(relativePath: string, content: string): void {
    const fullPath = join(this.vaultPath, relativePath);
    const dir = dirname(fullPath);
    
    // Create directory if it doesn't exist
    mkdirSync(dir, { recursive: true });
    
    // Write note content
    require('fs').writeFileSync(fullPath, content, 'utf8');
  }

  /**
   * Remove a note from the vault
   */
  removeNote(relativePath: string): void {
    const fullPath = join(this.vaultPath, relativePath);
    if (existsSync(fullPath)) {
      rmSync(fullPath);
    }
  }

  /**
   * Get the vault path
   */
  getVaultPath(): string {
    return this.vaultPath;
  }

  /**
   * Check if vault exists
   */
  vaultExists(): boolean {
    return existsSync(this.vaultPath);
  }

  /**
   * Copy fixture files to the test vault
   */
  private async copyFixturesToVault(): Promise<void> {
    const copyRecursive = async (src: string, dest: string) => {
      const { readdirSync, statSync, mkdirSync, copyFileSync } = await import('node:fs');
      
      if (!existsSync(dest)) {
        mkdirSync(dest, { recursive: true });
      }
      
      const items = readdirSync(src);
      
      for (const item of items) {
        const srcPath = join(src, item);
        const destPath = join(dest, item);
        
        if (statSync(srcPath).isDirectory()) {
          await copyRecursive(srcPath, destPath);
        } else {
          copyFileSync(srcPath, destPath);
        }
      }
    };

    await copyRecursive(this.fixturesPath, this.vaultPath);
  }
}

/**
 * Create a test vault manager instance
 */
export function createTestVaultManager(vaultPath: string): TestVaultManager {
  const fixturesPath = join(__dirname, 'vault');
  return new TestVaultManager({ vaultPath, fixturesPath });
}

/**
 * Default test vault configuration
 */
export const DEFAULT_TEST_VAULT_CONFIG = {
  vaultPath: '/tmp/kbase-test-vault',
  fixturesPath: join(__dirname, 'vault')
};

/**
 * Create a test vault with default configuration
 */
export function createDefaultTestVault(): TestVaultManager {
  return createTestVaultManager(DEFAULT_TEST_VAULT_CONFIG.vaultPath);
}
