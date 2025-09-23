/**
 * Unit tests for 'scaffold new' command
 * Tests option parsing, validation, flow control, and error handling
 */

import { createNewCommand } from '@/cli/commands/new.command';
import {
  ProjectService,
  TemplateService,
  FileSystemService,
} from '@/services';
import { Command } from 'commander';
import inquirer from 'inquirer';
import { existsSync } from 'fs';
import mockFs from 'mock-fs';
import type { ProjectManifest, TemplateLibrary, Template } from '@/models';

// Mock dependencies
jest.mock('@/services');
jest.mock('inquirer');
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
}));

const mockProjectService = ProjectService as jest.MockedClass<typeof ProjectService>;
const mockTemplateService = TemplateService as jest.MockedClass<typeof TemplateService>;
const mockFileSystemService = FileSystemService as jest.MockedClass<typeof FileSystemService>;
const mockInquirer = inquirer as jest.Mocked<typeof inquirer>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;

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
    const command = createNewCommand();

    if (mockServices) {
      // Set up default service mocks
      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn(),
      } as any;
      const mockProjectServiceInstance = {
        createProject: jest.fn(),
      } as any;
      const mockFileSystemServiceInstance = {} as any;

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance);
      mockProjectService.mockImplementation(() => mockProjectServiceInstance);
      mockFileSystemService.mockImplementation(() => mockFileSystemServiceInstance);
    }

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

