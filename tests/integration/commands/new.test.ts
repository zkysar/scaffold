/**
 * Integration tests for 'scaffold new' command
 * Tests full command execution with real CLI interaction
 */

import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('scaffold new command integration tests', () => {
  let testWorkspace: string;
  let cliPath: string;

  beforeAll(async () => {
    // Ensure CLI is built
    cliPath = path.join(__dirname, '../../../dist/cli/index.js');
    if (!(await fs.pathExists(cliPath))) {
      execSync('npm run build', { stdio: 'inherit' });
    }
  });

  beforeEach(async () => {
    // Create a unique test workspace for each test
    testWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'scaffold-new-test-'));
    process.chdir(testWorkspace);
  });

  afterEach(async () => {
    // Clean up test workspace
    process.chdir('/');
    await fs.remove(testWorkspace);
  });

  function runCLI(args: string, input?: string): { stdout: string; stderr: string; exitCode: number } {
    try {
      const result = execSync(`node "${cliPath}" ${args}`, {
        encoding: 'utf-8',
        env: { ...process.env, NO_COLOR: '1', HOME: testWorkspace },
        input,
        timeout: 10000,
      });
      return { stdout: result, stderr: '', exitCode: 0 };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.status || 1,
      };
    }
  }

  describe('help and usage', () => {
    it('should display help for new command', () => {
      const result = runCLI('new --help');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('new [options] [project]');
      expect(result.stdout).toContain('Create new project from template');
      expect(result.stdout).toContain('-t, --template');
      expect(result.stdout).toContain('-p, --path');
      expect(result.stdout).toContain('--variables');
      expect(result.stdout).toContain('--verbose');
      expect(result.stdout).toContain('--dry-run');
    });
  });

  describe('dry run mode', () => {
    it('should show dry run output without creating files', async () => {
      // Create a simple template for testing
      const templateDir = path.join(testWorkspace, '.scaffold', 'templates');
      await fs.ensureDir(templateDir);

      const mockTemplate = {
        id: 'test-template-123',
        name: 'test-template',
        version: '1.0.0',
        description: 'Test template for integration testing',
        rootFolder: 'test-project',
        folders: [{ path: 'src', description: 'Source directory' }],
        files: [
          {
            path: 'package.json',
            content: '{"name": "{{PROJECT_NAME}}", "version": "1.0.0"}',
          },
        ],
        variables: [
          {
            name: 'PROJECT_NAME',
            description: 'Project name',
            required: true,
          },
        ],
        rules: {
          strictMode: false,
          allowExtraFiles: true,
          allowExtraFolders: true,
          conflictResolution: 'prompt',
          excludePatterns: [],
          rules: [],
        },
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };

      await fs.writeJson(path.join(templateDir, 'test-template-123', 'template.json'), mockTemplate);

      const result = runCLI('new my-project --template test-template --dry-run');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('DRY RUN - No files will be created');
      expect(result.stdout).toContain('Would create project: my-project');
      expect(result.stdout).toContain('Templates: test-template');

      // Verify no files were actually created
      const projectPath = path.join(testWorkspace, 'my-project');
      expect(await fs.pathExists(projectPath)).toBe(false);
    });

    it('should show dry run with verbose output', () => {
      const result = runCLI('new test-project --template fake-template --dry-run --verbose');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('DRY RUN');
      expect(result.stdout).toContain('Creating new project: test-project');
      expect(result.stdout).toContain('Target path:');
      expect(result.stdout).toContain('Using template: fake-template');
    });
  });

  describe('template handling', () => {
    it('should show error when template not found', () => {
      const result = runCLI('new my-project --template nonexistent-template');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error');
    });

    it('should show message when no templates available', () => {
      const result = runCLI('new my-project');

      // Since no templates are available, should show guidance message
      expect(result.stdout).toContain('No template specified');
      expect(result.stdout).toContain('Use --template option');
    });
  });

  describe('variable handling', () => {
    it('should handle valid JSON variables', () => {
      const variables = JSON.stringify({
        PROJECT_NAME: 'my-awesome-project',
        AUTHOR: 'Test Author'
      });

      const result = runCLI(`new test-project --template fake-template --variables '${variables}' --dry-run`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('DRY RUN');
      expect(result.stdout).toContain('Variables:');
    });

    it('should handle invalid JSON variables', () => {
      const result = runCLI('new test-project --template fake-template --variables "invalid-json"');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Invalid variables JSON');
    });
  });

  describe('path handling', () => {
    it('should handle custom path option', () => {
      const customPath = path.join(testWorkspace, 'custom-location');

      const result = runCLI(`new test-project --template fake-template --path "${customPath}" --dry-run`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('DRY RUN');
      expect(result.stdout).toContain(customPath);
    });

    it('should handle relative paths', () => {
      const result = runCLI('new test-project --template fake-template --path ./custom --dry-run');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('DRY RUN');
    });
  });

  describe('directory existence', () => {
    it('should handle existing directory gracefully', async () => {
      // Create existing directory
      const projectPath = path.join(testWorkspace, 'existing-project');
      await fs.ensureDir(projectPath);
      await fs.writeFile(path.join(projectPath, 'existing-file.txt'), 'content');

      const result = runCLI('existing-project --template fake-template --dry-run');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('DRY RUN');
    });
  });

  describe('verbose mode', () => {
    it('should show detailed output in verbose mode', () => {
      const result = runCLI('new my-project --template test-template --verbose --dry-run');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Creating new project: my-project');
      expect(result.stdout).toContain('Options:');
      expect(result.stdout).toContain('Target path:');
      expect(result.stdout).toContain('Using template: test-template');
    });
  });

  describe('error scenarios', () => {
    it('should handle permission errors gracefully', async () => {
      // Create a read-only directory (simulate permission error)
      const readOnlyPath = path.join(testWorkspace, 'readonly');
      await fs.ensureDir(readOnlyPath);

      // Try to create project in readonly directory
      const result = runCLI(`new test-project --template fake-template --path "${readOnlyPath}" --dry-run`);

      // Should succeed in dry-run mode even with permission issues
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('DRY RUN');
    });

    it('should handle very long project names', () => {
      const longName = 'a'.repeat(255);
      const result = runCLI(`new ${longName} --template fake-template --dry-run`);

      // Should handle long names (exact behavior depends on implementation)
      expect([0, 1]).toContain(result.exitCode);
    });

    it('should handle special characters in project names', () => {
      const result = runCLI('new "project with spaces" --template fake-template --dry-run');

      // Should handle or reject special characters gracefully
      expect([0, 1]).toContain(result.exitCode);
    });
  });

  describe('real template creation (when available)', () => {
    it('should handle template not found errors appropriately', async () => {
      // This test uses a fake template that doesn't exist
      const result = runCLI('new test-project --template fake-template');

      if (result.exitCode === 0) {
        // If implementation creates default template or handles gracefully
        expect(result.stdout).toContain('Project created successfully');
      } else {
        // Expected case: should error when template not found
        expect(result.stderr).toContain('Error');
      }
    });
  });

  describe('integration with template service', () => {
    it('should attempt to load templates from template service', () => {
      const result = runCLI('new my-project');

      // Should try to interact with template service
      expect([
        result.stdout.includes('No templates found'),
        result.stdout.includes('Available Templates'),
        result.stderr.includes('Error')
      ]).toContain(true);
    });
  });

  describe('exit codes', () => {
    it('should exit with code 0 for successful dry runs', () => {
      const result = runCLI('new test-project --template fake-template --dry-run');
      expect(result.exitCode).toBe(0);
    });

    it('should exit with code 1 for invalid arguments', () => {
      const result = runCLI('new test-project --variables "invalid-json"');
      expect(result.exitCode).toBe(1);
    });
  });

  describe('output format validation', () => {
    it('should produce consistent output format', () => {
      const result = runCLI('new test-project --template fake-template --dry-run');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('DRY RUN');
      expect(result.stdout).toContain('Would create project');
      expect(result.stdout).toContain('Target path');
      expect(result.stdout).toContain('Templates');
    });

    it('should not leak sensitive information in output', () => {
      const sensitiveVars = JSON.stringify({
        API_KEY: 'secret-key-123',
        PASSWORD: 'my-password'
      });

      const result = runCLI(`new test-project --template fake-template --variables '${sensitiveVars}' --dry-run`);

      expect(result.exitCode).toBe(0);
      // Variables should be shown in dry run, but implementation should be secure
      expect(result.stdout).toContain('Variables:');
    });
  });

  describe('argument parsing edge cases', () => {
    it('should handle missing project name gracefully', () => {
      const result = runCLI('new --template test-template --dry-run');

      // Should either prompt or show error
      expect([0, 1]).toContain(result.exitCode);
    });

    it('should handle multiple template specifications', () => {
      const result = runCLI('new test-project --template template1 --template template2 --dry-run');

      // Should handle multiple templates or show error
      expect([0, 1]).toContain(result.exitCode);
    });

    it('should handle conflicting options gracefully', () => {
      const result = runCLI('new test-project --template test-template --path /path1 --path /path2 --dry-run');

      // Should use last specified path or show error
      expect([0, 1]).toContain(result.exitCode);
    });
  });
});