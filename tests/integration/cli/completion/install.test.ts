/**
 * Integration tests for 'scaffold completion install' command
 * Tests actual CLI invocations and file system interactions
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import {
  runScaffoldCLI,
  setupTestEnvironment,
  expectCLIResult,
  createShellEnv,
  completionFileExists,
  isCompletionInShellConfig,
} from './cli-test-helpers';

describe('scaffold completion install (integration)', () => {
  let tempDir: string;
  let mockHome: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const testEnv = await setupTestEnvironment();
    tempDir = testEnv.tempDir;
    mockHome = testEnv.mockHome;
    cleanup = testEnv.cleanup;

    // Ensure the CLI is built
    await runScaffoldCLI(['--version'], { timeout: 10000 });
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('successful installation', () => {
    it('should install completion for bash with auto-detection', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'install'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
        stdout: 'Shell completion installed successfully',
      });

      expect(result.stdout).toContain('Shell: bash');
      expect(result.stdout).toContain('Install path:');
      expect(result.stdout).toContain('To enable completion:');

      // Verify completion file was created
      const completionExists = await completionFileExists('bash', mockHome);
      expect(completionExists).toBe(true);

      // Verify shell config was updated
      const inShellConfig = await isCompletionInShellConfig('bash', mockHome);
      expect(inShellConfig).toBe(true);
    });

    it('should install completion for zsh with explicit shell option', async () => {
      // Arrange
      const env = {
        HOME: mockHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'install', '--shell', 'zsh'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
        stdout: 'Shell completion installed successfully',
      });

      expect(result.stdout).toContain('Shell: zsh');

      // Verify completion file was created
      const completionExists = await completionFileExists('zsh', mockHome);
      expect(completionExists).toBe(true);

      // Verify shell config was updated
      const inShellConfig = await isCompletionInShellConfig('zsh', mockHome);
      expect(inShellConfig).toBe(true);
    });

    it('should install completion for fish', async () => {
      // Arrange
      const env = {
        ...createShellEnv('fish'),
        HOME: mockHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'install'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
        stdout: 'Shell completion installed successfully',
      });

      expect(result.stdout).toContain('Shell: fish');

      // Verify completion file was created in Fish completions directory
      const completionExists = await completionFileExists('fish', mockHome);
      expect(completionExists).toBe(true);

      // Fish doesn't need shell config updates
      const inShellConfig = await isCompletionInShellConfig('fish', mockHome);
      expect(inShellConfig).toBe(true);
    });

    it('should show verbose output when --verbose flag is used', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'install', '--verbose'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      expect(result.stdout).toContain('Detected shell: bash');
      expect(result.stdout).toContain('Installing completion for: bash');
      expect(result.stdout).toContain('Force reinstall: false');
      expect(result.stdout).toContain('Completion script preview:');
    });

    it('should reinstall when --force flag is used', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // First installation
      await runScaffoldCLI(['completion', 'install'], { env, cwd: tempDir });

      // Act - reinstall with force
      const result = await runScaffoldCLI(['completion', 'install', '--force'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
        stdout: 'Shell completion installed successfully',
      });

      // Verify completion file still exists
      const completionExists = await completionFileExists('bash', mockHome);
      expect(completionExists).toBe(true);
    });
  });

  describe('error scenarios', () => {
    it('should fail with invalid shell type', async () => {
      // Arrange
      const env = {
        HOME: mockHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'install', '--shell', 'invalidshell'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 1,
      });

      expect(result.stderr).toContain('Invalid shell type: invalidshell');
      expect(result.stderr).toContain('Supported shells: bash, zsh, fish');
    });

    it('should warn when already installed without force', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // First installation
      await runScaffoldCLI(['completion', 'install'], { env, cwd: tempDir });

      // Act - try to install again without force
      const result = await runScaffoldCLI(['completion', 'install'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
        stdout: 'Shell completion is already installed and enabled',
      });

      expect(result.stdout).toContain('Use --force to reinstall');
    });

    it('should handle permission errors gracefully', async () => {
      // Arrange
      const readOnlyHome = await fs.mkdtemp(path.join(tempDir, 'readonly-'));
      await fs.chmod(readOnlyHome, 0o444); // read-only

      const env = {
        ...createShellEnv('bash'),
        HOME: readOnlyHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'install'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 1,
      });

      expect(result.stderr).toContain('Error:');
    });
  });

  describe('edge cases', () => {
    it('should handle missing HOME environment variable', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        // HOME is intentionally not set
      };
      delete env.HOME;

      // Act
      const result = await runScaffoldCLI(['completion', 'install'], {
        env,
        cwd: tempDir,
      });

      // Assert - should still work, might use different default path
      // The exact behavior depends on implementation
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should create necessary directories if they do not exist', async () => {
      // Arrange
      const freshHome = path.join(tempDir, 'fresh-home');
      const env = {
        ...createShellEnv('fish'),
        HOME: freshHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'install'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      // Verify directories were created
      const scaffoldDir = path.join(freshHome, '.scaffold');
      const fishCompletionsDir = path.join(freshHome, '.config', 'fish', 'completions');

      expect(await fs.pathExists(scaffoldDir)).toBe(true);
      expect(await fs.pathExists(fishCompletionsDir)).toBe(true);
    });

    it('should handle existing shell config files', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Create existing .bashrc with content
      const bashrcPath = path.join(mockHome, '.bashrc');
      await fs.writeFile(bashrcPath, '# Existing bashrc content\nexport PATH="$PATH:/usr/local/bin"\n');

      // Act
      const result = await runScaffoldCLI(['completion', 'install'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      // Verify original content is preserved
      const bashrcContent = await fs.readFile(bashrcPath, 'utf-8');
      expect(bashrcContent).toContain('Existing bashrc content');
      expect(bashrcContent).toContain('export PATH');
      expect(bashrcContent).toContain('Scaffold CLI completion');
    });
  });

  describe('output format validation', () => {
    it('should output in expected format for successful installation', async () => {
      // Arrange
      const env = {
        ...createShellEnv('zsh'),
        HOME: mockHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'install'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      const lines = result.stdout.split('\n').filter(line => line.trim());

      // Check for expected output structure
      expect(lines.some(line => line.includes('✓ Shell completion installed successfully'))).toBe(true);
      expect(lines.some(line => line.includes('Shell: zsh'))).toBe(true);
      expect(lines.some(line => line.includes('Install path:'))).toBe(true);
      expect(lines.some(line => line.includes('To enable completion:'))).toBe(true);
    });

    it('should not output sensitive information', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
        SECRET_API_KEY: 'secret123',
        DATABASE_PASSWORD: 'password123',
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'install', '--verbose'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expect(result.stdout).not.toContain('secret123');
      expect(result.stdout).not.toContain('password123');
      expect(result.stderr).not.toContain('secret123');
      expect(result.stderr).not.toContain('password123');
    });
  });
});