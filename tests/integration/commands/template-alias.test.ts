/**
 * Integration tests for scaffold template alias command
 */

import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';


import { logger } from '@/lib/logger';
describe('scaffold template alias command (integration)', () => {
  let tempDir: string;
  let originalCwd: string;
  let cliPath: string;

  beforeAll(async () => {
    // Ensure CLI is built
    cliPath = path.join(__dirname, '../../../dist/cli/index.js');
    if (!(await fs.pathExists(cliPath))) {
      execSync('npm run build', { stdio: 'inherit' });
    }
  });

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scaffold-alias-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    // Cleanup
    process.chdir(originalCwd);
    await fs.remove(tempDir);
  });

  function runCLI(args: string): { stdout: string; stderr: string; exitCode: number } {
    try {
      const result = execSync(`node "${cliPath}" ${args}`, {
        encoding: 'utf-8',
        env: { ...process.env, NO_COLOR: '1', HOME: tempDir },
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
    it('should display help for template alias command', () => {
      const result = runCLI('template alias --help');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('alias');
      expect(result.stdout).toContain('Usage:');
    });

  });

  describe('error scenarios', () => {
    it('should error when creating alias for non-existent template', () => {
      const fakeSHA = 'a'.repeat(64);
      const aliasName = 'test-invalid-alias';

      const result = runCLI(`template alias ${fakeSHA} ${aliasName}`);

      expect(result.exitCode).toBe(1);
      const errorOutput = result.stdout + result.stderr;
      expect(errorOutput).toContain('not found');
    });

    it('should error with invalid template SHA first', () => {
      const validSHA = 'a'.repeat(64);
      const invalidAlias = '../etc/passwd';

      const result = runCLI(`template alias ${validSHA} "${invalidAlias}"`);

      expect(result.exitCode).toBe(1);
      const errorOutput = result.stdout + result.stderr;
      expect(errorOutput).toContain('not found');
    });

    it('should error when no arguments provided', () => {
      const result = runCLI('template alias');

      expect(result.exitCode).toBe(1);
      const errorOutput = result.stdout + result.stderr;
      expect(errorOutput).toContain('required');
    });
  });
});