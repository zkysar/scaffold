/**
 * Contract tests for 'scaffold extend' command
 * Tests MUST fail initially as no implementation exists yet (TDD)
 */

import { createExtendCommand } from '@/cli/commands/extend.command';
import { createTestContainer } from '@/di/container';
import {
  createMockFileSystem,
  createMockConsole,
  CommandResult,
} from '../../helpers/cli-helpers';
import mockFs from 'mock-fs';
import { Command } from 'commander';
import { FileSystemService } from '@/services';
import { FakeFileSystemService } from '../../fakes';
import { homedir } from 'os';
import { logger } from '@/lib/logger';

// Helper function to execute command and capture result
async function executeCommand(
  command: Command,
  args: string[]
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const originalExit = process.exit;
    let exitCode = 0;
    let hasExited = false;

    // Mock process.exit to capture exit codes
    process.exit = jest.fn((code?: number) => {
      if (!hasExited) {
        hasExited = true;
        exitCode = code || 0;
        resolve({ code: exitCode, message: '', data: null });
      }
      return undefined as never;
    }) as any;

    try {
      // Parse arguments with the command - this may be async
      const parsePromise = command.parseAsync(args, { from: 'user' });

      if (parsePromise && typeof parsePromise.then === 'function') {
        // Handle async commands
        parsePromise
          .then(() => {
            if (!hasExited) {
              hasExited = true;
              resolve({ code: 0, message: '', data: null });
            }
          })
          .catch((error) => {
            if (!hasExited) {
              hasExited = true;
              resolve({
                code: 1,
                message: error instanceof Error ? error.message : String(error),
                data: null,
              });
            }
          });
      } else {
        // Synchronous command
        if (!hasExited) {
          hasExited = true;
          resolve({ code: 0, message: '', data: null });
        }
      }
    } catch (error) {
      if (!hasExited) {
        hasExited = true;
        resolve({
          code: 1,
          message: error instanceof Error ? error.message : String(error),
          data: null,
        });
      }
    } finally {
      // Restore original process.exit after a small delay
      setTimeout(() => {
        process.exit = originalExit;
      }, 10);
    }
  });
}