describe('scaffold new command unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.restore();
  });

  afterEach(() => {
    mockFs.restore();
    jest.restoreAllMocks();
  });

  describe('command structure', () => {
    it('should create command with correct configuration', () => {
      const command = createNewCommand();

      expect(command.name()).toBe('new');
      expect(command.description()).toBe('Create new project from template');

      // Check arguments
      const args = command.registeredArguments;
      expect(args).toHaveLength(1);
      // Check argument metadata - args are strings in commander

      // Check options
      const options = command.options;
      const optionNames = options.map(opt => opt.long);
      expect(optionNames).toContain('--template');
      expect(optionNames).toContain('--path');
      expect(optionNames).toContain('--variables');
      expect(optionNames).toContain('--verbose');
      expect(optionNames).toContain('--dry-run');
    });

    it('should have proper option configurations', () => {
      const command = createNewCommand();
      const options = command.options;

      const templateOption = options.find(opt => opt.long === '--template');
      expect(templateOption?.description).toContain('Template ID or name to use');
      expect(templateOption?.required).toBe(false);

      const pathOption = options.find(opt => opt.long === '--path');
      expect(pathOption?.description).toContain('Target directory path');

      const variablesOption = options.find(opt => opt.long === '--variables');
      expect(variablesOption?.description).toContain('JSON string of template variables');

      const verboseOption = options.find(opt => opt.long === '--verbose');
      expect(verboseOption?.description).toContain('Show detailed output');

      const dryRunOption = options.find(opt => opt.long === '--dry-run');
      expect(dryRunOption?.description).toContain('Show what would be created');
    });
  });

  describe('argument validation', () => {
    it('should handle missing project name with interactive prompt', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ name: 'test-project' })
        .mockResolvedValueOnce({ useCurrentDir: true })
        .mockResolvedValueOnce({ selectedTemplates: ['template1'] });

      mockExistsSync.mockReturnValue(false);

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          templates: [{ id: 'template1', name: 'Template 1', description: 'Test template' }]
        } as TemplateLibrary),
      };
      const mockProjectServiceInstance = {
        createProject: jest.fn().mockResolvedValue({
          projectName: 'test-project',
          templates: [{ name: 'Template 1', version: '1.0.0' }]
        } as ProjectManifest),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);
      mockProjectService.mockImplementation(() => mockProjectServiceInstance as any);

      const result = await executeCommand([]);

      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'name',
          message: 'Enter project name:',
          validate: expect.any(Function),
        }),
      ]);

      expect(result.exitCode).toBe(0);
    });

    it('should validate project name format in prompt', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ name: 'valid-project' });

      const command = createNewCommand();
      // Extract the validator function from the prompt configuration
      let validatorFunction: Function | undefined;

      const mockPrompt = jest.fn().mockImplementation((questions) => {
        const nameQuestion = questions.find((q: any) => q.name === 'name');
        validatorFunction = nameQuestion?.validate;
        return Promise.resolve({ name: 'valid-project' });
      });

      mockInquirer.prompt = mockPrompt as any;

      await executeCommand([]);

      expect(validatorFunction).toBeDefined();

      if (validatorFunction) {
        // Test valid names
        expect(validatorFunction('valid-project')).toBe(true);
        expect(validatorFunction('ValidProject123')).toBe(true);
        expect(validatorFunction('project_name')).toBe(true);

        // Test invalid names
        expect(validatorFunction('')).toContain('required');
        expect(validatorFunction('   ')).toContain('required');
        expect(validatorFunction('invalid project')).toContain('letters, numbers, dashes');
        expect(validatorFunction('project@name')).toContain('letters, numbers, dashes');
      }
    });

    it('should handle provided project name directly', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ useCurrentDir: true })
        .mockResolvedValueOnce({ selectedTemplates: ['template1'] });

      mockExistsSync.mockReturnValue(false);

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          templates: [{ id: 'template1', name: 'Template 1', description: 'Test template' }]
        } as TemplateLibrary),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      await executeCommand(['my-project']);

      // Should not prompt for project name when provided
      expect(mockInquirer.prompt).not.toHaveBeenCalledWith([
        expect.objectContaining({ name: 'name' }),
      ]);
    });
  });

  describe('path handling', () => {
    it('should use current directory when confirmed', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ useCurrentDir: true })
        .mockResolvedValueOnce({ selectedTemplates: ['template1'] });

      mockExistsSync.mockReturnValue(false);

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          templates: [{ id: 'template1', name: 'Template 1', description: 'Test template' }]
        } as TemplateLibrary),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      const spy = jest.spyOn(process, 'cwd').mockReturnValue('/current/dir');

      await executeCommand(['test-project']);

      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'useCurrentDir',
          message: 'Create project in current directory?',
          default: true,
        }),
      ]);

      spy.mockRestore();
    });

    it('should prompt for custom path when current directory declined', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ useCurrentDir: false })
        .mockResolvedValueOnce({ customPath: '/custom/path' })
        .mockResolvedValueOnce({ selectedTemplates: ['template1'] });

      mockExistsSync.mockReturnValue(false);

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          templates: [{ id: 'template1', name: 'Template 1', description: 'Test template' }]
        } as TemplateLibrary),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      await executeCommand(['test-project']);

      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'customPath',
          message: 'Enter target directory path:',
          validate: expect.any(Function),
        }),
      ]);
    });

    it('should use provided path option', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ selectedTemplates: ['template1'] });
      mockExistsSync.mockReturnValue(false);

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          templates: [{ id: 'template1', name: 'Template 1', description: 'Test template' }]
        } as TemplateLibrary),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      await executeCommand(['test-project', '--path', '/specified/path']);

      // Should not prompt for path when provided via option
      expect(mockInquirer.prompt).not.toHaveBeenCalledWith([
        expect.objectContaining({ name: 'useCurrentDir' }),
      ]);
    });
  });

  describe('directory existence handling', () => {
    it('should prompt for overwrite when target directory exists', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ useCurrentDir: true })
        .mockResolvedValueOnce({ overwrite: true })
        .mockResolvedValueOnce({ selectedTemplates: ['template1'] });

      mockExistsSync.mockReturnValue(true);

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          templates: [{ id: 'template1', name: 'Template 1', description: 'Test template' }]
        } as TemplateLibrary),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      await executeCommand(['test-project']);

      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'overwrite',
          message: expect.stringContaining('already exists. Continue?'),
          default: false,
        }),
      ]);
    });

    it('should cancel operation when overwrite declined', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ useCurrentDir: true })
        .mockResolvedValueOnce({ overwrite: false });

      mockExistsSync.mockReturnValue(true);

      const result = await executeCommand(['test-project']);

      expect(result.stdout).toContain('Operation cancelled.');
    });
  });

  describe('template selection', () => {
    it('should use provided template option', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ useCurrentDir: true });
      mockExistsSync.mockReturnValue(false);

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn(),
      };
      const mockProjectServiceInstance = {
        createProject: jest.fn().mockResolvedValue({
          projectName: 'test-project',
          templates: [{ name: 'My Template', version: '1.0.0' }]
        } as ProjectManifest),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);
      mockProjectService.mockImplementation(() => mockProjectServiceInstance as any);

      const result = await executeCommand(['test-project', '--template', 'my-template']);

      // Should not load all templates when specific template provided
      expect(mockTemplateServiceInstance.loadTemplates).not.toHaveBeenCalled();
    });

    it('should prompt for template selection when none provided', async () => {
      const mockTemplates = [
        { id: 'template1', name: 'Template 1', description: 'First template' },
        { id: 'template2', name: 'Template 2', description: 'Second template' },
      ];

      mockInquirer.prompt
        .mockResolvedValueOnce({ useCurrentDir: true })
        .mockResolvedValueOnce({ selectedTemplates: ['template1'] });

      mockExistsSync.mockReturnValue(false);

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          templates: mockTemplates
        } as TemplateLibrary),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      await executeCommand(['test-project']);

      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'checkbox',
          name: 'selectedTemplates',
          message: expect.stringContaining('Select templates to apply'),
          choices: expect.arrayContaining([
            expect.objectContaining({
              name: 'Template 1 - First template',
              value: 'template1',
            }),
            expect.objectContaining({
              name: 'Template 2 - Second template',
              value: 'template2',
            }),
          ]),
        }),
      ]);
    });

    it('should handle no templates available', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ useCurrentDir: true });
      mockExistsSync.mockReturnValue(false);

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          sources: [],
          templates: [],
          lastUpdated: '2023-01-01T00:00:00.000Z',
        } as TemplateLibrary),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      const result = await executeCommand(['test-project']);

      expect(result.stdout).toContain('No templates found.');
      expect(result.stdout).toContain('scaffold template create');
    });

    it('should validate template selection requires at least one', async () => {
      const mockTemplates = [
        { id: 'template1', name: 'Template 1', description: 'First template' },
      ];

      mockInquirer.prompt.mockResolvedValueOnce({ useCurrentDir: true });
      mockExistsSync.mockReturnValue(false);

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          templates: mockTemplates
        } as TemplateLibrary),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      // Extract the validator function from the prompt configuration
      let validatorFunction: Function | undefined;
      const mockPrompt = jest.fn().mockImplementation((questions) => {
        const templatesQuestion = questions.find((q: any) => q.name === 'selectedTemplates');
        validatorFunction = templatesQuestion?.validate;
        return Promise.resolve({ selectedTemplates: ['template1'] });
      });

      mockInquirer.prompt = mockPrompt as any;

      await executeCommand(['test-project']);

      expect(validatorFunction).toBeDefined();

      if (validatorFunction) {
        expect(validatorFunction([])).toContain('must select at least one template');
        expect(validatorFunction(['template1'])).toBe(true);
      }
    });
  });

  describe('variables handling', () => {
    it('should parse valid JSON variables', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ useCurrentDir: true });
      mockExistsSync.mockReturnValue(false);

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn(),
      };
      const mockProjectServiceInstance = {
        createProject: jest.fn().mockResolvedValue({
          projectName: 'test-project',
          templates: [{ name: 'My Template', version: '1.0.0' }]
        } as ProjectManifest),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);
      mockProjectService.mockImplementation(() => mockProjectServiceInstance as any);

      const variables = JSON.stringify({ author: 'John Doe', version: '2.0.0' });
      await executeCommand(['test-project', '--template', 'my-template', '--variables', variables]);

      expect(mockProjectServiceInstance.createProject).toHaveBeenCalledWith(
        'test-project',
        ['my-template'],
        expect.any(String),
        { author: 'John Doe', version: '2.0.0' }
      );
    });

    it('should handle invalid JSON variables', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ useCurrentDir: true });
      mockExistsSync.mockReturnValue(false);

      const result = await executeCommand(['test-project', '--template', 'my-template', '--variables', 'invalid-json']);

      expect(result.stderr).toContain('Invalid variables JSON');
      expect(result.exitCode).toBe(1);
    });
  });

  describe('dry run mode', () => {
    it('should show dry run output without creating project', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ useCurrentDir: true });
      mockExistsSync.mockReturnValue(false);

      const result = await executeCommand(['test-project', '--template', 'my-template', '--dry-run']);

      expect(result.stdout).toContain('DRY RUN - No files will be created');
      expect(result.stdout).toContain('Would create project: test-project');
      expect(result.stdout).toContain('Templates: my-template');
    });

    it('should show dry run output with verbose information', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ useCurrentDir: true });
      mockExistsSync.mockReturnValue(false);

      const variables = JSON.stringify({ author: 'Test Author' });
      const result = await executeCommand([
        'test-project',
        '--template', 'my-template',
        '--variables', variables,
        '--dry-run',
        '--verbose'
      ]);

      expect(result.stdout).toContain('DRY RUN');
      expect(result.stdout).toContain('Variables: {"author":"Test Author"}');
    });
  });

  describe('verbose mode', () => {
    it('should show detailed output in verbose mode', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ useCurrentDir: true });
      mockExistsSync.mockReturnValue(false);

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn(),
      };
      const mockProjectServiceInstance = {
        createProject: jest.fn().mockResolvedValue({
          id: 'project-123',
          projectName: 'test-project',
          templates: [{ name: 'My Template', version: '1.0.0' }],
          created: '2023-01-01T00:00:00.000Z'
        } as ProjectManifest),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);
      mockProjectService.mockImplementation(() => mockProjectServiceInstance as any);

      const result = await executeCommand(['test-project', '--template', 'my-template', '--verbose']);

      expect(result.stdout).toContain('Creating new project: test-project');
      expect(result.stdout).toContain('Target path:');
      expect(result.stdout).toContain('Using template: my-template');
      expect(result.stdout).toContain('Manifest ID: project-123');
      expect(result.stdout).toContain('Created at: 2023-01-01T00:00:00.000Z');
    });
  });

  describe('error handling', () => {
    it('should handle template service errors gracefully', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ useCurrentDir: true });
      mockExistsSync.mockReturnValue(false);

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockRejectedValue(new Error('Failed to load templates')),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);

      const result = await executeCommand(['test-project']);

      expect(result.stdout).toContain('No templates found.');
      expect(result.stdout).toContain('scaffold template create');
    });

    it('should handle project creation errors', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ useCurrentDir: true });
      mockExistsSync.mockReturnValue(false);

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn(),
      };
      const mockProjectServiceInstance = {
        createProject: jest.fn().mockRejectedValue(new Error('Project creation failed')),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);
      mockProjectService.mockImplementation(() => mockProjectServiceInstance as any);

      const result = await executeCommand(['test-project', '--template', 'my-template']);

      expect(result.stderr).toContain('Project creation failed');
      expect(result.exitCode).toBe(1);
    });

    it('should handle service errors by re-throwing them', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ useCurrentDir: true });
      mockExistsSync.mockReturnValue(false);

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn(),
      };
      const mockProjectServiceInstance = {
        createProject: jest.fn().mockRejectedValue(new Error('Service error occurred')),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);
      mockProjectService.mockImplementation(() => mockProjectServiceInstance as any);

      const result = await executeCommand(['test-project', '--template', 'my-template']);

      expect(result.stderr).toContain('Project creation failed');
      expect(result.exitCode).toBe(1);
    });

    it('should catch and handle unexpected errors', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ useCurrentDir: true });
      mockExistsSync.mockReturnValue(false);

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn(),
      };
      const mockProjectServiceInstance = {
        createProject: jest.fn().mockImplementation(() => {
          throw new Error('Unexpected error');
        }),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);
      mockProjectService.mockImplementation(() => mockProjectServiceInstance as any);

      const result = await executeCommand(['test-project', '--template', 'my-template']);

      expect(result.stderr).toContain('Unexpected error');
      expect(result.exitCode).toBe(1);
    });
  });

  describe('successful project creation', () => {
    it('should create project successfully and show confirmation', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ useCurrentDir: true });
      mockExistsSync.mockReturnValue(false);

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn(),
      };
      const mockProjectServiceInstance = {
        createProject: jest.fn().mockResolvedValue({
          projectName: 'test-project',
          templates: [{ name: 'My Template', version: '1.0.0' }]
        } as ProjectManifest),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);
      mockProjectService.mockImplementation(() => mockProjectServiceInstance as any);

      const result = await executeCommand(['test-project', '--template', 'my-template']);

      expect(result.stdout).toContain('✓ Project created successfully!');
      expect(result.stdout).toContain('Project name: test-project');
      expect(result.stdout).toContain('Templates applied: My Template@1.0.0');
    });
  });
});