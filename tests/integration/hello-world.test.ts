/**
 * Hello World Integration Test Example
 * This demonstrates how to call the CLI and test its output
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';

describe('Hello World CLI Integration Test', () => {
  const cliPath = path.join(__dirname, '../../dist/cli/index.js');

  beforeAll(async () => {
    // Ensure CLI is built
    if (!(await fs.pathExists(cliPath))) {
      console.log('Building CLI...');
      execSync('npm run build', { stdio: 'inherit' });
    }
  });

  function runCLI(args: string): string {
    try {
      const output = execSync(`node "${cliPath}" ${args}`, {
        encoding: 'utf-8',
        env: { ...process.env, NO_COLOR: '1' },
      });
      return output;
    } catch (error: any) {
      // Return error output if command fails
      return error.stdout || error.stderr || error.message;
    }
  }

  it('should display help when --help is passed', () => {
    // Act - Run the CLI with --help flag
    const output = runCLI('--help');

    // Assert - Check that help text is displayed
    expect(output).toContain('scaffold');
    expect(output).toContain('Options:');
    expect(output).toContain('Commands:');
  });

  it('should display version when --version is passed', () => {
    // Act - Run the CLI with --version flag
    const output = runCLI('--version');

    // Assert - Check that version is displayed (format: x.x.x)
    expect(output).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should handle unknown commands gracefully', () => {
    // Act - Run the CLI with an invalid command
    const output = runCLI('unknown-command');

    // Assert - Check that error message is shown
    expect(output.toLowerCase()).toContain('unknown');
  });
});
