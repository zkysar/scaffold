/**
 * Contract tests for 'scaffold extend' command
 * Tests MUST fail initially as no implementation exists yet (TDD)
 */

import { createExtendCommand } from '../../../src/cli/commands/extend.command';
import {
  createMockFileSystem,
  createMockConsole,
  CommandResult,
} from '../../helpers/cli-helpers';
import mockFs from 'mock-fs';
import { Command } from 'commander';

// Mock the FileSystemService to work with mock-fs
jest.mock('../../../src/services/file-system.service', () => {
  const originalFs = jest.requireActual('fs');
  const originalPath = jest.requireActual('path');

  return {
    FileSystemService: jest.fn().mockImplementation(() => ({
      readJson: jest.fn().mockImplementation(async (filePath: string) => {
        const resolvedPath = originalPath.resolve(filePath);
        const content = originalFs.readFileSync(resolvedPath, 'utf8');
        return JSON.parse(content);
      }),
      exists: jest.fn().mockImplementation(async (targetPath: string) => {
        return originalFs.existsSync(originalPath.resolve(targetPath));
      }),
      resolvePath: jest.fn().mockImplementation((...pathSegments: string[]) => {
        return originalPath.resolve(...pathSegments);
      }),
      isDryRun: false,
      setDryRun: jest.fn(),
      createFile: jest.fn(),
      createDirectory: jest.fn(),
      copyPath: jest.fn(),
      deletePath: jest.fn(),
      existsSync: jest.fn().mockImplementation((targetPath: string) => {
        return originalFs.existsSync(originalPath.resolve(targetPath));
      }),
      writeJson: jest.fn(),
      readFile: jest.fn(),
      writeFile: jest.fn(),
      stat: jest.fn(),
      isDirectory: jest.fn(),
      isFile: jest.fn(),
      isSymlink: jest.fn(),
      readDirectory: jest.fn(),
      backup: jest.fn(),
      restore: jest.fn(),
      listBackups: jest.fn(),
      deleteBackup: jest.fn(),
      relativePath: jest.fn(),
      normalizePath: jest.fn(),
      ensureDirectory: jest.fn(),
      move: jest.fn(),
    })),
  };
});

// Mock the ProjectService to provide working implementations
jest.mock('../../../src/services/project-service', () => {
  const originalFs = jest.requireActual('fs');
  const originalPath = jest.requireActual('path');

  return {
    ProjectService: jest.fn().mockImplementation(() => ({
      loadProjectManifest: jest.fn().mockImplementation(async (projectPath: string) => {
        const manifestPath = originalPath.resolve(projectPath, '.scaffold/manifest.json');
        if (originalFs.existsSync(manifestPath)) {
          const content = originalFs.readFileSync(manifestPath, 'utf8');
          return JSON.parse(content);
        }
        return null;
      }),
      extendProject: jest.fn().mockImplementation(async (projectPath: string, templateIds: string[], variables: Record<string, string>) => {
        // Return a mock updated manifest
        return {
          id: 'test-project-id',
          projectName: 'test-project',
          templates: [
            {
              templateSha: 'base-template-sha',
              name: 'base',
              version: '1.0.0',
              rootFolder: '.',
              appliedAt: '2023-01-01T00:00:00.000Z',
              status: 'active',
              conflicts: [],
            },
            {
              templateSha: 'react-template-sha',
              name: 'react',
              version: '1.0.0',
              rootFolder: '.',
              appliedAt: new Date().toISOString(),
              status: 'active',
              conflicts: [],
            },
          ],
          variables,
          created: '2023-01-01T00:00:00.000Z',
          updated: new Date().toISOString(),
          history: [],
        };
      }),
    })),
  };
});

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

    // Set a timeout in case the command hangs
    const timeout = setTimeout(() => {
      process.exit = originalExit;
      resolve({ code: 1, message: 'Command timed out', data: null });
    }, 5000);

    try {
      // Parse and execute the command
      command.parseAsync(args, { from: 'user' })
        .then(() => {
          clearTimeout(timeout);
          process.exit = originalExit;
          resolve({ code: exitCode, message: '', data: null });
        })
        .catch(error => {
          clearTimeout(timeout);
          process.exit = originalExit;
          resolve({ code: 1, message: error.message, data: error });
        });
    } catch (error) {
      clearTimeout(timeout);
      process.exit = originalExit;
      resolve({
        code: 1,
        message: error instanceof Error ? error.message : String(error),
        data: error
      });
    }
  });
}

