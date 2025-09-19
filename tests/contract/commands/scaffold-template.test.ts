/**
 * Contract tests for 'scaffold template' command
 * Tests MUST fail initially as no implementation exists yet (TDD)
 */

import { ScaffoldTemplateCommand } from '@/cli/commands/template';
import { createMockFileSystem, createMockConsole } from '@tests/helpers/cli-helpers';
import mockFs from 'mock-fs';

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
            description: 'React application template'
          }),
          'node.json': JSON.stringify({
            name: 'node',
            version: '2.0.1',
            description: 'Node.js service template'
          })
        }
      });
      mockFs(mockFileSystem);

      // Act
      const command = new ScaffoldTemplateCommand();
      const result = await command.list({ json: false });

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs).toContain('Available Templates:');
      expect(mockConsole.logs.join('')).toContain('react');
      expect(mockConsole.logs.join('')).toContain('1.2.0');
      expect(mockConsole.logs.join('')).toContain('React application template');
      expect(mockConsole.logs.join('')).toContain('node');
      expect(mockConsole.logs.join('')).toContain('2.0.1');
    });

    it('should list templates in JSON format', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {
          'react.json': JSON.stringify({
            name: 'react',
            version: '1.2.0',
            description: 'React application template'
          })
        }
      });
      mockFs(mockFileSystem);

      // Act
      const command = new ScaffoldTemplateCommand();
      const result = await command.list({ json: true });

      // Assert
      expect(result.code).toBe(0);
      const output = mockConsole.logs.join('');
      const jsonOutput = JSON.parse(output);
      expect(jsonOutput).toHaveLength(1);
      expect(jsonOutput[0]).toMatchObject({
        name: 'react',
        version: '1.2.0',
        description: 'React application template'
      });
    });

    it('should handle empty template directory', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {}
      });
      mockFs(mockFileSystem);

      // Act
      const command = new ScaffoldTemplateCommand();
      const result = await command.list({ json: false });

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs).toContain('No templates found.');
    });
  });

  describe('template create subcommand', () => {
    it('should create new template interactively', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {}
      });
      mockFs(mockFileSystem);

      // Mock inquirer prompts
      const mockPrompt = jest.fn()
        .mockResolvedValueOnce({
          name: 'my-template',
          version: '1.0.0',
          description: 'My custom template'
        })
        .mockResolvedValueOnce({
          addFolder: true,
          folderPath: 'src'
        })
        .mockResolvedValueOnce({
          addFolder: false
        })
        .mockResolvedValueOnce({
          addFile: true,
          filePath: 'package.json',
          fileTemplate: '{"name": "{{projectName}}"}'
        })
        .mockResolvedValueOnce({
          addFile: false
        });
      jest.doMock('inquirer', () => ({ prompt: mockPrompt }));

      // Act
      const command = new ScaffoldTemplateCommand();
      const result = await command.create('my-template');

      // Assert
      expect(result.code).toBe(0);
      expect(result.message).toBe("Template 'my-template' created successfully");
      expect(mockConsole.logs).toContain("Template 'my-template' created successfully");
    });

    it('should fail when template name already exists', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {
          'existing-template.json': JSON.stringify({
            name: 'existing-template',
            version: '1.0.0'
          })
        }
      });
      mockFs(mockFileSystem);

      // Act
      const command = new ScaffoldTemplateCommand();
      const result = await command.create('existing-template');

      // Assert
      expect(result.code).toBe(1);
      expect(result.message).toBe("Template 'existing-template' already exists");
    });

    it('should validate template name format', async () => {
      // Act
      const command = new ScaffoldTemplateCommand();
      const result = await command.create('Invalid Name!');

      // Assert
      expect(result.code).toBe(1);
      expect(result.message).toContain('Invalid template name');
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
            rules: { strict: true }
          })
        }
      });
      mockFs(mockFileSystem);

      // Mock inquirer prompts for updating
      const mockPrompt = jest.fn()
        .mockResolvedValueOnce({
          updateField: 'version',
          newValue: '1.1.0'
        })
        .mockResolvedValueOnce({
          continue: false
        });
      jest.doMock('inquirer', () => ({ prompt: mockPrompt }));

      // Act
      const command = new ScaffoldTemplateCommand();
      const result = await command.update('my-template');

      // Assert
      expect(result.code).toBe(0);
      expect(result.message).toBe("Template 'my-template' updated successfully");
    });

    it('should fail when template does not exist', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {}
      });
      mockFs(mockFileSystem);

      // Act
      const command = new ScaffoldTemplateCommand();
      const result = await command.update('nonexistent-template');

      // Assert
      expect(result.code).toBe(1);
      expect(result.message).toBe("Template 'nonexistent-template' not found");
    });
  });

  describe('template delete subcommand', () => {
    it('should delete template with confirmation', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {
          'deleteme.json': JSON.stringify({
            name: 'deleteme',
            version: '1.0.0'
          })
        }
      });
      mockFs(mockFileSystem);

      // Mock confirmation prompt
      const mockPrompt = jest.fn().mockResolvedValue({ confirmed: true });
      jest.doMock('inquirer', () => ({ prompt: mockPrompt }));

      // Act
      const command = new ScaffoldTemplateCommand();
      const result = await command.delete('deleteme', { force: false });

      // Assert
      expect(result.code).toBe(0);
      expect(result.message).toBe("Template 'deleteme' deleted successfully");
      expect(mockPrompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'confirm',
          message: "Are you sure you want to delete template 'deleteme'?"
        })
      ]);
    });

    it('should delete template without confirmation when force flag is used', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {
          'deleteme.json': JSON.stringify({
            name: 'deleteme',
            version: '1.0.0'
          })
        }
      });
      mockFs(mockFileSystem);

      // Act
      const command = new ScaffoldTemplateCommand();
      const result = await command.delete('deleteme', { force: true });

      // Assert
      expect(result.code).toBe(0);
      expect(result.message).toBe("Template 'deleteme' deleted successfully");
    });

    it('should fail when template does not exist', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {}
      });
      mockFs(mockFileSystem);

      // Act
      const command = new ScaffoldTemplateCommand();
      const result = await command.delete('nonexistent', { force: false });

      // Assert
      expect(result.code).toBe(1);
      expect(result.message).toBe("Template 'nonexistent' not found");
    });

    it('should cancel deletion when user denies confirmation', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {
          'keepme.json': JSON.stringify({
            name: 'keepme',
            version: '1.0.0'
          })
        }
      });
      mockFs(mockFileSystem);

      // Mock confirmation prompt - user says no
      const mockPrompt = jest.fn().mockResolvedValue({ confirmed: false });
      jest.doMock('inquirer', () => ({ prompt: mockPrompt }));

      // Act
      const command = new ScaffoldTemplateCommand();
      const result = await command.delete('keepme', { force: false });

      // Assert
      expect(result.code).toBe(0);
      expect(result.message).toBe('Deletion cancelled');
    });

    it('should prevent deletion of built-in templates', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/system/scaffold/templates': {
          'builtin-template.json': JSON.stringify({
            name: 'builtin-template',
            version: '1.0.0',
            builtin: true
          })
        }
      });
      mockFs(mockFileSystem);

      // Act
      const command = new ScaffoldTemplateCommand();
      const result = await command.delete('builtin-template', { force: true });

      // Assert
      expect(result.code).toBe(1);
      expect(result.message).toBe("Cannot delete built-in template 'builtin-template'");
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
          { path: 'src/App.tsx', template: 'export default function App() {}' }
        ],
        variables: [
          { name: 'projectName', type: 'string', required: true },
          { name: 'author', type: 'string', required: false, default: 'Anonymous' }
        ],
        rules: { strict: true }
      };

      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {
          'react-app.json': JSON.stringify(templateData)
        }
      });
      mockFs(mockFileSystem);

      // Act
      const command = new ScaffoldTemplateCommand();
      const result = await command.show('react-app', { json: false });

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs.join('')).toContain('Template: react-app');
      expect(mockConsole.logs.join('')).toContain('Version: 2.1.0');
      expect(mockConsole.logs.join('')).toContain('Description: React application with TypeScript');
      expect(mockConsole.logs.join('')).toContain('src/components');
      expect(mockConsole.logs.join('')).toContain('package.json');
    });

    it('should display template details in JSON format', async () => {
      // Arrange
      const templateData = {
        name: 'simple-template',
        version: '1.0.0',
        folders: [],
        files: [],
        variables: [],
        rules: { strict: true }
      };

      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {
          'simple-template.json': JSON.stringify(templateData)
        }
      });
      mockFs(mockFileSystem);

      // Act
      const command = new ScaffoldTemplateCommand();
      const result = await command.show('simple-template', { json: true });

      // Assert
      expect(result.code).toBe(0);
      const output = mockConsole.logs.join('');
      const jsonOutput = JSON.parse(output);
      expect(jsonOutput).toMatchObject(templateData);
    });

    it('should fail when template does not exist', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/home/.scaffold/templates': {}
      });
      mockFs(mockFileSystem);

      // Act
      const command = new ScaffoldTemplateCommand();
      const result = await command.show('nonexistent', { json: false });

      // Assert
      expect(result.code).toBe(1);
      expect(result.message).toBe("Template 'nonexistent' not found");
    });
  });
});