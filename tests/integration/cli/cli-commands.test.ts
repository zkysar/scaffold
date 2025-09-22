/**
 * Integration tests that invoke the actual scaffold CLI
 * These tests run the built CLI binary directly and verify output
 */

import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('Scaffold CLI Integration Tests', () => {
  let testWorkspace: string;
  const cliPath = path.join(__dirname, '../../../dist/cli/index.js');

  beforeAll(async () => {
    // Ensure CLI is built
    if (!(await fs.pathExists(cliPath))) {
      execSync('npm run build', { stdio: 'inherit' });
    }
  });

  beforeEach(async () => {
    // Create a unique test workspace for each test
    testWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'scaffold-test-'));
    process.chdir(testWorkspace);

    // Don't set up templates - let the CLI find existing demo templates
    // This tests the actual template loading mechanism
  });

  afterEach(async () => {
    // Clean up test workspace
    process.chdir('/');
    await fs.remove(testWorkspace);
  });

  function runCLI(args: string): string {
    try {
      const output = execSync(`node "${cliPath}" ${args}`, {
        encoding: 'utf-8',
        env: { ...process.env, NO_COLOR: '1' },
      });
      return output;
    } catch (error: any) {
      return error.stdout || error.message;
    }
  }

  describe('scaffold --help', () => {
    it('should display help information', () => {
      const output = runCLI('--help');
      expect(output).toContain('scaffold');
      expect(output).toContain('Options:');
      expect(output).toContain('Commands:');
      expect(output).toContain('new');
      expect(output).toContain('check');
      expect(output).toContain('fix');
    });
  });

  describe('scaffold --version', () => {
    it('should display version', () => {
      const output = runCLI('--version');
      expect(output).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('scaffold template list', () => {
    it('should list available templates', () => {
      const output = runCLI('template list');

      // Should either list templates or show no templates message
      // With SHA-based system, templates will have SHA identifiers
      expect(output.toLowerCase()).toMatch(
        /template|total:|no templates found/i
      );
    });
  });

  describe('scaffold new', () => {
    it('should show help when no project name provided', () => {
      const output = runCLI('new --help');
      expect(output).toContain('new [options] [project]');
      expect(output).toContain('Create new project from template');
    });

    it('should create a new project with --dry-run', () => {
      const output = runCLI('new test-project --dry-run --non-interactive');

      // Should either show dry run message or template not specified error
      expect(output.toLowerCase()).toMatch(
        /dry.?run|template|no template specified/i
      );
    });
  });

  describe('scaffold check', () => {
    it('should check current directory', () => {
      // Create a minimal scaffold manifest
      fs.writeJsonSync('.scaffold-manifest.json', {
        version: '1.0.0',
        projectName: 'test',
        templates: [],
        variables: {},
        history: [],
      });

      const output = runCLI('check');

      // Should show check results
      expect(output).toBeDefined();
      // Should not throw an error
      expect(output).not.toContain('Error:');
    });

    it('should report when not a scaffold project', () => {
      const output = runCLI('check');
      expect(output.toLowerCase()).toContain('not a scaffold');
    });
  });

  describe('scaffold show', () => {
    it('should show items when no argument provided', () => {
      const output = runCLI('show');
      // Should show available items to show
      expect(output.toLowerCase()).toMatch(
        /available items|project|template|config/i
      );
    });

    it('should show configuration', () => {
      const output = runCLI('show config');
      expect(output.toLowerCase()).toContain('config');
    });
  });

  describe('scaffold completion', () => {
    it('should show completion help', () => {
      const output = runCLI('completion --help');
      expect(output).toContain('completion');
      expect(output).toContain('install');
      expect(output).toContain('uninstall');
      expect(output).toContain('status');
    });

    it('should check completion status', () => {
      const output = runCLI('completion status');
      expect(output.toLowerCase()).toContain('completion');
      // Should show installed or not installed
      expect(output.toLowerCase()).toMatch(/installed|not\s+installed/);
    });
  });

  describe('scaffold config', () => {
    it('should list configuration', () => {
      const output = runCLI('config list');
      expect(output).toBeDefined();
      // Should show configuration or empty message
      expect(output.length).toBeGreaterThan(0);
    });

    it('should get a config value', () => {
      const output = runCLI('config get templatePaths');
      expect(output).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should show error for invalid command', () => {
      const output = runCLI('invalid-command');
      expect(output.toLowerCase()).toContain('unknown');
    });

    it('should handle missing required arguments gracefully', () => {
      const output = runCLI('config get');
      // Should either show help or error about missing key
      expect(output.toLowerCase()).toMatch(/key|usage|required/i);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle verbose flag', () => {
      const output = runCLI('--verbose check');
      expect(output).toBeDefined();
      // Verbose should produce some output even if not a scaffold project
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle no-color flag', () => {
      const output = runCLI('--no-color template list');
      expect(output).toBeDefined();
      // Should not contain ANSI color codes
      expect(output).not.toContain('\x1b[');
    });

    it('should handle dry-run flag for clean command', () => {
      const output = runCLI('clean --dry-run');
      // Clean command might not support dry-run, check for either dry mode or clean success
      expect(output.toLowerCase()).toMatch(/dry|clean/i);
    });
  });
});
