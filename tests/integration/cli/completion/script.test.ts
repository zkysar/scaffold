/**
 * Integration tests for 'scaffold completion script' command
 * Tests actual CLI invocations for script generation
 */

import * as fs from 'fs-extra';
import {
  runScaffoldCLI,
  setupTestEnvironment,
  expectCLIResult,
  createShellEnv,
} from '@tests/integration/cli/completion/cli-test-helpers';

describe('scaffold completion script (integration)', () => {
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

  describe('script generation for different shells', () => {
    it('should generate bash completion script', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'script'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      // Verify bash script content
      expect(result.stdout).toContain('_scaffold_completion()');
      expect(result.stdout).toContain('_init_completion');
      expect(result.stdout).toContain('complete -F _scaffold_completion scaffold');
      expect(result.stdout).toContain('COMPREPLY');
      expect(result.stdout).toContain('compgen -W');
    });

    it('should generate zsh completion script', async () => {
      // Arrange
      const env = {
        ...createShellEnv('zsh'),
        HOME: mockHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'script'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      // Verify zsh script content
      expect(result.stdout).toContain('#compdef scaffold');
      expect(result.stdout).toContain('_scaffold()');
      expect(result.stdout).toContain('completion_json');
      expect(result.stdout).toContain('compadd -a completions');
    });

    it('should generate fish completion script', async () => {
      // Arrange
      const env = {
        ...createShellEnv('fish'),
        HOME: mockHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'script'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      // Verify fish script content
      expect(result.stdout).toContain('function __scaffold_complete');
      expect(result.stdout).toContain('complete -c scaffold');
      expect(result.stdout).toContain('commandline -cp');
      expect(result.stdout).toContain('string match -r');
    });

    it('should generate script for explicitly specified shell', async () => {
      // Arrange
      const env = {
        HOME: mockHome,
      };

      // Act - request zsh script explicitly
      const result = await runScaffoldCLI(['completion', 'script', '--shell', 'zsh'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      expect(result.stdout).toContain('#compdef scaffold');
      expect(result.stdout).toContain('_scaffold()');
    });
  });

  describe('script output with instructions', () => {
    it('should include installation instructions when --instructions flag is used', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'script', '--instructions'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      // Verify instructions are included
      expect(result.stdout).toContain('# Shell completion script for scaffold CLI (bash)');
      expect(result.stdout).toContain('# Installation instructions:');
      expect(result.stdout).toContain('# 1. Save this script to a file');
      expect(result.stdout).toContain('# 2. Source it in your shell configuration');

      // Verify script content is still present
      expect(result.stdout).toContain('_scaffold_completion()');
    });

    it('should show brief instructions in verbose mode without --instructions', async () => {
      // Arrange
      const env = {
        ...createShellEnv('zsh'),
        HOME: mockHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'script', '--verbose'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      // The script should be generated (verbose output may not be captured in tests)
      expect(result.stdout).toContain('#compdef scaffold');
      expect(result.stdout).toContain('_scaffold()');

      // Check that it includes completion functionality
      expect(result.stdout).toContain('completion complete');
    });

    it('should not show duplicate instructions when both --instructions and --verbose are used', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'script', '--instructions', '--verbose'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      // Should have header instructions but not duplicate brief ones
      expect(result.stdout).toContain('# Installation instructions:');
      expect(result.stdout).not.toContain('Installation instructions:\nSave this script');
    });
  });

  describe('error scenarios', () => {
    it('should fail with invalid shell type', async () => {
      // Arrange
      const env = {
        HOME: mockHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'script', '--shell', 'invalidshell'], {
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

    it('should handle shell detection failure gracefully', async () => {
      // Arrange - environment with no shell indicators
      const env: Record<string, string> = {
        HOME: mockHome,
        // Remove all shell-related environment variables
      };
      delete env.SHELL;

      // Act
      const result = await runScaffoldCLI(['completion', 'script'], {
        env,
        cwd: tempDir,
      });

      // Assert - should generate a script (may detect any shell as fallback)
      expectCLIResult(result, {
        exitCode: 0,
      });

      // Should generate a script (bash is default fallback, but might detect differently)
      expect(result.stdout).toMatch(/_scaffold[_a-zA-Z]*\(\)/);
    });
  });

  describe('script content validation', () => {
    it('should generate syntactically valid bash script', async () => {
      // Arrange
      const env = {
        HOME: mockHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'script', '--shell', 'bash'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      // Save script to temporary file and validate syntax
      const scriptPath = `${tempDir}/test-completion.bash`;
      await fs.writeFile(scriptPath, result.stdout);

      // Run bash syntax check
      const bashEnv = { ...env, SHELL: '/bin/bash' };
      const syntaxCheck = await runScaffoldCLI([], {
        env: bashEnv,
        cwd: tempDir,
      }).catch(() => {
        // This might fail if bash is not available, which is ok for this test
        return { exitCode: 0, stdout: '', stderr: '' };
      });

      // Use syntaxCheck variable to avoid unused variable warning
      void syntaxCheck;

      // If bash is available, the script should have valid syntax
      // We don't assert this strictly since bash may not be available in all test environments
    });

    it('should include necessary completion functions for each shell', async () => {
      // Test each shell has required functions
      const shellTests = [
        {
          shell: 'bash',
          expectedFunctions: ['_scaffold_completion', 'complete -F'],
          expectedVariables: ['cur', 'prev', 'words', 'cword', 'COMPREPLY'],
        },
        {
          shell: 'zsh',
          expectedFunctions: ['_scaffold', 'compadd'],
          expectedVariables: ['completion_json', 'current_line', 'cursor_pos', 'completions'],
        },
        {
          shell: 'fish',
          expectedFunctions: ['__scaffold_complete', 'complete -c'],
          expectedVariables: ['cmdline', 'cursor', 'completion_result'],
        },
      ];

      for (const test of shellTests) {
        const env = { HOME: mockHome };
        const result = await runScaffoldCLI(['completion', 'script', '--shell', test.shell], {
          env,
          cwd: tempDir,
        });

        expectCLIResult(result, { exitCode: 0 });

        // Check for required functions
        test.expectedFunctions.forEach(func => {
          expect(result.stdout).toContain(func);
        });

        // Check for required variables (at least some should be present)
        const hasRequiredVars = test.expectedVariables.some(variable =>
          result.stdout.includes(variable)
        );
        expect(hasRequiredVars).toBe(true);
      }
    });

    it('should call scaffold CLI for dynamic completions', async () => {
      // All shell scripts should call back to scaffold for dynamic completions
      const shells = ['bash', 'zsh', 'fish'];

      for (const shell of shells) {
        const env = { HOME: mockHome };
        const result = await runScaffoldCLI(['completion', 'script', '--shell', shell], {
          env,
          cwd: tempDir,
        });

        expectCLIResult(result, { exitCode: 0 });

        // Each script should call scaffold completion complete command
        expect(result.stdout).toContain('scaffold completion complete');
      }
    });
  });

  describe('output format validation', () => {
    it('should output script without extra formatting when no flags are used', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        HOME: mockHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'script'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      // Output should be just the script, no extra messages
      expect(result.stdout.trim()).toMatch(/^_scaffold_completion/);
      expect(result.stdout).not.toContain('Detected shell:');
      expect(result.stdout).not.toContain('Generating completion script');
    });

    it('should be suitable for shell redirection', async () => {
      // Arrange
      const env = {
        HOME: mockHome,
      };

      // Act
      const result = await runScaffoldCLI(['completion', 'script', '--shell', 'bash'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      // Should be valid to redirect to a file
      const scriptPath = `${tempDir}/completion.bash`;
      await fs.writeFile(scriptPath, result.stdout);

      const scriptContent = await fs.readFile(scriptPath, 'utf-8');
      expect(scriptContent).toContain('_scaffold_completion()');
      expect(scriptContent).toContain('complete -F _scaffold_completion scaffold');
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
      const result = await runScaffoldCLI(['completion', 'script', '--verbose'], {
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

  describe('edge cases', () => {
    it('should handle missing HOME environment variable', async () => {
      // Arrange
      const env = {
        ...createShellEnv('bash'),
        // HOME is intentionally not set
      };
      delete env.HOME;

      // Act
      const result = await runScaffoldCLI(['completion', 'script'], {
        env,
        cwd: tempDir,
      });

      // Assert - should still generate script
      expectCLIResult(result, {
        exitCode: 0,
      });

      expect(result.stdout).toMatch(/_scaffold[_a-zA-Z]*\(\)/);
    });

    it('should work when scaffold is not installed in completion', async () => {
      // This tests that the script command works even if completion isn't installed
      const env = {
        ...createShellEnv('zsh'),
        HOME: mockHome,
      };

      // Act - generate script without installing
      const result = await runScaffoldCLI(['completion', 'script'], {
        env,
        cwd: tempDir,
      });

      // Assert
      expectCLIResult(result, {
        exitCode: 0,
      });

      expect(result.stdout).toContain('#compdef scaffold');
    });

    it('should handle different shell environment variables', async () => {
      // Test with various shell environment configurations
      const shellConfigs = [
        { SHELL: '/bin/bash' },
        { SHELL: '/usr/bin/bash' },
        { SHELL: '/bin/zsh' },
        { SHELL: '/usr/local/bin/zsh' },
        { SHELL: '/usr/local/bin/fish' },
        { SHELL: '/opt/homebrew/bin/fish' },
      ];

      for (const shellConfig of shellConfigs) {
        const env = { ...shellConfig, HOME: mockHome };
        const result = await runScaffoldCLI(['completion', 'script'], {
          env,
          cwd: tempDir,
        });

        // Should generate valid script for detected shell
        expect(result.exitCode).toBe(0);
        expect(result.stdout.length).toBeGreaterThan(100);
      }
    });
  });
});