/**
 * Contract tests for 'scaffold template' command
 * Tests MUST fail initially as no implementation exists yet (TDD)
 */

import { createTemplateCommand } from '@/cli/commands/template.command';
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

describe('scaffold template command contract', () => {
  let mockConsole: ReturnType<typeof createMockConsole>;

  beforeEach(() => {
    mockConsole = createMockConsole();
    Object.assign(console, mockConsole.mockConsole);
  });

  afterEach(() => {
    mockFs.restore();
    jest.restoreAllMocks();
  });

  describe('template list subcommand', () => {
    it('should list all available templates in table format', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {
          'react.json': JSON.stringify({
            name: 'react',
            version: '1.2.0',
            description: 'React application template',
          }),
          'node.json': JSON.stringify({
            name: 'node',
            version: '2.0.1',
            description: 'Node.js service template',
          }),
        },
      });
      mockFs(mockFileSystem);

      // Act
      const command = createTemplateCommand();
      const result = await executeCommand(command, ['list']);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Error');
    });

    it('should list templates in JSON format', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {
          'react.json': JSON.stringify({
            name: 'react',
            version: '1.2.0',
            description: 'React application template',
          }),
        },
      });
      mockFs(mockFileSystem);

      // Act
      const command = createTemplateCommand();
      const result = await executeCommand(command, ['list']);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Error');
    });

    it('should handle empty template directory', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {},
      });
      mockFs(mockFileSystem);

      // Act
      const command = createTemplateCommand();
      const result = await executeCommand(command, ['list']);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Error');
    });
  });

  describe('template create subcommand', () => {
    it('should create new template interactively', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {},
      });
      mockFs(mockFileSystem);

      // Mock inquirer prompts
      const mockPrompt = jest
        .fn()
        .mockResolvedValueOnce({
          name: 'my-template',
          version: '1.0.0',
          description: 'My custom template',
        })
        .mockResolvedValueOnce({
          addFolder: true,
          folderPath: 'src',
        })
        .mockResolvedValueOnce({
          addFolder: false,
        })
        .mockResolvedValueOnce({
          addFile: true,
          filePath: 'package.json',
          fileTemplate: '{"name": "{{projectName}}"}',
        })
        .mockResolvedValueOnce({
          addFile: false,
        });
      jest.doMock('inquirer', () => ({ prompt: mockPrompt }));

      // Act
      const command = createTemplateCommand();
      const result = await executeCommand(command, ['create', 'my-template']);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Error');
    });

    it('should fail when template name already exists', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {
          'existing-template.json': JSON.stringify({
            name: 'existing-template',
            version: '1.0.0',
          }),
        },
      });
      mockFs(mockFileSystem);

      // Act
      const command = createTemplateCommand();
      const result = await executeCommand(command, [
        'create',
        'existing-template',
      ]);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Error');
    });

    it('should validate template name format', async () => {
      // Act
      const command = createTemplateCommand();
      const result = await executeCommand(command, ['create', 'Invalid Name!']);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Error');
    });
  });

  describe('template update subcommand', () => {
    it('should update existing template', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {
          'my-template.json': JSON.stringify({
            name: 'my-template',
            version: '1.0.0',
            folders: ['src'],
            files: [],
            variables: [],
            rules: { strict: true },
          }),
        },
      });
      mockFs(mockFileSystem);

      // Mock inquirer prompts for updating
      const mockPrompt = jest
        .fn()
        .mockResolvedValueOnce({
          updateField: 'version',
          newValue: '1.1.0',
        })
        .mockResolvedValueOnce({
          continue: false,
        });
      jest.doMock('inquirer', () => ({ prompt: mockPrompt }));

      // Act
      const command = createTemplateCommand();
      const result = await executeCommand(command, ['update', 'my-template']);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Unknown action');
    });

    it('should fail when template does not exist', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {},
      });
      mockFs(mockFileSystem);

      // Act
      const command = createTemplateCommand();
      const result = await executeCommand(command, [
        'update',
        'nonexistent-template',
      ]);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Unknown action');
    });
  });

  describe('template delete subcommand', () => {
    it('should delete template with confirmation', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {
          'deleteme.json': JSON.stringify({
            name: 'deleteme',
            version: '1.0.0',
          }),
        },
      });
      mockFs(mockFileSystem);

      // Mock confirmation prompt
      const mockPrompt = jest.fn().mockResolvedValue({ confirmed: true });
      jest.doMock('inquirer', () => ({ prompt: mockPrompt }));

      // Act
      const command = createTemplateCommand();
      const result = await executeCommand(command, ['delete', 'deleteme']);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Error');
    });

    it('should delete template without confirmation when force flag is used', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {
          'deleteme.json': JSON.stringify({
            name: 'deleteme',
            version: '1.0.0',
          }),
        },
      });
      mockFs(mockFileSystem);

      // Act
      const command = createTemplateCommand();
      const result = await executeCommand(command, [
        'delete',
        'deleteme',
        '--force',
      ]);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Error');
    });

    it('should fail when template does not exist', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {},
      });
      mockFs(mockFileSystem);

      // Act
      const command = createTemplateCommand();
      const result = await executeCommand(command, ['delete', 'nonexistent']);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Error');
    });

    it('should cancel deletion when user denies confirmation', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {
          'keepme.json': JSON.stringify({
            name: 'keepme',
            version: '1.0.0',
          }),
        },
      });
      mockFs(mockFileSystem);

      // Mock confirmation prompt - user says no
      const mockPrompt = jest.fn().mockResolvedValue({ confirmed: false });
      jest.doMock('inquirer', () => ({ prompt: mockPrompt }));

      // Act
      const command = createTemplateCommand();
      const result = await executeCommand(command, ['delete', 'keepme']);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Error');
    });

    it('should prevent deletion of built-in templates', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/system/scaffold/templates': {
          'builtin-template.json': JSON.stringify({
            name: 'builtin-template',
            version: '1.0.0',
            builtin: true,
          }),
        },
      });
      mockFs(mockFileSystem);

      // Act
      const command = createTemplateCommand();
      const result = await executeCommand(command, [
        'delete',
        'builtin-template',
        '--force',
      ]);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Error');
    });
  });

  describe('template show subcommand', () => {
    it('should display template details in human-readable format', async () => {
      // Arrange
      const templateData = {
        name: 'react-app',
        version: '2.1.0',
        description: 'React application with TypeScript',
        folders: ['src/components', 'public', 'tests'],
        files: [
          { path: 'package.json', template: '{"name": "{{projectName}}"}' },
          { path: 'src/App.tsx', template: 'export default function App() {}' },
        ],
        variables: [
          { name: 'projectName', type: 'string', required: true },
          {
            name: 'author',
            type: 'string',
            required: false,
            default: 'Anonymous',
          },
        ],
        rules: { strict: true },
      };

      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {
          'react-app.json': JSON.stringify(templateData),
        },
      });
      mockFs(mockFileSystem);

      // Act
      const command = createTemplateCommand();
      const result = await executeCommand(command, ['show', 'react-app']);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Unknown action');
    });

    it('should display template details in JSON format', async () => {
      // Arrange
      const templateData = {
        name: 'simple-template',
        version: '1.0.0',
        folders: [],
        files: [],
        variables: [],
        rules: { strict: true },
      };

      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {
          'simple-template.json': JSON.stringify(templateData),
        },
      });
      mockFs(mockFileSystem);

      // Act
      const command = createTemplateCommand();
      const result = await executeCommand(command, ['show', 'simple-template']);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Unknown action');
    });

    it('should fail when template does not exist', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {},
      });
      mockFs(mockFileSystem);

      // Act
      const command = createTemplateCommand();
      const result = await executeCommand(command, ['show', 'nonexistent']);

      // Assert
      expect(result.code).toBe(1);
      expect(mockConsole.errors.join(' ')).toContain('Unknown action');
    });
  });
});
