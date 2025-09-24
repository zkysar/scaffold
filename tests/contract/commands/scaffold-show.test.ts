/**
 * Contract tests for 'scaffold show' command
 * Tests MUST fail initially as no implementation exists yet (TDD)
 */

import { createShowCommand } from '@/cli/commands/show.command';
import {
  createMockFileSystem,
  createMockConsole,
  CommandResult,
} from '@tests/helpers/cli-helpers';
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

describe('scaffold show command contract', () => {
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

  describe('show project information', () => {
    it('should show project info by default', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/current/dir': {
          '.scaffold': {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              projectName: 'test-project',
              templates: [
                {
                  name: 'react',
                  version: '2.0.0',
                  appliedAt: '2023-01-01T00:00:00.000Z',
                },
                {
                  name: 'typescript',
                  version: '1.5.0',
                  appliedAt: '2023-01-02T00:00:00.000Z',
                },
              ],
              variables: { author: 'John Doe', version: '2.0.0' },
              created: '2023-01-01T00:00:00.000Z',
              updated: '2023-01-02T00:00:00.000Z',
              history: [],
            }),
          },
          src: {},
          'package.json': '{"name": "test-project"}',
        },
      });
      mockFs(mockFileSystem);

      // Mock process.cwd()
      jest.spyOn(process, 'cwd').mockReturnValue('/current/dir');

      // Act
      const command = createShowCommand();
      const result = await executeCommand(command, []);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('Project Information:');
      expect(mockConsole.logs.join(' ')).toContain(
        'Project Name: test-project'
      );
      expect(mockConsole.logs.join(' ')).toContain('Version: 1.0.0');
      expect(mockConsole.logs.join(' ')).toContain('Applied Templates:');
      expect(mockConsole.logs.join(' ')).toContain('react@2.0.0');
      expect(mockConsole.logs.join(' ')).toContain('typescript@1.5.0');
      expect(mockConsole.logs.join(' ')).toContain('Variables:');
      expect(mockConsole.logs.join(' ')).toContain('author: John Doe');
    });

    it('should show project info explicitly', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/current/dir': {
          '.scaffold': {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              projectName: 'example-project',
              templates: [],
              variables: {},
              created: '2023-01-01T00:00:00.000Z',
              updated: '2023-01-01T00:00:00.000Z',
              history: [],
            }),
          },
        },
      });
      mockFs(mockFileSystem);

      // Mock process.cwd()
      jest.spyOn(process, 'cwd').mockReturnValue('/current/dir');

      // Act
      const command = createShowCommand();
      const result = await executeCommand(command, ['project']);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('Project Information:');
      expect(mockConsole.logs.join(' ')).toContain(
        'Project Name: example-project'
      );
    });

    it('should handle non-scaffold-managed project gracefully', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/current/dir': {
          'package.json': '{"name": "regular-project"}',
          src: {},
        },
      });
      mockFs(mockFileSystem);

      // Mock process.cwd()
      jest.spyOn(process, 'cwd').mockReturnValue('/current/dir');

      // Act
      const command = createShowCommand();
      const result = await executeCommand(command, ['project']);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain(
        'This directory is not a scaffold-managed project'
      );
      expect(mockConsole.logs.join(' ')).toContain('Use "scaffold new"');
    });

    it('should show project info in JSON format', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/current/dir': {
          '.scaffold': {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              projectName: 'json-project',
              templates: [],
              variables: {},
              created: '2023-01-01T00:00:00.000Z',
              updated: '2023-01-01T00:00:00.000Z',
              history: [],
            }),
          },
        },
      });
      mockFs(mockFileSystem);

      // Mock process.cwd()
      jest.spyOn(process, 'cwd').mockReturnValue('/current/dir');

      // Act
      const command = createShowCommand();
      const result = await executeCommand(command, [
        'project',
        '--format',
        'json',
      ]);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain(
        '"projectName": "json-project"'
      );
      expect(mockConsole.logs.join(' ')).toContain('"version": "1.0.0"');
    });

    it('should show detailed info in verbose mode', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/current/dir': {
          '.scaffold': {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              projectName: 'verbose-project',
              templates: [
                {
                  name: 'react',
                  version: '2.0.0',
                  appliedAt: '2023-01-01T12:00:00.000Z',
                },
              ],
              variables: {},
              created: '2023-01-01T00:00:00.000Z',
              updated: '2023-01-01T12:00:00.000Z',
              history: [],
            }),
          },
        },
      });
      mockFs(mockFileSystem);

      // Mock process.cwd()
      jest.spyOn(process, 'cwd').mockReturnValue('/current/dir');

      // Act
      const command = createShowCommand();
      const result = await executeCommand(command, ['project', '--verbose']);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain(
        'Applied: 2023-01-01T12:00:00.000Z'
      );
    });
  });

  describe('show template information', () => {
    it('should show available templates', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {
          'react.json': JSON.stringify({
            name: 'react',
            id: 'react-template',
            version: '2.0.0',
            description: 'React application template',
            folders: ['src/components'],
            files: [],
            variables: [],
            rules: { strict: true },
          }),
          'typescript.json': JSON.stringify({
            name: 'typescript',
            id: 'typescript-template',
            version: '1.5.0',
            description: 'TypeScript configuration template',
            folders: [],
            files: [],
            variables: [],
            rules: { strict: true },
          }),
        },
      });
      mockFs(mockFileSystem);

      // Act
      const command = createShowCommand();
      const result = await executeCommand(command, ['template']);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('Template Information:');
      expect(mockConsole.logs.join(' ')).toContain('react (react-template)');
      expect(mockConsole.logs.join(' ')).toContain(
        'typescript (typescript-template)'
      );
      expect(mockConsole.logs.join(' ')).toContain('Version: 2.0.0');
      expect(mockConsole.logs.join(' ')).toContain(
        'Description: React application template'
      );
      expect(mockConsole.logs.join(' ')).toContain('Total: 2 templates');
    });

    it('should show templates alias', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {},
      });
      mockFs(mockFileSystem);

      // Act
      const command = createShowCommand();
      const result = await executeCommand(command, ['templates']);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('Template Information:');
      expect(mockConsole.logs.join(' ')).toContain('No templates available');
    });

    it('should show templates in JSON format', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {
          'react.json': JSON.stringify({
            name: 'react',
            id: 'react-template',
            version: '2.0.0',
            description: 'React template',
            folders: [],
            files: [],
            variables: [],
            rules: { strict: true },
          }),
        },
      });
      mockFs(mockFileSystem);

      // Act
      const command = createShowCommand();
      const result = await executeCommand(command, [
        'template',
        '--format',
        'json',
      ]);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('"name": "react"');
      expect(mockConsole.logs.join(' ')).toContain('"version": "2.0.0"');
    });
  });

  describe('show configuration information', () => {
    it('should show configuration settings', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/config.json': JSON.stringify({
          paths: {
            templatesDir: '/home/.scaffold/templates',
            cacheDir: '/home/.scaffold/cache',
            backupDir: '/home/.scaffold/backup',
          },
          preferences: {
            strictModeDefault: true,
            colorOutput: true,
            verboseOutput: false,
            confirmDestructive: true,
            backupBeforeSync: true,
          },
        }),
      });
      mockFs(mockFileSystem);

      // Act
      const command = createShowCommand();
      const result = await executeCommand(command, ['config']);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain(
        'Configuration Information:'
      );
      expect(mockConsole.logs.join(' ')).toContain('Templates Directory:');
      expect(mockConsole.logs.join(' ')).toContain('Cache Directory:');
      expect(mockConsole.logs.join(' ')).toContain(
        'Strict Mode Default: Enabled'
      );
      expect(mockConsole.logs.join(' ')).toContain('Color Output: Yes');
    });

    it('should show configuration alias', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({});
      mockFs(mockFileSystem);

      // Act
      const command = createShowCommand();
      const result = await executeCommand(command, ['configuration']);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain(
        'Configuration Information:'
      );
    });

    it('should show configuration in JSON format', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({});
      mockFs(mockFileSystem);

      // Act
      const command = createShowCommand();
      const result = await executeCommand(command, [
        'config',
        '--format',
        'json',
      ]);

      // Assert
      expect(result.code).toBe(0);
      // Configuration service implementation will determine the exact output
    });

    it('should handle missing configuration gracefully', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({});
      mockFs(mockFileSystem);

      // Act
      const command = createShowCommand();
      const result = await executeCommand(command, ['config']);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain(
        'Configuration Information:'
      );
    });
  });

  describe('show all information', () => {
    it('should show all available information', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/current/dir': {
          '.scaffold': {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              projectName: 'complete-project',
              templates: [
                {
                  name: 'react',
                  version: '2.0.0',
                  appliedAt: '2023-01-01T00:00:00.000Z',
                },
              ],
              variables: {},
              created: '2023-01-01T00:00:00.000Z',
              updated: '2023-01-01T00:00:00.000Z',
              history: [],
            }),
          },
        },
        '/home/.scaffold/templates': {
          'react.json': JSON.stringify({
            name: 'react',
            id: 'react-template',
            version: '2.0.0',
            description: 'React template',
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
      const command = createShowCommand();
      const result = await executeCommand(command, ['all']);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain(
        '=== Scaffold Information ==='
      );
      expect(mockConsole.logs.join(' ')).toContain('Project Information:');
      expect(mockConsole.logs.join(' ')).toContain('Template Information:');
      expect(mockConsole.logs.join(' ')).toContain(
        'Configuration Information:'
      );
    });

    it('should show all information in verbose mode', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/current/dir': {
          '.scaffold': {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              projectName: 'verbose-all-project',
              templates: [],
              variables: {},
              created: '2023-01-01T00:00:00.000Z',
              updated: '2023-01-01T00:00:00.000Z',
              history: [],
            }),
          },
        },
      });
      mockFs(mockFileSystem);

      // Mock process.cwd()
      jest.spyOn(process, 'cwd').mockReturnValue('/current/dir');

      // Act
      const command = createShowCommand();
      const result = await executeCommand(command, ['all', '--verbose']);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('Show item: all');
      expect(mockConsole.logs.join(' ')).toContain('Format: table');
    });
  });

  describe('error scenarios', () => {
    it('should fail with unknown item (exit code 1)', async () => {
      // Act
      const command = createShowCommand();
      const result = await executeCommand(command, ['unknown-item']);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Error');
      expect(mockConsole.errors.join(' ')).toContain(
        'Unknown item: unknown-item'
      );
      expect(mockConsole.logs.join(' ')).toContain(
        'Available items: project, template, config, all'
      );
    });

    it('should handle malformed manifest gracefully', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/current/dir': {
          '.scaffold': {
            'manifest.json': 'invalid json {',
          },
        },
      });
      mockFs(mockFileSystem);

      // Mock process.cwd()
      jest.spyOn(process, 'cwd').mockReturnValue('/current/dir');

      // Act
      const command = createShowCommand();
      const result = await executeCommand(command, ['project']);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Error');
    });

    it('should handle service implementation errors gracefully', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({});
      mockFs(mockFileSystem);

      // Act
      const command = createShowCommand();
      const result = await executeCommand(command, ['template']);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('Command structure created');
    });
  });

  describe('edge cases', () => {
    it('should handle verbose mode with all items', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({});
      mockFs(mockFileSystem);

      // Act
      const command = createShowCommand();
      const result = await executeCommand(command, ['--verbose']);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('Show item: project');
      expect(mockConsole.logs.join(' ')).toContain('Format: table');
    });

    it('should handle different format options', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({});
      mockFs(mockFileSystem);

      // Act - Test summary format
      const command1 = createShowCommand();
      const result1 = await executeCommand(command1, [
        'project',
        '--format',
        'summary',
      ]);

      // Act - Test table format (default)
      const command2 = createShowCommand();
      const result2 = await executeCommand(command2, [
        'project',
        '--format',
        'table',
      ]);

      // Assert
      expect(result1.code).toBe(0);
      expect(result2.code).toBe(0);
    });

    it('should handle case-insensitive item names', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({});
      mockFs(mockFileSystem);

      // Act
      const command = createShowCommand();
      const result = await executeCommand(command, ['PROJECT']);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain(
        'This directory is not a scaffold-managed project'
      );
    });

    it('should handle project with no templates', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/current/dir': {
          '.scaffold': {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              projectName: 'empty-templates-project',
              templates: [],
              variables: {},
              created: '2023-01-01T00:00:00.000Z',
              updated: '2023-01-01T00:00:00.000Z',
              history: [],
            }),
          },
        },
      });
      mockFs(mockFileSystem);

      // Mock process.cwd()
      jest.spyOn(process, 'cwd').mockReturnValue('/current/dir');

      // Act
      const command = createShowCommand();
      const result = await executeCommand(command, ['project']);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('No templates applied');
    });

    it('should handle project with no variables', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/current/dir': {
          '.scaffold': {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              projectName: 'no-vars-project',
              templates: [
                {
                  name: 'react',
                  version: '2.0.0',
                  appliedAt: '2023-01-01T00:00:00.000Z',
                },
              ],
              variables: {},
              created: '2023-01-01T00:00:00.000Z',
              updated: '2023-01-01T00:00:00.000Z',
              history: [],
            }),
          },
        },
      });
      mockFs(mockFileSystem);

      // Mock process.cwd()
      jest.spyOn(process, 'cwd').mockReturnValue('/current/dir');

      // Act
      const command = createShowCommand();
      const result = await executeCommand(command, ['project']);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain(
        'Project Name: no-vars-project'
      );
      // Should not show Variables section when empty
    });

    it('should handle combined options correctly', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({});
      mockFs(mockFileSystem);

      // Act
      const command = createShowCommand();
      const result = await executeCommand(command, [
        'config',
        '--verbose',
        '--format',
        'json',
      ]);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('Show item: config');
      expect(mockConsole.logs.join(' ')).toContain('Format: json');
    });
  });
});
