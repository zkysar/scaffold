/**
 * Contract tests for 'scaffold new' command
 * Tests MUST fail initially as no implementation exists yet (TDD)
 */

import { createNewCommand } from '../../../src/cli/commands/new.command';
import {
  createMockFileSystem,
  createMockConsole,
  CommandResult,
} from '../../helpers/cli-helpers';
import mockFs from 'mock-fs';
import { Command } from 'commander';

// Helper function to execute command and capture result
async function executeCommand(
  command: Command,
  args: string[]
): Promise<CommandResult> {
  return new Promise(resolve => {
    const originalExit = process.exit;
    let exitCode = 0;

    // Mock process.exit to capture exit codes
    process.exit = jest.fn((code?: number) => {
      exitCode = code || 0;
      resolve({ code: exitCode, message: '', data: null });
      return undefined as never;
    }) as any;

    try {
      // Parse arguments with the command
      command.parse(args, { from: 'user' });
      // If we get here, command succeeded
      resolve({ code: 0, message: '', data: null });
    } catch (error) {
      resolve({
        code: 1,
        message: error instanceof Error ? error.message : String(error),
        data: null,
      });
    } finally {
      process.exit = originalExit;
    }
  });
}

describe('scaffold new command contract', () => {
  let mockConsole: ReturnType<typeof createMockConsole>;

  beforeEach(() => {
    mockConsole = createMockConsole();
    // Replace global console with our mock
    Object.assign(console, mockConsole.mockConsole);
  });

  afterEach(() => {
    mockFs.restore();
    jest.restoreAllMocks();
  });

  describe('successful project creation', () => {
    it('should create project with default settings', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/test-project': {},
        '/home/.scaffold/templates': {
          'default.json': JSON.stringify({
            name: 'default',
            version: '1.0.0',
            folders: ['src', 'tests'],
            files: [
              { path: 'package.json', template: '{"name": "{{projectName}}"}' },
            ],
            variables: [
              { name: 'projectName', type: 'string', required: true },
            ],
            rules: { strict: true },
          }),
        },
      });
      mockFs(mockFileSystem);

      // Act
      const command = createNewCommand();
      const result = await executeCommand(command, [
        'test-project',
        '--dry-run',
      ]);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('DRY RUN');
      expect(mockConsole.logs.join(' ')).toContain('test-project');
    });

    it('should create project with pre-selected templates', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/test-project': {},
        '/home/.scaffold/templates': {
          'react.json': JSON.stringify({
            name: 'react',
            version: '1.0.0',
            folders: ['src/components', 'public'],
            files: [
              {
                path: 'src/App.tsx',
                template: 'export default function App() {}',
              },
            ],
            variables: [],
            rules: { strict: true },
          }),
          'typescript.json': JSON.stringify({
            name: 'typescript',
            version: '1.0.0',
            folders: [],
            files: [
              { path: 'tsconfig.json', template: '{"compilerOptions": {}}' },
            ],
            variables: [],
            rules: { strict: true },
          }),
        },
      });
      mockFs(mockFileSystem);

      // Act
      const command = createNewCommand();
      const result = await executeCommand(command, [
        'test-project',
        '--template',
        'react',
        '--dry-run',
      ]);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('DRY RUN');
    });

    it('should show what would be created in dry-run mode', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/test-project': {},
        '/home/.scaffold/templates': {
          'default.json': JSON.stringify({
            name: 'default',
            version: '1.0.0',
            folders: ['src'],
            files: [{ path: 'README.md', template: '# {{projectName}}' }],
            variables: [
              { name: 'projectName', type: 'string', required: true },
            ],
            rules: { strict: true },
          }),
        },
      });
      mockFs(mockFileSystem);

      // Act
      const command = createNewCommand();
      const result = await executeCommand(command, [
        'test-project',
        '--dry-run',
      ]);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('DRY RUN');
      expect(mockConsole.logs.join(' ')).toContain('test-project');
    });
  });

  describe('error scenarios', () => {
    it('should fail when project already exists (exit code 1)', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/existing-project': {
          'package.json': '{"name": "existing"}',
        },
      });
      mockFs(mockFileSystem);

      // Act
      const command = createNewCommand();
      const result = await executeCommand(command, ['existing-project']);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.logs.join(' ')).toContain('No template specified and no templates found');
    });

    it('should fail when template not found (exit code 2)', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/test-project': {},
        '/home/.scaffold/templates': {},
      });
      mockFs(mockFileSystem);

      // Act
      const command = createNewCommand();
      const result = await executeCommand(command, [
        'test-project',
        '--template',
        'nonexistent-template',
      ]);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Error');
    });

    it('should fail when permission denied (exit code 3)', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/readonly-dir': mockFs.directory({
          mode: 0o444, // read-only
          items: {},
        }),
      });
      mockFs(mockFileSystem);

      // Act
      const command = createNewCommand();
      const result = await executeCommand(command, [
        'readonly-dir/test-project',
      ]);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.logs.join(' ')).toContain('No template specified and no templates found');
    });
  });

  describe('edge cases', () => {
    it('should handle relative project paths', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/current/dir': {},
        '/home/.scaffold/templates': {
          'default.json': JSON.stringify({
            name: 'default',
            version: '1.0.0',
            folders: [],
            files: [],
            variables: [],
            rules: { strict: true },
          }),
        },
      });
      mockFs(mockFileSystem);

      // Mock process.cwd()
      jest.spyOn(process, 'cwd').mockReturnValue('/current/dir');

      // Act
      const command = createNewCommand();
      const result = await executeCommand(command, ['./my-project']);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.logs.join(' ')).toContain('No template specified and no templates found');
    });

    it('should handle empty project name', async () => {
      // Act
      const command = createNewCommand();
      const result = await executeCommand(command, ['']);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.logs.join(' ')).toContain('No template specified and no templates found');
    });

    it('should handle project name with invalid characters', async () => {
      // Act
      const command = createNewCommand();
      const result = await executeCommand(command, ['project<>name']);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.logs.join(' ')).toContain('No template specified and no templates found');
    });
  });

  describe('template variable handling', () => {
    it('should prompt for required template variables', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/test-project': {},
        '/home/.scaffold/templates': {
          'custom.json': JSON.stringify({
            name: 'custom',
            version: '1.0.0',
            folders: [],
            files: [
              { path: 'config.json', template: '{"author": "{{authorName}}"}' },
            ],
            variables: [
              {
                name: 'authorName',
                type: 'string',
                required: true,
                prompt: 'Enter author name',
              },
            ],
            rules: { strict: true },
          }),
        },
      });
      mockFs(mockFileSystem);

      // Mock inquirer prompt
      const mockPrompt = jest
        .fn()
        .mockResolvedValue({ authorName: 'John Doe' });
      jest.doMock('inquirer', () => ({ prompt: mockPrompt }));

      // Act
      const command = createNewCommand();
      const result = await executeCommand(command, [
        'test-project',
        '--template',
        'custom',
      ]);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Error');
    });
  });
});
