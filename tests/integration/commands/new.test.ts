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
    it('should exit with error for invalid project name', () => {
      const result = runCLI('new "project with spaces" --template any-template --dry-run');

      expect(result.exitCode).toBe(1);
      const errorOutput = result.stdout + result.stderr;
      expect(errorOutput).toContain('Project name can only contain letters, numbers, dashes, and underscores');
    });
  });

  describe('template handling', () => {
    it('should show message when no templates available', () => {
      const result = runCLI('new my-project');

      // Since no templates are available, should show guidance message
      expect(result.stdout).toContain('No template specified');
      expect(result.stdout).toContain('Use --template option');
    });
  });

  describe('variable handling', () => {
    it('should show no template message when no template specified', () => {
      const result = runCLI('new test-project --variables "{}"');

      expect(result.exitCode).toBe(1);
      const errorOutput = result.stdout + result.stderr;
      expect(errorOutput).toContain('No template specified');
    });
  });

  describe('input validation', () => {
    it('should validate project names', () => {
      const result = runCLI('new "project with spaces" --template any-template');

      expect(result.exitCode).toBe(1);
      const errorOutput = result.stdout + result.stderr;
      expect(errorOutput).toContain('Project name can only contain letters, numbers, dashes, and underscores');
    });
  });






  describe('exit codes', () => {
    it('should exit with code 1 for invalid arguments', () => {
      const result = runCLI('new test-project --variables "invalid-json"');
      expect(result.exitCode).toBe(1);
    });
  });


});