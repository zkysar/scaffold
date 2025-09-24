/**
 * Unit tests for 'scaffold template' command
 * Tests option parsing, validation, flow control, and error handling
 */

import 'reflect-metadata';
import { createTemplateCommand } from '../../../../src/cli/commands/template.command';
import {
  TemplateService,
} from '../../../../src/services';
import { TemplateIdentifierService } from '../../../../src/services/template-identifier-service';
import { Command } from 'commander';
import inquirer from 'inquirer';
import type { Template, TemplateLibrary, TemplateSummary } from '../../../../src/models';
import { container } from 'tsyringe';

// Mock dependencies
jest.mock('../../../../src/services');
jest.mock('../../../../src/services/template-identifier-service');
jest.mock('inquirer');

const mockTemplateService = TemplateService as jest.MockedClass<typeof TemplateService>;
const mockTemplateIdentifierService = TemplateIdentifierService;
const mockInquirer = inquirer as jest.Mocked<typeof inquirer>;

// Helper to execute command and capture results
async function executeCommand(args: string[], mockServices = true): Promise<{
  exitCode: number;
  stdout: string[];
  stderr: string[];
  error?: Error;
}> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  let exitCode = 0;
  let thrownError: Error | undefined;

  // Mock console output
  const originalConsole = {
    log: console.log,
    error: console.error,
  };
  console.log = jest.fn((...args) => stdout.push(args.join(' ')));
  console.error = jest.fn((...args) => stderr.push(args.join(' ')));

  // Mock process.exit
  const originalExit = process.exit;
  process.exit = jest.fn((code?: number) => {
    exitCode = code || 0;
    throw new Error('Process exit called');
  }) as any;

  try {
    // Create mock container
    const mockContainer = container.createChildContainer();

    if (mockServices) {
      // Set up default service mocks
      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn(),
        createTemplate: jest.fn(),
        deleteTemplate: jest.fn(),
        getTemplate: jest.fn(),
        exportTemplate: jest.fn(),
        importTemplate: jest.fn(),
      } as any;

      const mockIdentifierServiceInstance = {
        registerAlias: jest.fn(),
        getAliases: jest.fn(),
      } as any;

      mockContainer.registerInstance(TemplateService, mockTemplateServiceInstance as any);
      mockContainer.registerInstance(TemplateIdentifierService, mockIdentifierServiceInstance as any);
    }

    const command = createTemplateCommand(mockContainer);
    await command.parseAsync(args, { from: 'user' });
  } catch (error) {
    if (error instanceof Error && error.message !== 'Process exit called') {
      thrownError = error;
    }
  } finally {
    // Restore mocks
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    process.exit = originalExit;
  }

  return { exitCode, stdout, stderr, error: thrownError };
}

