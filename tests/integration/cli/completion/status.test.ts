/**
 * Integration tests for 'scaffold completion status' command
 * Tests actual CLI invocations for status reporting
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import {
  runScaffoldCLI,
  setupTestEnvironment,
  expectCLIResult,
  createShellEnv,
} from './cli-test-helpers';

describe('scaffold completion status (integration)', () => {
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

  describe('status with completion installed', () => {
    it('should report installed and enabled status for bash', async () => {
      // Arrange - install completion first
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      await runScaffoldCLI(['completion', 'install'], { env, cwd: tempDir });

      // Act
      const result = await runScaffoldCLI(['completion', 'status'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
        stdout: '✓ Shell completion is installed and enabled',
      });

      expect(result.stdout).toContain('Shell Completion Status');
      expect(result.stdout).toContain('─'.repeat(50));
      expect(result.stdout).toContain('Details:');
      expect(result.stdout).toContain('Installed: Yes');
      expect(result.stdout).toContain('Enabled: Yes');
      expect(result.stdout).toContain('Shell: bash');
      expect(result.stdout).toContain('Install path:');
      expect(result.stdout).toContain('Install date:');
    });

    it('should report status for zsh with version information', async () => {
      // Arrange - install completion first
      const env = {
        ...createShellEnv('zsh'),
        HOME: mockHome,
      };

      await runScaffoldCLI(['completion', 'install'], { env, cwd: tempDir });

      // Act
      const result = await runScaffoldCLI(['completion', 'status'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      expect(result.stdout).toContain('✓ Shell completion is installed and enabled');
      expect(result.stdout).toContain('Shell: zsh');
      expect(result.stdout).toContain('Version:');
    });

    it('should report status for fish', async () => {
      // Arrange - install completion first
      const env = {
        ...createShellEnv('fish'),
        HOME: mockHome,
      };

      await runScaffoldCLI(['completion', 'install'], { env, cwd: tempDir });

      // Act
      const result = await runScaffoldCLI(['completion', 'status'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      expect(result.stdout).toContain('✓ Shell completion is installed and enabled');
      expect(result.stdout).toContain('Shell: fish');
    });
  });

  describe('status with completion not installed', () => {
    it('should report not installed status', async () => {
      // Arrange - no installation
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'status'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 1,
        stdout: '✗ Shell completion is not installed',
      });

      expect(result.stdout).toContain('Installed: No');
      expect(result.stdout).toContain('Enabled: No');
      expect(result.stdout).toContain('Detected shell: bash');
      expect(result.stdout).toContain('Next steps:');
      expect(result.stdout).toContain('Run "scaffold completion install" to install shell completion');
    });

    it('should suggest shell-specific installation command', async () => {
      // Arrange
      const env = {
        ...createShellEnv('zsh'),
        HOME: mockHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'status'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 1,
      });

      expect(result.stdout).toContain('For zsh: scaffold completion install --shell zsh');
    });
  });

  describe('status with verbose output', () => {
    it('should show detailed information when --verbose flag is used', async () => {
      // Arrange - install completion first
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      await runScaffoldCLI(['completion', 'install'], { env, cwd: tempDir });

      // Act
      const result = await runScaffoldCLI(['completion', 'status', '--verbose'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      expect(result.stdout).toContain('Verbose information:');
      expect(result.stdout).toContain('Script file exists: Yes');
      expect(result.stdout).toContain('Script file size:');
      expect(result.stdout).toContain('Script modified:');
      expect(result.stdout).toContain('Supported shells: bash, zsh, fish');
    });

    it('should show file information when completion script exists', async () => {
      // Arrange - install completion first
      const env = {
        ...createShellEnv('zsh'),
        HOME: mockHome,
      };

      await runScaffoldCLI(['completion', 'install'], { env, cwd: tempDir });

      // Act
      const result = await runScaffoldCLI(['completion', 'status', '--verbose'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expect(result.stdout).toContain('Script file exists: Yes');
      expect(result.stdout).toContain('bytes');
    });

    it('should handle missing script file gracefully in verbose mode', async () => {
      // Arrange - create config but remove script file
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      await runScaffoldCLI(['completion', 'install'], { env, cwd: tempDir });

      // Remove script file but keep config
      const scriptPath = path.join(mockHome, '.scaffold', 'completion-bash.sh');
      await fs.remove(scriptPath);

      // Act
      const result = await runScaffoldCLI(['completion', 'status', '--verbose'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expect(result.stdout).toContain('Script file exists: No');
    });
  });

  describe('JSON output format', () => {
    it('should output valid JSON when --format json is used', async () => {
      // Arrange - install completion first
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      await runScaffoldCLI(['completion', 'install'], { env, cwd: tempDir });

      // Act
      const result = await runScaffoldCLI(['completion', 'status', '--format', 'json'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      // Parse JSON output
      const status = JSON.parse(result.stdout);

      expect(status).toMatchObject({
        isInstalled: true,
        isEnabled: true,
        shellType: 'bash',
        installedVersion: expect.any(String),
        installPath: expect.stringContaining('.scaffold'),
        installDate: expect.any(String),
      });
    });

    it('should output valid JSON for not installed status', async () => {
      // Arrange - no installation
      const env = {
        ...createShellEnv('zsh'),
        HOME: mockHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'status', '--format', 'json'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 1,
      });

      // Parse JSON output
      const status = JSON.parse(result.stdout);

      expect(status).toMatchObject({
        isInstalled: false,
        isEnabled: false,
        shellType: 'zsh',
        installedVersion: null,
        installPath: null,
        installDate: null,
      });
    });
  });

  describe('error scenarios', () => {
    it('should handle corrupted configuration gracefully', async () => {
      // Arrange - create invalid config file
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      const scaffoldDir = path.join(mockHome, '.scaffold');
      await fs.ensureDir(scaffoldDir);

      const configPath = path.join(scaffoldDir, 'completion-bash.json');
      await fs.writeFile(configPath, 'invalid json content');

      // Act
      const result = await runScaffoldCLI(['completion', 'status'], {
        env,
        cwd: tempDir,
      });

      // Assert - should handle gracefully and report as not installed
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('✗ Shell completion is not installed');
    });

    it('should handle permission errors gracefully', async () => {
      // Arrange - create read-only config directory
      const readOnlyHome = await fs.mkdtemp(path.join(tempDir, 'readonly-'));
      const scaffoldDir = path.join(readOnlyHome, '.scaffold');
      await fs.ensureDir(scaffoldDir);
      await fs.chmod(scaffoldDir, 0o444);

      const env = {
        ...createShellEnv('bash'),
        HOME: readOnlyHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'status'], {
        env,
        cwd: tempDir,
      });

      // Assert - should handle gracefully
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should handle invalid format option', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'status', '--format', 'xml'], {
        env,
        cwd: tempDir,
      });

      // Assert - should fall back to table format
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
      expect(result.stdout).toContain('Shell Completion Status');
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
      const result = await runScaffoldCLI(['completion', 'status'], {
        env,
        cwd: tempDir,
      });

      // Assert - should handle gracefully
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should detect shell correctly from environment', async () => {
      // Test each shell type
      const shells = ['bash', 'zsh', 'fish'];

      for (const shellType of shells) {
        const env = {
          ...createShellEnv(shellType),
          HOME: await fs.mkdtemp(path.join(tempDir, `test-${shellType}-`)),
        };

        const result = await runScaffoldCLI(['completion', 'status'], {
          env,
          cwd: tempDir,
        });

        expect(result.stdout).toContain(`Detected shell: ${shellType}`);
      }
    });

    it('should show up-to-date status when version matches', async () => {
      // Arrange - install completion
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      await runScaffoldCLI(['completion', 'install'], { env, cwd: tempDir });

      // Act
      const result = await runScaffoldCLI(['completion', 'status'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expect(result.stdout).toContain('Status: Up to date');
    });
  });

  describe('output format validation', () => {
    it('should have consistent table formatting', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'status'], {
        env,
        cwd: tempDir,
      });

      // Assert
      const lines = result.stdout.split('\n');

      // Check for header
      expect(lines.some(line => line.includes('Shell Completion Status'))).toBe(true);

      // Check for separator line
      expect(lines.some(line => line.includes('─'.repeat(50)))).toBe(true);

      // Check for sections
      expect(lines.some(line => line.includes('Details:'))).toBe(true);
      expect(lines.some(line => line.includes('Next steps:'))).toBe(true);
    });

    it('should not output sensitive information', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
        SECRET_API_KEY: 'secret123',
        DATABASE_PASSWORD: 'password123',
      };

      await runScaffoldCLI(['completion', 'install'], { env, cwd: tempDir });

      // Act
      const result = await runScaffoldCLI(['completion', 'status', '--verbose'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expect(result.stdout).not.toContain('secret123');
      expect(result.stdout).not.toContain('password123');
      expect(result.stderr).not.toContain('secret123');
      expect(result.stderr).not.toContain('password123');
    });

    it('should show appropriate next steps based on status', async () => {
      // Test not installed state
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      const notInstalledResult = await runScaffoldCLI(['completion', 'status'], {
        env,
        cwd: tempDir,
      });

      expect(notInstalledResult.stdout).toContain('Run "scaffold completion install"');

      // Install and test installed state
      await runScaffoldCLI(['completion', 'install'], { env, cwd: tempDir });

      const installedResult = await runScaffoldCLI(['completion', 'status'], {
        env,
        cwd: tempDir,
      });

      // Should not show installation instructions when already installed
      expect(installedResult.stdout).not.toContain('Run "scaffold completion install"');
    });
  });
});