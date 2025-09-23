/**
 * Helper utilities for CLI integration tests
 */

import { spawn, SpawnOptions } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';

export interface CLIResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  error?: Error;
}

export interface CLITestOptions {
  timeout?: number;
  env?: Record<string, string>;
  cwd?: string;
  input?: string;
}

/**
 * Execute the scaffold CLI command and capture results
 */
export async function runScaffoldCLI(
  args: string[],
  options: CLITestOptions = {}
): Promise<CLIResult> {
  const {
    timeout = 30000,
    env = {},
    cwd = process.cwd(),
    input
  } = options;

  // Path to the built CLI
  const cliPath = path.join(__dirname, '../../../../dist/cli/index.js');

  return new Promise((resolve) => {
    const spawnOptions: SpawnOptions = {
      cwd,
      env: {
        ...process.env,
        ...env,
      },
      stdio: 'pipe',
    };

    const child = spawn('node', [cliPath, ...args], spawnOptions);

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // Set up timeout
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeout);

    // Capture output
    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    // Handle input
    if (input && child.stdin) {
      child.stdin.write(input);
      child.stdin.end();
    }

    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({
        exitCode: 1,
        stdout,
        stderr,
        error,
      });
    });

    child.on('close', (code) => {
      clearTimeout(timer);

      if (timedOut) {
        resolve({
          exitCode: 124, // Standard timeout exit code
          stdout,
          stderr: stderr + '\nProcess timed out',
        });
      } else {
        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
        });
      }
    });
  });
}

/**
 * Create a temporary directory for testing
 */
export async function createTempDir(prefix = 'scaffold-test-'): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  return tempDir;
}

/**
 * Clean up a temporary directory
 */
export async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await fs.remove(dir);
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Create a mock home directory with scaffold config
 */
export async function createMockHomeDir(): Promise<string> {
  const mockHome = await createTempDir('mock-home-');
  const scaffoldDir = path.join(mockHome, '.scaffold');
  await fs.ensureDir(scaffoldDir);
  return mockHome;
}

/**
 * Set up test environment with temporary directories
 */
export async function setupTestEnvironment(): Promise<{
  tempDir: string;
  mockHome: string;
  cleanup: () => Promise<void>;
}> {
  const tempDir = await createTempDir();
  const mockHome = await createMockHomeDir();

  const cleanup = async () => {
    await Promise.all([
      cleanupTempDir(tempDir),
      cleanupTempDir(mockHome),
    ]);
  };

  return { tempDir, mockHome, cleanup };
}

/**
 * Assert CLI result matches expected values
 */
export function expectCLIResult(
  result: CLIResult,
  expected: Partial<CLIResult>
): void {
  if (expected.exitCode !== undefined) {
    expect(result.exitCode).toBe(expected.exitCode);
  }

  if (expected.stdout !== undefined) {
    expect(result.stdout).toContain(expected.stdout);
  }

  if (expected.stderr !== undefined) {
    expect(result.stderr).toContain(expected.stderr);
  }
}

/**
 * Wait for a condition to be true (for async operations)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Check if a shell completion file exists
 */
export async function completionFileExists(shellType: string, homeDir: string): Promise<boolean> {
  const paths = {
    bash: path.join(homeDir, '.scaffold', 'completion-bash.sh'),
    zsh: path.join(homeDir, '.scaffold', 'completions', '_scaffold'),
    fish: path.join(homeDir, '.config', 'fish', 'completions', 'scaffold.fish'),
  };

  const filePath = paths[shellType as keyof typeof paths];
  if (!filePath) return false;

  return fs.pathExists(filePath);
}

/**
 * Read shell configuration file to check for completion setup
 */
export async function isCompletionInShellConfig(shellType: string, homeDir: string): Promise<boolean> {
  const configFiles = {
    bash: path.join(homeDir, '.bashrc'),
    zsh: path.join(homeDir, '.zshrc'),
    fish: null, // Fish auto-loads from completions directory
  };

  const configFile = configFiles[shellType as keyof typeof configFiles];
  if (!configFile || !await fs.pathExists(configFile)) {
    return shellType === 'fish'; // Fish doesn't need shell config
  }

  const content = await fs.readFile(configFile, 'utf-8');
  return content.includes('.scaffold/completion-') || content.includes('Scaffold CLI completion');
}

/**
 * Mock different shell environments
 */
export function createShellEnv(shellType: string): Record<string, string> {
  const shellPaths = {
    bash: '/bin/bash',
    zsh: '/bin/zsh',
    fish: '/usr/local/bin/fish',
  };

  return {
    SHELL: shellPaths[shellType as keyof typeof shellPaths] || '/bin/bash',
  };
}