describe('scaffold template command unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('command structure', () => {
    it('should create command with correct configuration', () => {
      const mockContainer = container.createChildContainer();
      const command = createTemplateCommand(mockContainer);

      expect(command.name()).toBe('template');
      expect(command.description()).toBe('Manage templates (create/list/delete/export/import/alias)');

      // Check arguments
      const args = command.registeredArguments;
      expect(args).toHaveLength(3);
      // Check argument description - args[0] is string, metadata stored elsewhere

      // Check options
      const options = command.options;
      const optionNames = options.map(opt => opt.long);
      expect(optionNames).toContain('--verbose');
      expect(optionNames).toContain('--dry-run');
      expect(optionNames).toContain('--force');
      expect(optionNames).toContain('--output');
    });

    it('should have proper option configurations', () => {
      const mockContainer = container.createChildContainer();
      const command = createTemplateCommand(mockContainer);
      const options = command.options;

      const verboseOption = options.find(opt => opt.long === '--verbose');
      expect(verboseOption?.description).toContain('Show detailed output');

      const dryRunOption = options.find(opt => opt.long === '--dry-run');
      expect(dryRunOption?.description).toContain('Show what would be done');

      const forceOption = options.find(opt => opt.long === '--force');
      expect(forceOption?.description).toContain('Force operation without confirmation');

      const outputOption = options.find(opt => opt.long === '--output');
      expect(outputOption?.description).toContain('Output path for export operations');
    });
  });

  describe('list action', () => {
    it('should list available templates', async () => {
      const mockTemplates: TemplateSummary[] = [
        {
          id: 'abc123456789',
          name: 'React App',
          version: '1.0.0',
          description: 'React application template',
          source: 'local',
          installed: true,
          lastUpdated: '2023-01-01T00:00:00.000Z',
          aliases: ['react', 'react-app'],
        },
        {
          id: 'def987654321',
          name: 'Node Service',
          version: '2.1.0',
          description: 'Node.js service template',
          source: 'local',
          installed: true,
          lastUpdated: '2023-01-01T00:00:00.000Z',
          aliases: [],
        },
      ];

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          sources: [],
          templates: mockTemplates,
          lastUpdated: '2023-01-01T00:00:00.000Z',
        } as TemplateLibrary),
      };

      const mockIdentifierServiceInstance = {
        registerAlias: jest.fn(),
        getAliases: jest.fn(),
      } as any;

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);
      (mockTemplateIdentifierService.getInstance as jest.Mock).mockReturnValue(mockIdentifierServiceInstance);

      const result = await executeCommand(['list'], false);

      expect(result.stdout).toContain('Available Templates:');
      expect(result.stdout).toContain('React App abc12345 (alias: "react", "react-app")');
      expect(result.stdout).toContain('Node Service def98765');
      expect(result.stdout).toContain('  Version: 1.0.0');
      expect(result.stdout).toContain('  Version: 2.1.0');
      expect(result.stdout).toContain('Total: 2 templates');
      expect(result.exitCode).toBe(0);
    });

    it('should show verbose template information', async () => {
      const mockTemplates: TemplateSummary[] = [
        {
          id: 'abc123456789',
          name: 'React App',
          version: '1.0.0',
          description: 'React application template',
          source: 'local',
          installed: true,
          lastUpdated: '2023-06-15T10:30:00.000Z',
        },
      ];

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          sources: [],
          templates: mockTemplates,
          lastUpdated: '2023-01-01T00:00:00.000Z',
        } as TemplateLibrary),
      };

      const mockIdentifierServiceInstance = {
        registerAlias: jest.fn(),
        getAliases: jest.fn(),
      } as any;

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);
      (mockTemplateIdentifierService.getInstance as jest.Mock).mockReturnValue(mockIdentifierServiceInstance);

      const result = await executeCommand(['list', '--verbose'], false);

      expect(result.stdout).toContain('React App abc123456789');
      expect(result.stdout).toContain('  Source: local');
      expect(result.stdout).toContain('  Installed: Yes');
      expect(result.stdout).toContain('  Last Updated: 2023-06-15T10:30:00.000Z');
      expect(result.exitCode).toBe(0);
    });

    it('should handle no templates available', async () => {
      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          sources: [],
          templates: [],
          lastUpdated: '2023-01-01T00:00:00.000Z',
        } as TemplateLibrary),
      };

      const mockIdentifierServiceInstance = {
        registerAlias: jest.fn(),
        getAliases: jest.fn(),
      } as any;

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);
      (mockTemplateIdentifierService.getInstance as jest.Mock).mockReturnValue(mockIdentifierServiceInstance);

      const result = await executeCommand(['list'], false);

      expect(result.stdout).toContain('No templates found.');
      expect(result.stdout).toContain('Use "scaffold template create" to create your first template.');
      expect(result.exitCode).toBe(0);
    });

    it('should handle template loading errors', async () => {
      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockRejectedValue(new Error('No templates found')),
      };

      const mockIdentifierServiceInstance = {
        registerAlias: jest.fn(),
        getAliases: jest.fn(),
      } as any;

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);
      (mockTemplateIdentifierService.getInstance as jest.Mock).mockReturnValue(mockIdentifierServiceInstance);

      const result = await executeCommand(['list'], false);

      expect(result.stdout).toContain('No templates found.');
      expect(result.stdout).toContain('Use "scaffold template create" to create your first template.');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('create action', () => {
    it('should create template with interactive prompts', async () => {
      mockInquirer.prompt.mockResolvedValue({
        description: 'My awesome template',
        rootFolder: 'my-template',
        version: '1.0.0',
        strictMode: false,
        allowExtraFiles: true,
      });

      const mockTemplateServiceInstance = {
        createTemplate: jest.fn().mockResolvedValue(undefined),
        getTemplate: jest.fn().mockResolvedValue({
          id: 'new-template-123',
          name: 'my-template',
          version: '1.0.0',
        } as Template),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      const result = await executeCommand(['create', 'my-template']);

      expect(mockInquirer.prompt).toHaveBeenCalled();
      expect(mockTemplateServiceInstance.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'my-template',
          version: '1.0.0',
          description: 'My awesome template',
          rootFolder: 'my-template',
        })
      );
      expect(result.stdout).toContain('✓ Template created successfully!');
      expect(result.stdout).toContain('Template Name: my-template');
      expect(result.exitCode).toBe(0);
    });

    it('should validate template name is required', async () => {
      const result = await executeCommand(['create']);

      expect(result.stderr).toContain('Template name is required for create action');
      expect(result.stderr).toContain('Usage: scaffold template create <name>');
      expect(result.exitCode).toBe(1);
    });

    it('should validate template prompts correctly', async () => {
      let promptQuestions: any[] = [];
      mockInquirer.prompt.mockImplementation((questions) => {
        promptQuestions = Array.isArray(questions) ? questions : [questions];
        return Promise.resolve({
          description: 'Test template',
          rootFolder: 'test-template',
          version: '1.0.0',
          strictMode: false,
          allowExtraFiles: true,
        });
      });

      const mockTemplateServiceInstance = {
        createTemplate: jest.fn().mockResolvedValue(undefined),
        getTemplate: jest.fn().mockResolvedValue({
          id: 'test-123',
          name: 'test-template',
        } as Template),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      await executeCommand(['create', 'test-template']);

      expect(promptQuestions).toBeDefined();
      expect(promptQuestions.length).toBeGreaterThan(0);

      // Test description validation
      const descriptionQuestion = promptQuestions.find((q: any) => q.name === 'description');
      if (descriptionQuestion && descriptionQuestion.validate) {
        expect(descriptionQuestion.validate('')).toContain('Description is required');
        expect(descriptionQuestion.validate('Valid description')).toBe(true);
      }

      // Test root folder validation
      const rootFolderQuestion = promptQuestions.find((q: any) => q.name === 'rootFolder');
      if (rootFolderQuestion && rootFolderQuestion.validate) {
        expect(rootFolderQuestion.validate('')).toContain('Root folder is required');
        expect(rootFolderQuestion.validate('invalid@folder')).toContain('alphanumeric characters');
        expect(rootFolderQuestion.validate('.invalid')).toContain('cannot start with a dot');
        expect(rootFolderQuestion.validate('-invalid')).toContain('cannot start with a dot or hyphen');
        expect(rootFolderQuestion.validate('valid-folder')).toBe(true);
      }

      // Test version validation
      const versionQuestion = promptQuestions.find((q: any) => q.name === 'version');
      if (versionQuestion && versionQuestion.validate) {
        expect(versionQuestion.validate('invalid')).toContain('Invalid semantic version');
        expect(versionQuestion.validate('1.0.0')).toBe(true);
        expect(versionQuestion.validate('2.1.3-beta')).toBe(true);
      }
    });

    it('should show dry run output', async () => {
      mockInquirer.prompt.mockResolvedValue({
        description: 'Test template',
        rootFolder: 'test-template',
        version: '1.0.0',
        strictMode: true,
        allowExtraFiles: false,
      });

      const result = await executeCommand(['create', 'test-template', '--dry-run']);

      expect(result.stdout).toContain('DRY RUN - Template would be created with:');
      expect(result.stdout).toContain('"name": "test-template"');
      expect(result.exitCode).toBe(0);
    });

    it('should handle template creation errors', async () => {
      mockInquirer.prompt.mockResolvedValue({
        description: 'Test template',
        rootFolder: 'test-template',
        version: '1.0.0',
        strictMode: false,
        allowExtraFiles: true,
      });

      const mockTemplateServiceInstance = {
        createTemplate: jest.fn().mockRejectedValue(new Error('Template already exists')),
        getTemplate: jest.fn(),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      const result = await executeCommand(['create', 'existing-template']);

      expect(result.stderr).toContain("Template 'existing-template' already exists");
      expect(result.exitCode).toBe(1);
    });
  });

  describe('delete action', () => {
    it('should delete template with confirmation', async () => {
      const mockTemplate: TemplateSummary = {
        id: 'template-123',
        name: 'test-template',
        version: '1.0.0',
        description: 'Test template',
        source: 'local',
        installed: true,
        lastUpdated: '2023-01-01T00:00:00.000Z',
      };

      mockInquirer.prompt.mockResolvedValue({ confirm: true });

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          sources: [],
          templates: [mockTemplate],
          lastUpdated: '2023-01-01T00:00:00.000Z',
        } as TemplateLibrary),
        deleteTemplate: jest.fn().mockResolvedValue(undefined),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      const result = await executeCommand(['delete', 'test-template']);

      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'confirm',
          message: expect.stringContaining("delete template 'test-template'"),
          default: false,
        }),
      ]);
      expect(mockTemplateServiceInstance.deleteTemplate).toHaveBeenCalledWith('template-123');
      expect(result.stdout).toContain('✓ Template deleted successfully!');
      expect(result.exitCode).toBe(0);
    });

    it('should require template identifier', async () => {
      const result = await executeCommand(['delete']);

      expect(result.stderr).toContain('Template name or ID is required for delete action');
      expect(result.stderr).toContain('Usage: scaffold template delete <name>');
      expect(result.exitCode).toBe(1);
    });

    it('should cancel deletion when user declines', async () => {
      const mockTemplate: TemplateSummary = {
        id: 'template-123',
        name: 'test-template',
        version: '1.0.0',
        description: 'Test template',
        source: 'local',
        installed: true,
        lastUpdated: '2023-01-01T00:00:00.000Z',
      };

      mockInquirer.prompt.mockResolvedValue({ confirm: false });

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          sources: [],
          templates: [mockTemplate],
          lastUpdated: '2023-01-01T00:00:00.000Z',
        } as TemplateLibrary),
        deleteTemplate: jest.fn(),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      const result = await executeCommand(['delete', 'test-template']);

      expect(result.stdout).toContain('Operation cancelled.');
      expect(mockTemplateServiceInstance.deleteTemplate).not.toHaveBeenCalled();
      expect(result.exitCode).toBe(0);
    });

    it('should delete without confirmation when force flag is used', async () => {
      const mockTemplate: TemplateSummary = {
        id: 'template-123',
        name: 'test-template',
        version: '1.0.0',
        description: 'Test template',
        source: 'local',
        installed: true,
        lastUpdated: '2023-01-01T00:00:00.000Z',
      };

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          sources: [],
          templates: [mockTemplate],
          lastUpdated: '2023-01-01T00:00:00.000Z',
        } as TemplateLibrary),
        deleteTemplate: jest.fn().mockResolvedValue(undefined),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      const result = await executeCommand(['delete', 'test-template', '--force']);

      expect(mockInquirer.prompt).not.toHaveBeenCalled();
      expect(mockTemplateServiceInstance.deleteTemplate).toHaveBeenCalledWith('template-123');
      expect(result.stdout).toContain('✓ Template deleted successfully!');
      expect(result.exitCode).toBe(0);
    });

    it('should show dry run for delete', async () => {
      const mockTemplate: TemplateSummary = {
        id: 'template-123',
        name: 'test-template',
        version: '1.0.0',
        description: 'Test template',
        source: 'local',
        installed: true,
        lastUpdated: '2023-01-01T00:00:00.000Z',
      };

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          sources: [],
          templates: [mockTemplate],
          lastUpdated: '2023-01-01T00:00:00.000Z',
        } as TemplateLibrary),
        deleteTemplate: jest.fn(),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      const result = await executeCommand(['delete', 'test-template', '--dry-run']);

      expect(result.stdout).toContain('DRY RUN - Would delete template:');
      expect(result.stdout).toContain('Name: test-template');
      expect(mockTemplateServiceInstance.deleteTemplate).not.toHaveBeenCalled();
      expect(result.exitCode).toBe(0);
    });

    it('should handle template not found', async () => {
      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          sources: [],
          templates: [],
          lastUpdated: '2023-01-01T00:00:00.000Z',
        } as TemplateLibrary),
        deleteTemplate: jest.fn(),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      const result = await executeCommand(['delete', 'nonexistent']);

      expect(result.stderr).toContain("Template 'nonexistent' not found");
      expect(result.exitCode).toBe(1);
    });
  });

  describe('export action', () => {
    it('should export template to default path', async () => {
      const mockTemplate: TemplateSummary = {
        id: 'template-123',
        name: 'test-template',
        version: '1.0.0',
        description: 'Test template',
        source: 'local',
        installed: true,
        lastUpdated: '2023-01-01T00:00:00.000Z',
      };

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          sources: [],
          templates: [mockTemplate],
          lastUpdated: '2023-01-01T00:00:00.000Z',
        } as TemplateLibrary),
        exportTemplate: jest.fn().mockResolvedValue(undefined),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      const result = await executeCommand(['export', 'test-template']);

      expect(mockTemplateServiceInstance.exportTemplate).toHaveBeenCalledWith(
        'template-123',
        './test-template-template.json'
      );
      expect(result.stdout).toContain('✓ Template exported successfully!');
      expect(result.stdout).toContain('Output: ./test-template-template.json');
      expect(result.exitCode).toBe(0);
    });

    it('should export template to custom output path', async () => {
      const mockTemplate: TemplateSummary = {
        id: 'template-123',
        name: 'test-template',
        version: '1.0.0',
        description: 'Test template',
        source: 'local',
        installed: true,
        lastUpdated: '2023-01-01T00:00:00.000Z',
      };

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          sources: [],
          templates: [mockTemplate],
          lastUpdated: '2023-01-01T00:00:00.000Z',
        } as TemplateLibrary),
        exportTemplate: jest.fn().mockResolvedValue(undefined),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      const result = await executeCommand(['export', 'test-template', '--output', '/custom/path.json']);

      expect(mockTemplateServiceInstance.exportTemplate).toHaveBeenCalledWith(
        'template-123',
        '/custom/path.json'
      );
      expect(result.stdout).toContain('Output: /custom/path.json');
      expect(result.exitCode).toBe(0);
    });

    it('should require template identifier for export', async () => {
      const result = await executeCommand(['export']);

      expect(result.stderr).toContain('Template name or ID is required for export action');
      expect(result.stderr).toContain('Usage: scaffold template export <name>');
      expect(result.exitCode).toBe(1);
    });

    it('should show dry run for export', async () => {
      const mockTemplate: TemplateSummary = {
        id: 'template-123',
        name: 'test-template',
        version: '1.0.0',
        description: 'Test template',
        source: 'local',
        installed: true,
        lastUpdated: '2023-01-01T00:00:00.000Z',
      };

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          sources: [],
          templates: [mockTemplate],
          lastUpdated: '2023-01-01T00:00:00.000Z',
        } as TemplateLibrary),
        exportTemplate: jest.fn(),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      const result = await executeCommand(['export', 'test-template', '--dry-run']);

      expect(result.stdout).toContain('DRY RUN - Would export template to:');
      expect(mockTemplateServiceInstance.exportTemplate).not.toHaveBeenCalled();
      expect(result.exitCode).toBe(0);
    });
  });

  describe('import action', () => {
    it('should import template from archive', async () => {
      const mockTemplate: Template = {
        id: 'imported-123',
        name: 'imported-template',
        version: '2.0.0',
        description: 'Imported template',
        rootFolder: 'imported',
        folders: [],
        files: [],
        variables: [],
        rules: {
          strictMode: false,
          allowExtraFiles: true,
          allowExtraFolders: true,
          conflictResolution: 'prompt',
          excludePatterns: [],
          rules: [],
        },
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
      };

      const mockTemplateServiceInstance = {
        importTemplate: jest.fn().mockResolvedValue(mockTemplate),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      const result = await executeCommand(['import', '/path/to/template.json']);

      expect(mockTemplateServiceInstance.importTemplate).toHaveBeenCalledWith('/path/to/template.json');
      expect(result.stdout).toContain('✓ Template imported successfully!');
      expect(result.stdout).toContain('Template Name: imported-template');
      expect(result.stdout).toContain('Version: 2.0.0');
      expect(result.exitCode).toBe(0);
    });

    it('should require archive path for import', async () => {
      const result = await executeCommand(['import']);

      expect(result.stderr).toContain('Archive path is required for import action');
      expect(result.stderr).toContain('Usage: scaffold template import <archive-path>');
      expect(result.exitCode).toBe(1);
    });

    it('should show dry run for import', async () => {
      const result = await executeCommand(['import', '/path/to/template.json', '--dry-run']);

      expect(result.stdout).toContain('DRY RUN - Would import template from: /path/to/template.json');
      expect(result.exitCode).toBe(0);
    });

    it('should handle import errors', async () => {
      const mockTemplateServiceInstance = {
        importTemplate: jest.fn().mockRejectedValue(new Error('Archive file \'/path/to/template.json\' not found')),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      const result = await executeCommand(['import', '/path/to/template.json']);

      expect(result.stderr).toContain("Archive file '/path/to/template.json' not found");
      expect(result.exitCode).toBe(1);
    });
  });

  describe('alias action', () => {
    it('should register template alias', async () => {
      const mockTemplate: Template = {
        id: 'template-123',
        name: 'test-template',
        version: '1.0.0',
        description: 'Test template',
        rootFolder: 'test',
        folders: [],
        files: [],
        variables: [],
        rules: {
          strictMode: false,
          allowExtraFiles: true,
          allowExtraFolders: true,
          conflictResolution: 'prompt',
          excludePatterns: [],
          rules: [],
        },
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
      };

      const mockTemplateServiceInstance = {
        getTemplate: jest.fn().mockResolvedValue(mockTemplate),
      };

      const mockIdentifierServiceInstance = {
        registerAlias: jest.fn().mockResolvedValue(undefined),
        getAliases: jest.fn().mockResolvedValue(['template-123', 'new-alias']),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);
      (mockTemplateIdentifierService.getInstance as jest.Mock).mockReturnValue(mockIdentifierServiceInstance);

      const result = await executeCommand(['alias', 'template-123', 'new-alias']);

      expect(mockTemplateServiceInstance.getTemplate).toHaveBeenCalledWith('template-123');
      expect(mockIdentifierServiceInstance.registerAlias).toHaveBeenCalledWith('template-123', 'new-alias');
      expect(result.stdout).toContain('✓ Alias registered successfully!');
      expect(result.stdout).toContain('New alias: new-alias');
      expect(result.stdout).toContain('All aliases: "template-123", "new-alias"');
      expect(result.exitCode).toBe(0);
    });

    it('should require template identifier for alias', async () => {
      const result = await executeCommand(['alias']);

      expect(result.stderr).toContain('Template SHA or existing alias is required');
      expect(result.stderr).toContain('Usage: scaffold template alias <sha-or-alias> <new-alias>');
      expect(result.exitCode).toBe(1);
    });

    it('should require new alias for alias action', async () => {
      const result = await executeCommand(['alias', 'template-123']);

      expect(result.stderr).toContain('New alias is required');
      expect(result.stderr).toContain('Usage: scaffold template alias <sha-or-alias> <new-alias>');
      expect(result.exitCode).toBe(1);
    });

    it('should handle alias registration errors', async () => {
      const mockTemplateServiceInstance = {
        getTemplate: jest.fn().mockResolvedValue({
          id: 'template-123',
          name: 'test-template',
        } as Template),
      };

      const mockIdentifierServiceInstance = {
        registerAlias: jest.fn().mockRejectedValue(new Error('Alias already registered for different template')),
        getAliases: jest.fn(),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);
      (mockTemplateIdentifierService.getInstance as jest.Mock).mockReturnValue(mockIdentifierServiceInstance);

      const result = await executeCommand(['alias', 'template-123', 'existing-alias']);

      expect(result.stderr).toContain('Alias already registered for different template');
      expect(result.exitCode).toBe(1);
    });
  });

  describe('unknown action', () => {
    it('should handle unknown actions', async () => {
      const result = await executeCommand(['unknown-action']);

      expect(result.stderr).toContain('Unknown action: unknown-action');
      expect(result.stderr).toContain('Available actions: list, create, delete, export, import, alias');
      expect(result.exitCode).toBe(1);
    });
  });

  describe('verbose mode', () => {
    it('should show verbose output for all actions', async () => {
      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          sources: [],
          templates: [],
          lastUpdated: '2023-01-01T00:00:00.000Z',
        } as TemplateLibrary),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      const result = await executeCommand(['list', '--verbose']);

      expect(result.stdout).toContain('Template action: list');
      expect(result.exitCode).toBe(0);
    });

    it('should show identifier and alias in verbose mode', async () => {
      const mockTemplate: Template = {
        id: 'template-123',
        name: 'test-template',
        version: '1.0.0',
        description: 'Test template',
        rootFolder: 'test',
        folders: [],
        files: [],
        variables: [],
        rules: {
          strictMode: false,
          allowExtraFiles: true,
          allowExtraFolders: true,
          conflictResolution: 'prompt',
          excludePatterns: [],
          rules: [],
        },
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
      };

      const mockTemplateServiceInstance = {
        getTemplate: jest.fn().mockResolvedValue(mockTemplate),
      };

      const mockIdentifierServiceInstance = {
        registerAlias: jest.fn().mockResolvedValue(undefined),
        getAliases: jest.fn().mockResolvedValue(['template-123']),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);
      (mockTemplateIdentifierService.getInstance as jest.Mock).mockReturnValue(mockIdentifierServiceInstance);

      const result = await executeCommand(['alias', 'test-id', 'test-alias', '--verbose']);

      expect(result.stdout).toContain('Template action: alias');
      expect(result.stdout).toContain('Template identifier: test-id');
      expect(result.stdout).toContain('Alias: test-alias');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockRejectedValue(new Error('Unexpected service error')),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      const result = await executeCommand(['list']);

      expect(result.stderr).toContain('Unexpected service error');
      expect(result.exitCode).toBe(1);
    });

    it('should handle template not found errors', async () => {
      const mockTemplateServiceInstance = {
        getTemplate: jest.fn().mockRejectedValue(new Error('Template not found')),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      const result = await executeCommand(['alias', 'nonexistent', 'new-alias']);

      expect(result.stderr).toContain("Template 'nonexistent' not found");
      expect(result.exitCode).toBe(1);
    });
  });
});