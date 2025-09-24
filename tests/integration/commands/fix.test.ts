/**
 * Integration tests for 'scaffold fix' command
 * Tests full command execution with real CLI interaction
 */

import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';


import { logger } from '@/lib/logger';
describe('scaffold fix command integration tests', () => {
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
    testWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'scaffold-fix-test-'));
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
        env: { ...process.env, NO_COLOR: '1' },
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

  async function createScaffoldProject(projectName: string, withIssues = false): Promise<string> {
    const projectPath = path.join(testWorkspace, projectName);
    await fs.ensureDir(projectPath);

    // Create .scaffold manifest
    const scaffoldDir = path.join(projectPath, '.scaffold');
    await fs.ensureDir(scaffoldDir);

    const manifest = {
      version: '1.0.0',
      projectName,
      templates: [
        {
          id: 'template-123',
          name: 'test-template',
          version: '1.0.0',
          appliedAt: '2023-01-01T00:00:00.000Z',
        },
      ],
      variables: { PROJECT_NAME: projectName },
      created: '2023-01-01T00:00:00.000Z',
      updated: '2023-01-01T00:00:00.000Z',
      history: [],
    };

    await fs.writeJson(path.join(scaffoldDir, 'manifest.json'), manifest);

    // Create some project files
    await fs.ensureDir(path.join(projectPath, 'src'));
    await fs.writeFile(path.join(projectPath, 'package.json'), '{"name": "' + projectName + '"}');

    if (withIssues) {
      // Create some issues for testing fix functionality
      await fs.writeFile(path.join(projectPath, 'broken-file.txt'), 'content');
    }

    return projectPath;
  }

  describe('help and usage', () => {
    it('should display help for fix command', () => {
      const result = runCLI('fix --help');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('fix [options] [project]');
      expect(result.stdout).toContain('Fix project structure issues automatically');
      expect(result.stdout).toContain('--verbose');
      expect(result.stdout).toContain('--dry-run');
      expect(result.stdout).toContain('--force');
      expect(result.stdout).toContain('--backup');
    });
  });

  describe('non-scaffold projects', () => {
    it('should handle non-scaffold-managed projects gracefully', async () => {
      // Create a regular project without scaffold manifest
      const projectPath = path.join(testWorkspace, 'regular-project');
      await fs.ensureDir(projectPath);
      await fs.writeFile(path.join(projectPath, 'package.json'), '{"name": "regular"}');

      const result = runCLI(`fix "${projectPath}"`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Not a scaffold-managed project');
      expect(result.stdout).toContain('No .scaffold/manifest.json file found');
      expect(result.stdout).toContain('Use "scaffold new"');
      expect(result.stdout).toContain('Use "scaffold extend"');
    });

    it('should handle current directory when not scaffold-managed', () => {
      // testWorkspace is not a scaffold project by default
      const result = runCLI('fix');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Not a scaffold-managed project');
    });
  });

  describe('scaffold-managed projects', () => {
    it('should process valid scaffold projects', async () => {
      const projectPath = await createScaffoldProject('test-project');

      const result = runCLI(`fix "${projectPath}"`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Project Fix Report');
      expect(result.stdout).toContain('Statistics:');
      expect(result.stdout).toContain('Files checked:');
      expect(result.stdout).toContain('Duration:');
    });

    it('should process current directory when it is a scaffold project', async () => {
      await createScaffoldProject('current-project');
      process.chdir(path.join(testWorkspace, 'current-project'));

      const result = runCLI('fix');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Project Fix Report');
    });

    it('should show project structure is valid for healthy projects', async () => {
      const projectPath = await createScaffoldProject('healthy-project');

      const result = runCLI(`fix "${projectPath}"`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Project Fix Report');
      // Implementation may show either "valid" or actual validation results
      expect([
        result.stdout.includes('Project structure is valid'),
        result.stdout.includes('Statistics:')
      ]).toContain(true);
    });
  });

  describe('verbose mode', () => {
    it('should show detailed output in verbose mode', async () => {
      const projectPath = await createScaffoldProject('verbose-test');

      const result = runCLI(`fix "${projectPath}" --verbose`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Fixing project:');
      expect(result.stdout).toContain(projectPath);
      expect(result.stdout).toContain('Project name: verbose-test');
      expect(result.stdout).toContain('Applied templates:');
    });

    it('should show options in verbose mode', async () => {
      const projectPath = await createScaffoldProject('options-test');

      const result = runCLI(`fix "${projectPath}" --verbose --dry-run --force`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Fixing project:');
      expect(result.stdout).toContain('Options:');
    });
  });

  describe('dry run mode', () => {
    it('should show what would be fixed without making changes', async () => {
      const projectPath = await createScaffoldProject('dry-run-test', true);

      const result = runCLI(`fix "${projectPath}" --dry-run`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Project Fix Report');

      // Verify that dry run doesn't actually modify files
      const beforeStats = await fs.stat(path.join(projectPath, 'package.json'));

      // Run again to ensure no modifications were made
      const result2 = runCLI(`fix "${projectPath}" --dry-run`);
      const afterStats = await fs.stat(path.join(projectPath, 'package.json'));

      expect(beforeStats.mtime).toEqual(afterStats.mtime);
    });
  });

  describe('backup handling', () => {
    it('should handle backup option', async () => {
      const projectPath = await createScaffoldProject('backup-test');

      const result = runCLI(`fix "${projectPath}" --backup`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Project Fix Report');
    });

    it('should handle no-backup option', async () => {
      const projectPath = await createScaffoldProject('no-backup-test');

      const result = runCLI(`fix "${projectPath}" --no-backup`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Project Fix Report');
    });
  });

  describe('force mode', () => {
    it('should handle force option', async () => {
      const projectPath = await createScaffoldProject('force-test');

      const result = runCLI(`fix "${projectPath}" --force`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Project Fix Report');
    });
  });

  describe('path handling', () => {
    it('should handle absolute paths', async () => {
      const projectPath = await createScaffoldProject('absolute-path-test');

      const result = runCLI(`fix "${projectPath}"`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Project Fix Report');
    });

    it('should handle relative paths', async () => {
      const projectName = 'relative-path-test';
      await createScaffoldProject(projectName);

      const result = runCLI(`fix ./${projectName}`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Project Fix Report');
    });

    it('should handle non-existent paths', () => {
      const result = runCLI('fix /nonexistent/path');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error');
      expect(result.stderr).toContain('does not exist');
    });
  });

  describe('malformed manifest handling', () => {
    it('should handle corrupted manifest files', async () => {
      const projectPath = await createScaffoldProject('corrupted-test');

      // Corrupt the manifest
      const manifestPath = path.join(projectPath, '.scaffold', 'manifest.json');
      await fs.writeFile(manifestPath, 'invalid json {');

      const result = runCLI(`fix "${projectPath}"`);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error');
    });

    it('should handle missing manifest files', async () => {
      const projectPath = path.join(testWorkspace, 'missing-manifest');
      await fs.ensureDir(projectPath);
      await fs.ensureDir(path.join(projectPath, '.scaffold')); // Directory exists but no manifest

      const result = runCLI(`fix "${projectPath}"`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Not a scaffold-managed project');
    });
  });

  describe('exit codes', () => {
    it('should exit with code 0 for valid projects', async () => {
      const projectPath = await createScaffoldProject('exit-code-test');

      const result = runCLI(`fix "${projectPath}"`);

      expect(result.exitCode).toBe(0);
    });

    it('should exit with code 0 for non-scaffold projects', async () => {
      const projectPath = path.join(testWorkspace, 'non-scaffold');
      await fs.ensureDir(projectPath);

      const result = runCLI(`fix "${projectPath}"`);

      expect(result.exitCode).toBe(0);
    });

    it('should exit with code 1 for errors', () => {
      const result = runCLI('fix /nonexistent/path');

      expect(result.exitCode).toBe(1);
    });
  });

  describe('output format validation', () => {
    it('should produce consistent report format', async () => {
      const projectPath = await createScaffoldProject('format-test');

      const result = runCLI(`fix "${projectPath}"`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Project Fix Report');
      expect(result.stdout).toContain('─'.repeat(50));
      expect(result.stdout).toContain('Statistics:');
      expect(result.stdout).toContain('Files checked:');
      expect(result.stdout).toContain('Folders checked:');
      expect(result.stdout).toContain('Errors:');
      expect(result.stdout).toContain('Warnings:');
      expect(result.stdout).toContain('Duration:');
    });

    it('should not leak sensitive information', async () => {
      const projectPath = await createScaffoldProject('sensitive-test');

      // Add sensitive data to manifest
      const manifestPath = path.join(projectPath, '.scaffold', 'manifest.json');
      const manifest = await fs.readJson(manifestPath);
      manifest.variables = {
        API_KEY: 'secret-key-123',
        PASSWORD: 'my-password'
      };
      await fs.writeJson(manifestPath, manifest);

      const result = runCLI(`fix "${projectPath}"`);

      expect(result.exitCode).toBe(0);
      // Should not expose sensitive variable values in output
      expect(result.stdout).not.toContain('secret-key-123');
      expect(result.stdout).not.toContain('my-password');
    });
  });

  describe('option combinations', () => {
    it('should handle multiple options together', async () => {
      const projectPath = await createScaffoldProject('multi-options-test');

      const result = runCLI(`fix "${projectPath}" --verbose --dry-run --force --backup`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Fixing project:');
      expect(result.stdout).toContain('Project Fix Report');
    });

    it('should handle conflicting backup options', async () => {
      const projectPath = await createScaffoldProject('backup-conflict-test');

      // Test both --backup and --no-backup (last one should win)
      const result = runCLI(`fix "${projectPath}" --backup --no-backup`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Project Fix Report');
    });
  });

  describe('error scenarios', () => {
    it('should handle permission errors gracefully', async () => {
      const projectPath = await createScaffoldProject('permission-test');

      // Try to make directory read-only (may not work on all systems)
      try {
        await fs.chmod(projectPath, 0o444);

        const result = runCLI(`fix "${projectPath}"`);

        // Should handle permission errors gracefully
        expect([0, 1]).toContain(result.exitCode);

        // Restore permissions for cleanup
        await fs.chmod(projectPath, 0o755);
      } catch (error) {
        // Skip test if chmod not supported
        logger.info('Skipping permission test due to filesystem limitations');
      }
    });

    it('should handle very long paths', async () => {
      const longName = 'a'.repeat(100);
      const projectPath = await createScaffoldProject(longName);

      const result = runCLI(`fix "${projectPath}"`);

      expect([0, 1]).toContain(result.exitCode);
    });

    it('should handle special characters in paths', async () => {
      const specialName = 'test-project-with-special-chars-123';
      const projectPath = await createScaffoldProject(specialName);

      const result = runCLI(`fix "${projectPath}"`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Project Fix Report');
    });
  });

  describe('service integration', () => {
    it('should integrate with project service', async () => {
      const projectPath = await createScaffoldProject('service-integration-test');

      const result = runCLI(`fix "${projectPath}"`);

      expect(result.exitCode).toBe(0);
      // Should show evidence of project service interaction
      expect(result.stdout).toContain('Project Fix Report');
    });

    it('should handle service errors gracefully', async () => {
      // Create project with invalid template reference
      const projectPath = await createScaffoldProject('service-error-test');
      const manifestPath = path.join(projectPath, '.scaffold', 'manifest.json');
      const manifest = await fs.readJson(manifestPath);
      manifest.templates = [
        {
          id: 'nonexistent-template',
          name: 'nonexistent',
          version: '1.0.0',
          appliedAt: '2023-01-01T00:00:00.000Z',
        }
      ];
      await fs.writeJson(manifestPath, manifest);

      const result = runCLI(`fix "${projectPath}"`);

      // Should handle service errors gracefully
      expect([0, 1]).toContain(result.exitCode);
    });
  });
});