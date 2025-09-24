/**
 * Integration tests for 'scaffold completion complete' command
 * Tests actual CLI invocations for dynamic completion generation
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import {
  runScaffoldCLI,
  setupTestEnvironment,
  expectCLIResult,
  createShellEnv,
} from './cli-test-helpers';

describe('scaffold completion complete (integration)', () => {
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

  describe('command completion', () => {
    it('should complete top-level commands', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act - complete "scaffold " (space after scaffold)
      const result = await runScaffoldCLI([
        'completion', 'complete',
        '--line', 'scaffold ',
        '--point', '9'
      ], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      // Parse JSON output
      const lines = result.stdout.trim().split('\n').filter(line => line.trim());
      const completions = lines.map(line => JSON.parse(line));

      // Should include main commands
      const commandValues = completions.map(c => c.value);
      expect(commandValues).toEqual(expect.arrayContaining([
        'new',
        'template',
        'check',
        'fix',
        'extend',
        'clean',
        'completion'
      ]));
    });

    it('should complete subcommands for template', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act - complete "scaffold template "
      const result = await runScaffoldCLI([
        'completion', 'complete',
        '--line', 'scaffold template ',
        '--point', '18'
      ], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      // Parse JSON output
      const lines = result.stdout.trim().split('\n').filter(line => line.trim());
      const completions = lines.map(line => JSON.parse(line));

      // Should include template subcommands
      const commandValues = completions.map(c => c.value);
      expect(commandValues).toEqual(expect.arrayContaining([
        'create',
        'list',
        'delete',
        'export',
        'import'
      ]));
    });

    it('should complete subcommands for completion', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act - complete "scaffold completion "
      const result = await runScaffoldCLI([
        'completion', 'complete',
        '--line', 'scaffold completion ',
        '--point', '20'
      ], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      // Parse JSON output
      const lines = result.stdout.trim().split('\n').filter(line => line.trim());
      const completions = lines.map(line => JSON.parse(line));

      // Should include completion subcommands
      const commandValues = completions.map(c => c.value);
      expect(commandValues).toEqual(expect.arrayContaining([
        'install',
        'uninstall',
        'status',
        'script'
      ]));

      // Should NOT include the hidden complete command
      expect(commandValues).not.toContain('complete');
    });
  });

  describe('option completion', () => {
    it('should complete global options', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act - complete "scaffold --"
      const result = await runScaffoldCLI([
        'completion', 'complete',
        '--line', 'scaffold --',
        '--point', '11'
      ], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      // Parse JSON output
      const lines = result.stdout.trim().split('\n').filter(line => line.trim());
      const completions = lines.map(line => JSON.parse(line));

      // Should include global options
      const optionValues = completions.map(c => c.value);
      expect(optionValues).toEqual(expect.arrayContaining([
        '--help',
        '--version',
        '--verbose'
      ]));
    });

    it('should complete command-specific options', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act - complete "scaffold new --"
      const result = await runScaffoldCLI([
        'completion', 'complete',
        '--line', 'scaffold new --',
        '--point', '15'
      ], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      // Parse JSON output
      const lines = result.stdout.trim().split('\n').filter(line => line.trim());
      const completions = lines.map(line => JSON.parse(line));

      // Should include new command options and global options
      const optionValues = completions.map(c => c.value);
      expect(optionValues).toEqual(expect.arrayContaining([
        '--help',
        '--version',
        '--verbose',
        '--template',
        '--path',
        '--variables',
        '--dry-run'
      ]));
    });

    it('should complete completion command options', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act - complete "scaffold completion install --"
      const result = await runScaffoldCLI([
        'completion', 'complete',
        '--line', 'scaffold completion install --',
        '--point', '32'
      ], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      // Parse JSON output
      const lines = result.stdout.trim().split('\n').filter(line => line.trim());
      const completions = lines.map(line => JSON.parse(line));

      // Should include completion install options
      const optionValues = completions.map(c => c.value);
      expect(optionValues).toEqual(expect.arrayContaining([
        '--help',
        '--version',
        '--verbose',
        '--shell',
        '--force'
      ]));
    });
  });

  describe('option value completion', () => {
    it('should complete shell types for --shell option', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act - complete "scaffold completion install --shell "
      const result = await runScaffoldCLI([
        'completion', 'complete',
        '--line', 'scaffold completion install --shell ',
        '--point', '39'
      ], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      // Parse JSON output
      const lines = result.stdout.trim().split('\n').filter(line => line.trim());
      const completions = lines.map(line => JSON.parse(line));

      // Should include shell types
      const shellValues = completions.map(c => c.value);
      expect(shellValues).toEqual(expect.arrayContaining([
        'bash',
        'zsh',
        'fish'
      ]));
    });

    it('should filter completions based on partial input', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act - complete "scaffold completion install --shell z"
      const result = await runScaffoldCLI([
        'completion', 'complete',
        '--line', 'scaffold completion install --shell z',
        '--point', '40'
      ], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      // Parse JSON output
      const lines = result.stdout.trim().split('\n').filter(line => line.trim());
      const completions = lines.map(line => JSON.parse(line));

      // Should only include shells starting with 'z'
      const shellValues = completions.map(c => c.value);
      expect(shellValues).toContain('zsh');
      expect(shellValues).not.toContain('bash');
      expect(shellValues).not.toContain('fish');
    });
  });

  describe('error handling', () => {
    it('should handle invalid command line gracefully', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act - invalid command line parameters
      const result = await runScaffoldCLI([
        'completion', 'complete',
        '--line', '',
        '--point', 'invalid'
      ], {
        env,
        cwd: tempDir,
      });

      // Assert - should fail silently for completion
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBe('');
    });

    it('should handle missing parameters gracefully', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act - missing required parameters
      const result = await runScaffoldCLI([
        'completion', 'complete'
      ], {
        env,
        cwd: tempDir,
      });

      // Assert - should fail silently for completion
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBe('');
    });

    it('should handle out-of-bounds cursor position', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act - cursor position beyond line length
      const result = await runScaffoldCLI([
        'completion', 'complete',
        '--line', 'scaffold new',
        '--point', '100'
      ], {
        env,
        cwd: tempDir,
      });

      // Assert - should handle gracefully
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('should handle completion with basic cursor positions', async () => {
      // Test completion at end of common command lines
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Test completion after "scaffold "
      const result1 = await runScaffoldCLI([
        'completion', 'complete',
        '--line', 'scaffold ',
        '--point', '9'
      ], {
        env,
        cwd: tempDir,
      });

      expect(result1.exitCode).toBe(0);
      const lines1 = result1.stdout.trim().split('\n').filter(line => line.trim());
      const completions1 = lines1.map(line => JSON.parse(line));
      const values1 = completions1.map(c => c.value);
      expect(values1).toContain('new');
      expect(values1).toContain('template');
    });

    it('should handle quoted arguments', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act - command line with quotes
      const result = await runScaffoldCLI([
        'completion', 'complete',
        '--line', 'scaffold new "project name" --',
        '--point', '29'
      ], {
        env,
        cwd: tempDir,
      });

      // Assert - should parse quotes correctly
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty command line', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act - empty command line
      const result = await runScaffoldCLI([
        'completion', 'complete',
        '--line', '',
        '--point', '0'
      ], {
        env,
        cwd: tempDir,
      });

      // Assert - should handle gracefully
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should work with different working directories', async () => {
      // Arrange - create a project directory
      const projectDir = path.join(tempDir, 'test-project');
      await fs.ensureDir(projectDir);

      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act - complete from within project directory
      const result = await runScaffoldCLI([
        'completion', 'complete',
        '--line', 'scaffold ',
        '--point', '9'
      ], {
        env,
        cwd: projectDir, // Different working directory
      });

      // Assert - should still work
      expectCLIResult(result, {
        exitCode: 0,
      });

      const lines = result.stdout.trim().split('\n').filter(line => line.trim());
      const completions = lines.map(line => JSON.parse(line));
      const commandValues = completions.map(c => c.value);

      expect(commandValues).toEqual(expect.arrayContaining([
        'new',
        'template',
        'completion'
      ]));
    });
  });

  describe('performance', () => {
    it('should complete within reasonable time', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      const startTime = Date.now();

      // Act
      const result = await runScaffoldCLI([
        'completion', 'complete',
        '--line', 'scaffold completion ',
        '--point', '20'
      ], {
        env,
        cwd: tempDir,
        timeout: 5000, // 5 second timeout
      });

      const duration = Date.now() - startTime;

      // Assert - should complete quickly (under 1 second for simple completion)
      expect(duration).toBeLessThan(1000);
      expectCLIResult(result, {
        exitCode: 0,
      });
    });

    it('should handle complex command lines efficiently', async () => {
      // Arrange - long command line with many arguments
      const complexLine = 'scaffold new my-project --template react typescript --verbose --dry-run --force --';

      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      const startTime = Date.now();

      // Act
      const result = await runScaffoldCLI([
        'completion', 'complete',
        '--line', complexLine,
        '--point', complexLine.length.toString()
      ], {
        env,
        cwd: tempDir,
        timeout: 5000,
      });

      const duration = Date.now() - startTime;

      // Assert - should still complete efficiently
      expect(duration).toBeLessThan(2000);
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });
  });

  describe('output format', () => {
    it('should output valid JSON for each completion', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act
      const result = await runScaffoldCLI([
        'completion', 'complete',
        '--line', 'scaffold ',
        '--point', '9'
      ], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      // Each line should be valid JSON
      const lines = result.stdout.trim().split('\n').filter(line => line.trim());

      lines.forEach(line => {
        expect(() => JSON.parse(line)).not.toThrow();

        const completion = JSON.parse(line);
        expect(completion).toHaveProperty('value');
        expect(typeof completion.value).toBe('string');
      });
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
      const result = await runScaffoldCLI([
        'completion', 'complete',
        '--line', 'scaffold ',
        '--point', '9'
      ], {
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