describe('scaffold extend command', () => {
  let mockConsole: ReturnType<typeof createMockConsole>;

  beforeEach(() => {
    mockConsole = createMockConsole();
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockFs.restore();
    mockConsole.restore();
    jest.restoreAllMocks();
  });

  describe('basic functionality', () => {
    it('should show error when directory does not exist', async () => {
      // Arrange
      mockFs({});

      // Act
      const command = createExtendCommand();
      const result = await executeCommand(command, ['/nonexistent', '--template', 'react']);

      // Assert
      expect(result.code).toBe(1);
    });

    it('should show error when not a scaffold project', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/test-project': {},
      });
      mockFs(mockFileSystem);

      // Act
      const command = createExtendCommand();
      const result = await executeCommand(command, ['/test-project', '--template', 'react']);

      // Assert
      expect(result.code).toBe(1);
    });

    it('should show error when template is not specified', async () => {
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
      const command = createExtendCommand();
      const result = await executeCommand(command, ['/test-project']);

      // Assert
      expect(result.code).toBe(1);
    });

    it('should extend project with template when conditions are met', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/current/dir': {
          '.scaffold': {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              projectName: 'current-project',
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
          'react.json': JSON.stringify({
            name: 'react',
            version: '1.0.0',
            description: 'React template',
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
      const command = createExtendCommand();
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
            description: 'TypeScript configuration',
            folders: ['src/types'],
            files: [
              {
                path: 'tsconfig.json',
                template: '{"compilerOptions": {}}',
              },
            ],
            variables: [],
            rules: { strict: true },
          }),
        },
      });
      mockFs(mockFileSystem);

      // Act
      const command = createExtendCommand();
      const result = await executeCommand(command, ['/test-project', '--template', 'typescript']);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('Command structure created');
    });

    it('should handle dry-run mode', async () => {
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
      const command = createExtendCommand();
      const result = await executeCommand(command, ['/test-project', '--template', 'react', '--dry-run']);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('DRY RUN');
    });

    it('should handle template variables', async () => {
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
      const command = createExtendCommand();
      const result = await executeCommand(command, [
        '/test-project',
        '--template',
        'react',
        '--variables',
        '{"componentName": "TestComponent"}',
      ]);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('Command structure created');
    });

    it('should handle invalid JSON variables', async () => {
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
      const command = createExtendCommand();
      const result = await executeCommand(command, [
        '/test-project',
        '--template',
        'react',
        '--variables',
        'invalid-json',
      ]);

      // Assert
      expect(result.code).toBe(1);
    });

    it('should handle verbose output', async () => {
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
      const command = createExtendCommand();
      const result = await executeCommand(command, ['/test-project', '--template', 'react', '--verbose']);

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join(' ')).toContain('Extending project');
    });
  });

  describe('error handling', () => {
    it('should validate project manifest exists', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/invalid-project': {},
      });
      mockFs(mockFileSystem);

      // Act
      const command = createExtendCommand();
      const result = await executeCommand(command, ['/invalid-project', '--template', 'react']);

      // Assert
      expect(result.code).toBe(1);
    });

    it('should require template parameter', async () => {
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
      const command = createExtendCommand();
      const result = await executeCommand(command, ['/test-project']);

      // Assert
      expect(result.code).toBe(1);
    });
  });
});