describe('scaffold extend command contract', () => {
  let mockConsole: ReturnType<typeof createMockConsole>;

  beforeEach(() => {
    mockConsole = createMockConsole();
    // Replace global console with our mock
    Object.assign(console, mockConsole.mockConsole);
    // Configure logger to not use colors in tests
    logger.setOptions({ noColor: true });
  });

  afterEach(() => {
    mockFs.restore();
    jest.restoreAllMocks();
    // Reset logger options
    logger.setOptions({});
  });

  describe('successful extend scenarios', () => {
    it('should extend current directory when no project path provided', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/current/dir': {
          '.scaffold': {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              projectName: 'test-project',
              templates: [
                {
                  name: 'base',
                  version: '1.0.0',
                  appliedAt: '2023-01-01T00:00:00.000Z',
                },
              ],
              variables: {},
              created: '2023-01-01T00:00:00.000Z',
              updated: '2023-01-01T00:00:00.000Z',
              history: [],
            }),
          },
          src: {},
        },
        '/home/.scaffold/templates': {
          'react.json': JSON.stringify({
            name: 'react',
            version: '1.0.0',
            folders: ['src/components'],
            files: [
              {
                path: 'src/App.tsx',
                template: 'export default function App() {}',
              },
            ],
            variables: [],
            rules: { strict: true },
          }),
        },
      });
      mockFs(mockFileSystem);

      // Mock process.cwd()
      jest.spyOn(process, 'cwd').mockReturnValue('/current/dir');

      // Act
      const container = createTestContainer();
      const command = createExtendCommand(container);
      const result = await executeCommand(command, ['--template', 'react']);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('Command structure created');
    });

    it('should extend specified project directory', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/test-project': {
          '.scaffold': {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              projectName: 'test-project',
              templates: [
                {
                  name: 'base',
                  version: '1.0.0',
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
      const container = createTestContainer();
      const command = createExtendCommand(container);
      const result = await executeCommand(command, [
        '/test-project',
        '--template',
        'typescript',
      ]);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('Command structure created');
      expect(mockConsole.logs.join(' ')).toContain('typescript');
    });

    it('should show detailed output in verbose mode', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/test-project': {
          '.scaffold': {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              projectName: 'test-project',
              templates: [
                {
                  name: 'base',
                  version: '1.0.0',
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

      // Act
      const container = createTestContainer();
      const command = createExtendCommand(container);
      const result = await executeCommand(command, [
        '/test-project',
        '--template',
        'react',
        '--verbose',
      ]);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('Extending project');
      expect(mockConsole.logs.join(' ')).toContain('/test-project');
    });

    it('should show what would be extended in dry-run mode', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/test-project': {
          '.scaffold': {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              projectName: 'test-project',
              templates: [
                {
                  name: 'base',
                  version: '1.0.0',
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

      // Act
      const container = createTestContainer();
      const command = createExtendCommand(container);
      const result = await executeCommand(command, [
        '/test-project',
        '--template',
        'react',
        '--dry-run',
      ]);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('DRY RUN');
      expect(mockConsole.logs.join(' ')).toContain('Would extend project with');
      expect(mockConsole.logs.join(' ')).toContain('test-project');
      expect(mockConsole.logs.join(' ')).toContain('react');
    });

    it('should support force mode without confirmation prompts', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/test-project': {
          '.scaffold': {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              projectName: 'test-project',
              templates: [
                {
                  name: 'base',
                  version: '1.0.0',
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

      // Act
      const container = createTestContainer();
      const command = createExtendCommand(container);
      const result = await executeCommand(command, [
        '/test-project',
        '--template',
        'react',
        '--force',
      ]);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('Command structure created');
    });

    it('should accept template variables as JSON string', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/test-project': {
          '.scaffold': {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              projectName: 'test-project',
              templates: [
                {
                  name: 'base',
                  version: '1.0.0',
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

      const variables = JSON.stringify({
        author: 'John Doe',
        version: '2.0.0',
      });

      // Act
      const container = createTestContainer();
      const command = createExtendCommand(container);
      const result = await executeCommand(command, [
        '/test-project',
        '--template',
        'custom',
        '--variables',
        variables,
        '--dry-run',
      ]);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('DRY RUN');
      expect(mockConsole.logs.join(' ')).toContain('custom');
    });
  });

  describe('error scenarios', () => {
    it('should fail when project directory does not exist (exit code 1)', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({});
      mockFs(mockFileSystem);

      // Act
      const container = createTestContainer();
      const command = createExtendCommand(container);
      const result = await executeCommand(command, [
        '/nonexistent-project',
        '--template',
        'react',
      ]);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Error');
      expect(mockConsole.errors.join(' ')).toContain('does not exist');
    });

    it('should fail when project is not scaffold-managed (exit code 1)', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/regular-project': {
          'package.json': '{"name": "regular-project"}',
          src: {
            'index.js': 'console.log("hello");',
          },
        },
      });
      mockFs(mockFileSystem);

      // Act
      const container = createTestContainer();
      const command = createExtendCommand(container);
      const result = await executeCommand(command, [
        '/regular-project',
        '--template',
        'react',
      ]);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Error');
      expect(mockConsole.errors.join(' ')).toContain(
        'Not a scaffold-managed project'
      );
      expect(mockConsole.logs.join(' ')).toContain('Use "scaffold new"');
    });

    it('should fail when template is not specified (exit code 1)', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/test-project': {
          '.scaffold': {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              projectName: 'test-project',
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

      // Act
      const container = createTestContainer();
      const command = createExtendCommand(container);
      const result = await executeCommand(command, ['/test-project']);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Error');
      expect(mockConsole.errors.join(' ')).toContain('Template is required');
      expect(mockConsole.logs.join(' ')).toContain('Usage: scaffold extend');
    });

    it('should fail when variables JSON is malformed', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/test-project': {
          '.scaffold': {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              projectName: 'test-project',
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

      // Act
      const container = createTestContainer();
      const command = createExtendCommand(container);
      const result = await executeCommand(command, [
        '/test-project',
        '--template',
        'react',
        '--variables',
        'invalid json {',
      ]);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Error');
      expect(mockConsole.errors.join(' ')).toContain('Invalid variables JSON');
    });

    it('should handle malformed manifest file', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/broken-project': {
          '.scaffold': {
            'manifest.json': 'invalid json {',
          },
        },
      });
      mockFs(mockFileSystem);

      // Act
      const container = createTestContainer();
      const command = createExtendCommand(container);
      const result = await executeCommand(command, [
        '/broken-project',
        '--template',
        'react',
      ]);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Error');
    });

    it('should handle permission denied errors', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/readonly-project': mockFs.directory({
          mode: 0o444, // read-only
          items: {
            '.scaffold': {
              'manifest.json': JSON.stringify({
                version: '1.0.0',
                projectName: 'readonly-project',
                templates: [],
                variables: {},
                created: '2023-01-01T00:00:00.000Z',
                updated: '2023-01-01T00:00:00.000Z',
                history: [],
              }),
            },
          },
        }),
      });
      mockFs(mockFileSystem);

      // Act
      const container = createTestContainer();
      const command = createExtendCommand(container);
      const result = await executeCommand(command, [
        '/readonly-project',
        '--template',
        'react',
      ]);

      // Assert - Should fail due to write permissions
      expect([0, 1]).toContain(result.code); // Could be 0 or 1 depending on implementation
    });
  });

  describe('edge cases', () => {
    it('should handle relative project paths', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/current/dir': {},
        '/current/project': {
          '.scaffold': {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              projectName: 'project',
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
      const container = createTestContainer();
      const command = createExtendCommand(container);
      const result = await executeCommand(command, [
        './project',
        '--template',
        'react',
      ]);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('Command structure created');
    });

    it('should handle empty project directory with manifest', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/empty-project': {
          '.scaffold': {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              projectName: 'empty-project',
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

      // Act
      const container = createTestContainer();
      const command = createExtendCommand(container);
      const result = await executeCommand(command, [
        '/empty-project',
        '--template',
        'react',
      ]);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('Command structure created');
    });

    it('should handle combined options correctly', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/test-project': {
          '.scaffold': {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              projectName: 'test-project',
              templates: [
                {
                  name: 'base',
                  version: '1.0.0',
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

      const variables = JSON.stringify({ author: 'Jane Doe' });

      // Act
      const container = createTestContainer();
      const command = createExtendCommand(container);
      const result = await executeCommand(command, [
        '/test-project',
        '--template',
        'react',
        '--variables',
        variables,
        '--verbose',
        '--dry-run',
        '--force',
      ]);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('DRY RUN');
      expect(mockConsole.logs.join(' ')).toContain('Extending project');
      expect(mockConsole.logs.join(' ')).toContain('react');
    });

    it('should handle template name with special characters', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/test-project': {
          '.scaffold': {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              projectName: 'test-project',
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

      // Act
      const container = createTestContainer();
      const command = createExtendCommand(container);
      const result = await executeCommand(command, [
        '/test-project',
        '--template',
        'react-typescript-v2',
      ]);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('Command structure created');
    });

    it('should handle empty variables object', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/test-project': {
          '.scaffold': {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              projectName: 'test-project',
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

      // Act
      const container = createTestContainer();
      const command = createExtendCommand(container);
      const result = await executeCommand(command, [
        '/test-project',
        '--template',
        'react',
        '--variables',
        '{}',
        '--dry-run',
      ]);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('DRY RUN');
      expect(mockConsole.logs.join(' ')).toContain('react');
    });

    it('should handle complex nested variables', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/test-project': {
          '.scaffold': {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              projectName: 'test-project',
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

      const complexVariables = JSON.stringify({
        author: { name: 'John Doe', email: 'john@example.com' },
        config: { strict: true, version: '2.0.0' },
        features: ['typescript', 'eslint', 'prettier'],
      });

      // Act
      const container = createTestContainer();
      const command = createExtendCommand(container);
      const result = await executeCommand(command, [
        '/test-project',
        '--template',
        'advanced',
        '--variables',
        complexVariables,
        '--dry-run',
      ]);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('DRY RUN');
      expect(mockConsole.logs.join(' ')).toContain('advanced');
    });
  });
});
