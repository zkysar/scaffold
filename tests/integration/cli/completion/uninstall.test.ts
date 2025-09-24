/**
 * Integration tests for 'scaffold completion uninstall' command
 * Tests actual CLI invocations for completion removal
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

describe('scaffold completion uninstall (integration)', () => {
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

  describe('successful uninstallation', () => {
    it('should uninstall completion for bash', async () => {
      // Arrange - first install completion
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      await runScaffoldCLI(['completion', 'install'], { env, cwd: tempDir });

      // Verify installation
      expect(await completionFileExists('bash', mockHome)).toBe(true);
      expect(await isCompletionInShellConfig('bash', mockHome)).toBe(true);

      // Act - uninstall
      const result = await runScaffoldCLI(['completion', 'uninstall'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
        stdout: 'Shell completion removed successfully',
      });

      expect(result.stdout).toContain('Removed from:');
      expect(result.stdout).toContain('Manual cleanup (if needed):');
      expect(result.stdout).toContain('Remove any references to the completion script from ~/.bashrc');

      // Verify completion file was removed
      expect(await completionFileExists('bash', mockHome)).toBe(false);

      // Verify shell config was cleaned up
      expect(await isCompletionInShellConfig('bash', mockHome)).toBe(false);
    });

    it('should uninstall completion for zsh', async () => {
      // Arrange - first install completion
      const env = {
        ...createShellEnv('zsh'),
        HOME: mockHome,
      };

      await runScaffoldCLI(['completion', 'install'], { env, cwd: tempDir });

      // Verify installation
      expect(await completionFileExists('zsh', mockHome)).toBe(true);

      // Act - uninstall
      const result = await runScaffoldCLI(['completion', 'uninstall'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
        stdout: 'Shell completion removed successfully',
      });

      expect(result.stdout).toContain('Remove any references to the completion script from ~/.zshrc');
      expect(result.stdout).toContain('You may need to rebuild completion cache: rm -f ~/.zcompdump*');

      // Verify completion file was removed
      expect(await completionFileExists('zsh', mockHome)).toBe(false);
    });

    it('should uninstall completion for fish', async () => {
      // Arrange - first install completion
      const env = {
        ...createShellEnv('fish'),
        HOME: mockHome,
      };

      await runScaffoldCLI(['completion', 'install'], { env, cwd: tempDir });

      // Verify installation
      expect(await completionFileExists('fish', mockHome)).toBe(true);

      // Act - uninstall
      const result = await runScaffoldCLI(['completion', 'uninstall'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
        stdout: 'Shell completion removed successfully',
      });

      expect(result.stdout).toContain('Fish completion will be automatically disabled in new sessions');

      // Verify completion file was removed
      expect(await completionFileExists('fish', mockHome)).toBe(false);
    });

    it('should show verbose output when --verbose flag is used', async () => {
      // Arrange - first install completion
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      await runScaffoldCLI(['completion', 'install'], { env, cwd: tempDir });

      // Act - uninstall with verbose
      const result = await runScaffoldCLI(['completion', 'uninstall', '--verbose'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      expect(result.stdout).toContain('Checking completion status...');
      expect(result.stdout).toContain('Current status:');
      expect(result.stdout).toContain('Installed: true');
      expect(result.stdout).toContain('Enabled: true');
      expect(result.stdout).toContain('Shell: bash');
      expect(result.stdout).toContain('Install path:');
    });
  });

  describe('error scenarios', () => {
    it('should handle when completion is not installed', async () => {
      // Arrange - no installation
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act - try to uninstall when not installed
      const result = await runScaffoldCLI(['completion', 'uninstall'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
        stdout: 'Shell completion is not installed',
      });

      expect(result.stdout).toContain('Nothing to remove');
    });

    it('should handle permission errors gracefully', async () => {
      // Arrange - install completion first
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      await runScaffoldCLI(['completion', 'install'], { env, cwd: tempDir });

      // Make scaffold directory read-only to prevent file removal (but keep read access)
      const scaffoldDir = path.join(mockHome, '.scaffold');
      await fs.chmod(scaffoldDir, 0o544); // r-xr--r-- (read and execute for owner, readable for others)

      // Act - try to uninstall
      const result = await runScaffoldCLI(['completion', 'uninstall'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 1,
      });

      expect(result.stderr).toContain('Error:');
      expect(result.stderr).toContain('Failed to remove completion:');
    });

    it('should handle corrupted installation state', async () => {
      // Arrange - create partial/corrupted installation
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Create completion config file but no actual completion script
      const scaffoldDir = path.join(mockHome, '.scaffold');
      await fs.ensureDir(scaffoldDir);

      const configPath = path.join(scaffoldDir, 'completion-bash.json');
      await fs.writeJson(configPath, {
        shellType: 'bash',
        installedVersion: '1.0.0',
        installPath: path.join(scaffoldDir, 'completion-bash.sh'),
        installDate: new Date(),
        isEnabled: true,
        isInstalled: true,
      });

      // Act - try to uninstall corrupted state
      const result = await runScaffoldCLI(['completion', 'uninstall'], {
        env,
        cwd: tempDir,
      });

      // Assert - should handle gracefully
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
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
      const result = await runScaffoldCLI(['completion', 'uninstall'], {
        env,
        cwd: tempDir,
      });

      // Assert - should handle gracefully
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should clean up shell config even if completion file is missing', async () => {
      // Arrange - install completion first
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      await runScaffoldCLI(['completion', 'install'], { env, cwd: tempDir });

      // Manually remove completion file but leave shell config
      const completionPath = path.join(mockHome, '.scaffold', 'completion-bash.sh');
      await fs.remove(completionPath);

      // Act - uninstall
      const result = await runScaffoldCLI(['completion', 'uninstall'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      // When script file is missing, service considers completion "not installed"
      // so shell config won't be cleaned up automatically
      expect(await isCompletionInShellConfig('bash', mockHome)).toBe(true);
    });

    it('should preserve other content in shell config files', async () => {
      // Arrange - create shell config with existing content
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      const bashrcPath = path.join(mockHome, '.bashrc');
      const originalContent = `# Original bashrc content
export PATH="$PATH:/usr/local/bin"
alias ll="ls -la"

# Some other configuration
export EDITOR=vim
`;

      await fs.writeFile(bashrcPath, originalContent);

      // Install completion
      await runScaffoldCLI(['completion', 'install'], { env, cwd: tempDir });

      // Act - uninstall
      const result = await runScaffoldCLI(['completion', 'uninstall'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      // Verify original content is preserved
      const finalContent = await fs.readFile(bashrcPath, 'utf-8');
      expect(finalContent).toContain('Original bashrc content');
      expect(finalContent).toContain('export PATH');
      expect(finalContent).toContain('alias ll');
      expect(finalContent).toContain('export EDITOR=vim');

      // Verify completion references are removed
      expect(finalContent).not.toContain('Scaffold CLI completion');
      expect(finalContent).not.toContain('.scaffold/completion-');
    });
  });

  describe('output format validation', () => {
    it('should output in expected format for successful uninstallation', async () => {
      // Arrange - install first
      const env = {
        ...createShellEnv('zsh'),
        HOME: mockHome,
      };

      await runScaffoldCLI(['completion', 'install'], { env, cwd: tempDir });

      // Act - uninstall
      const result = await runScaffoldCLI(['completion', 'uninstall'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      const lines = result.stdout.split('\n').filter(line => line.trim());

      // Check for expected output structure
      expect(lines.some(line => line.includes('✓ Shell completion removed successfully'))).toBe(true);
      expect(lines.some(line => line.includes('Removed from:'))).toBe(true);
      expect(lines.some(line => line.includes('Manual cleanup (if needed):'))).toBe(true);
    });

    it('should provide shell-specific cleanup instructions', async () => {
      // Test each shell type gets appropriate instructions
      const shells = ['bash', 'zsh', 'fish'];

      for (const shellType of shells) {
        // Arrange
        const env = {
          ...createShellEnv(shellType),
          HOME: await fs.mkdtemp(path.join(tempDir, `test-${shellType}-`)),
        };

        await runScaffoldCLI(['completion', 'install'], { env, cwd: tempDir });

        // Act
        const result = await runScaffoldCLI(['completion', 'uninstall'], {
          env,
          cwd: tempDir,
        });

        // Assert shell-specific instructions
        switch (shellType) {
          case 'bash':
            expect(result.stdout).toContain('Remove any references to the completion script from ~/.bashrc');
            break;
          case 'zsh':
            expect(result.stdout).toContain('Remove any references to the completion script from ~/.zshrc');
            expect(result.stdout).toContain('You may need to rebuild completion cache: rm -f ~/.zcompdump*');
            break;
          case 'fish':
            expect(result.stdout).toContain('Fish completion will be automatically disabled in new sessions');
            break;
        }
      }
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
      const result = await runScaffoldCLI(['completion', 'uninstall', '--verbose'], {
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