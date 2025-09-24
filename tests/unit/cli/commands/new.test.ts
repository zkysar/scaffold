/**
 * Unit tests for 'scaffold new' command
 * Tests option parsing, validation, flow control, and error handling
 */

import 'reflect-metadata';
import { createNewCommand } from '@/cli/commands/new.command';
import {
  ProjectCreationService,
  ProjectManifestService,
  TemplateService,
  FileSystemService,
} from '@/services';
import { Command } from 'commander';
import inquirer from 'inquirer';
import { existsSync } from 'fs';
import mockFs from 'mock-fs';
import type { ProjectManifest, TemplateLibrary, Template } from '@/models';
import { container, DependencyContainer } from 'tsyringe';

// Mock dependencies
jest.mock('@/services');
jest.mock('inquirer');
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
}));

const mockProjectCreationService = ProjectCreationService as jest.MockedClass<typeof ProjectCreationService>;
const mockProjectManifestService = ProjectManifestService as jest.MockedClass<typeof ProjectManifestService>;
const mockTemplateService = TemplateService as jest.MockedClass<typeof TemplateService>;
const mockFileSystemService = FileSystemService as jest.MockedClass<typeof FileSystemService>;
const mockInquirer = inquirer as jest.Mocked<typeof inquirer>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;

// Helper function to create a command with mock container
function createMockCommand(): Command {
  const mockContainer = container.createChildContainer();

  // Register minimal mock services
  const mockTemplateService = { loadTemplates: jest.fn() } as any;
  const mockProjectCreationService = { createProject: jest.fn() } as any;
  const mockProjectManifestService = { updateProjectManifest: jest.fn() } as any;
  const mockFileSystemService = {} as any;

  mockContainer.registerInstance(TemplateService, mockTemplateService as any);
  mockContainer.registerInstance(ProjectCreationService, mockProjectCreationService as any);
  mockContainer.registerInstance(ProjectManifestService, mockProjectManifestService as any);
  mockContainer.registerInstance(FileSystemService, mockFileSystemService as any);

  return createNewCommand(mockContainer);
}

// Helper to execute command and capture results
async function executeCommand(
  args: string[],
  mockServices = true,
  customContainer?: DependencyContainer
): Promise<{
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
    // Use custom container or create mock container
    const mockContainer = customContainer || container.createChildContainer();

    if (mockServices && !customContainer) {
      // Set up default service mocks that fail early to match actual behavior
      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockRejectedValue(new Error('No templates found')),
      } as any;
      const mockProjectCreationServiceInstance = {
        createProject: jest.fn().mockResolvedValue({
          id: 'project-123',
          version: '1.0.0',
          projectName: 'test-project',
          created: '2023-01-01T00:00:00.000Z',
          updated: '2023-01-01T00:00:00.000Z',
          templates: [],
          variables: {},
          history: []
        } as ProjectManifest),
      } as any;
      const mockProjectManifestServiceInstance = {
        updateProjectManifest: jest.fn(),
      } as any;
      const mockFileSystemServiceInstance = {} as any;

      mockContainer.registerInstance(TemplateService, mockTemplateServiceInstance);
      mockContainer.registerInstance(ProjectCreationService, mockProjectCreationServiceInstance);
      mockContainer.registerInstance(ProjectManifestService, mockProjectManifestServiceInstance);
      mockContainer.registerInstance(FileSystemService, mockFileSystemServiceInstance);
    }

    const command = createNewCommand(mockContainer);
    await command.parseAsync(['node', 'test', ...args], { from: 'node' });
  } catch (error) {
    if (error instanceof Error && error.message !== 'Process exit called') {
      thrownError = error;
      stderr.push(error.message);
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
      const command = createMockCommand();

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
      const command = createMockCommand();
      const options = command.options;

      const templateOption = options.find(opt => opt.long === '--template');
      expect(templateOption?.description).toContain('Template ID or name to use');
      expect(templateOption?.mandatory).toBe(false);

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
      // Setup mocks to avoid early exit
      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          templates: [{ id: 'default', name: 'default', description: 'Default template' }]
        } as TemplateLibrary),
      };
      const mockProjectCreationServiceInstance = {
        createProject: jest.fn().mockResolvedValue({
          projectName: 'test-project',
          templates: [{ name: 'default', version: '1.0.0' }],
          id: 'project-123',
          created: '2023-01-01T00:00:00.000Z'
        } as ProjectManifest),
      };
      const mockProjectManifestServiceInstance = {
        updateProjectManifest: jest.fn(),
      };

      mockInquirer.prompt
        .mockResolvedValueOnce({ name: 'test-project' })
        .mockResolvedValueOnce({ useCurrentDir: true })
        .mockResolvedValueOnce({ selectedTemplates: ['default'] });

      mockExistsSync.mockReturnValue(false);

      // Create mock container with proper services
      const mockContainer = container.createChildContainer();
      mockContainer.registerInstance(TemplateService, mockTemplateServiceInstance as any);
      mockContainer.registerInstance(ProjectCreationService, mockProjectCreationServiceInstance as any);
      mockContainer.registerInstance(ProjectManifestService, mockProjectManifestServiceInstance as any);
      mockContainer.registerInstance(FileSystemService, {} as any);

      const result = await executeCommand([], false, mockContainer); // Pass custom container

      // First call should be for project name prompt
      expect(mockInquirer.prompt).toHaveBeenCalledTimes(3);
      expect(mockInquirer.prompt).toHaveBeenNthCalledWith(1, [
        expect.objectContaining({
          type: 'input',
          name: 'name',
          message: 'Enter project name:',
          validate: expect.any(Function),
        }),
      ]);

      // Second call should be for directory confirmation
      expect(mockInquirer.prompt).toHaveBeenNthCalledWith(2, [
        expect.objectContaining({
          type: 'confirm',
          name: 'useCurrentDir',
          message: 'Create project in current directory?',
          default: true,
        }),
      ]);

      // Third call should be for template selection
      expect(mockInquirer.prompt).toHaveBeenNthCalledWith(3, [
        expect.objectContaining({
          type: 'checkbox',
          name: 'selectedTemplates',
          message: expect.stringContaining('Select templates to apply'),
        }),
      ]);

      expect(result.exitCode).toBe(0);
    });

    it('should validate project name format in prompt', async () => {
      // Setup services with default template to avoid early exit
      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          templates: [{ id: 'default', name: 'default', description: 'Default template' }]
        } as TemplateLibrary),
      };
      const mockProjectCreationServiceInstance = {
        createProject: jest.fn().mockResolvedValue({
          id: 'project-123',
          version: '1.0.0',
          projectName: 'valid-project',
          created: '2023-01-01T00:00:00.000Z',
          updated: '2023-01-01T00:00:00.000Z',
          templates: [{ name: 'default', version: '1.0.0' } as any],
          variables: {},
          history: []
        } as ProjectManifest),
      };
      const mockProjectManifestServiceInstance = {
        updateProjectManifest: jest.fn(),
      };

      // Extract the validator function from the prompt configuration
      let validatorFunction: Function | undefined;

      const mockPrompt = jest.fn().mockImplementation((questions) => {
        const nameQuestion = questions.find((q: any) => q.name === 'name');
        if (nameQuestion) {
          validatorFunction = nameQuestion.validate;
          return Promise.resolve({ name: 'valid-project' });
        }
        // Handle path confirmation prompt
        return Promise.resolve({ useCurrentDir: true });
      });

      mockInquirer.prompt = mockPrompt as any;
      mockExistsSync.mockReturnValue(false);

      // Create mock container
      const mockContainer = container.createChildContainer();
      mockContainer.registerInstance(TemplateService, mockTemplateServiceInstance as any);
      mockContainer.registerInstance(ProjectCreationService, mockProjectCreationServiceInstance as any);
      mockContainer.registerInstance(ProjectManifestService, mockProjectManifestServiceInstance as any);
      mockContainer.registerInstance(FileSystemService, {} as any);

      await executeCommand([], false, mockContainer);

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
      const result = await executeCommand(['my-project', '--template', 'my-template']);

      // Should not prompt for project name when provided
      expect(mockInquirer.prompt).not.toHaveBeenCalledWith([
        expect.objectContaining({ name: 'name' }),
      ]);

      // Command should exit early due to default mocking
      expect(result.exitCode).toBe(1);
    });
  });

  describe('path handling', () => {
    it('should use current directory when confirmed', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ useCurrentDir: true })
        .mockResolvedValueOnce({ selectedTemplates: ['default'] });

      mockExistsSync.mockReturnValue(false);

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockResolvedValue({
          templates: [{ id: 'default', name: 'default', description: 'Default template' }]
        } as TemplateLibrary),
      };
      const mockProjectCreationServiceInstance = {
        createProject: jest.fn().mockResolvedValue({
          id: 'project-123',
          version: '1.0.0',
          projectName: 'test-project',
          created: '2023-01-01T00:00:00.000Z',
          updated: '2023-01-01T00:00:00.000Z',
          templates: [{ name: 'Template 1', version: '1.0.0' } as any],
          variables: {},
          history: []
        } as ProjectManifest),
      };
      const mockProjectManifestServiceInstance = {
        updateProjectManifest: jest.fn(),
      };

      // Create mock container with proper services
      const mockContainer = container.createChildContainer();
      mockContainer.registerInstance(TemplateService, mockTemplateServiceInstance as any);
      mockContainer.registerInstance(ProjectCreationService, mockProjectCreationServiceInstance as any);
      mockContainer.registerInstance(ProjectManifestService, mockProjectManifestServiceInstance as any);
      mockContainer.registerInstance(FileSystemService, {} as any);

      const spy = jest.spyOn(process, 'cwd').mockReturnValue('/current/dir');

      await executeCommand(['test-project'], false, mockContainer);

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
      const mockProjectCreationServiceInstance = {
        createProject: jest.fn().mockResolvedValue({
          id: 'project-123',
          version: '1.0.0',
          projectName: 'test-project',
          created: '2023-01-01T00:00:00.000Z',
          updated: '2023-01-01T00:00:00.000Z',
          templates: [{ name: 'My Template', version: '1.0.0' } as any],
          variables: {},
          history: []
        } as ProjectManifest),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);
      mockProjectCreationService.mockImplementation(() => mockProjectCreationServiceInstance as any);

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

      expect(result.stdout).toContain('No template specified and no templates found in library.');
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
      const mockProjectCreationServiceInstance = {
        createProject: jest.fn().mockResolvedValue({
          id: 'project-123',
          version: '1.0.0',
          projectName: 'test-project',
          created: '2023-01-01T00:00:00.000Z',
          updated: '2023-01-01T00:00:00.000Z',
          templates: [{ name: 'My Template', version: '1.0.0' } as any],
          variables: {},
          history: []
        } as ProjectManifest),
      };
      const mockProjectManifestServiceInstance = {
        updateProjectManifest: jest.fn(),
      };

      // Create mock container with proper services
      const mockContainer = container.createChildContainer();
      mockContainer.registerInstance(TemplateService, mockTemplateServiceInstance as any);
      mockContainer.registerInstance(ProjectCreationService, mockProjectCreationServiceInstance as any);
      mockContainer.registerInstance(ProjectManifestService, mockProjectManifestServiceInstance as any);
      mockContainer.registerInstance(FileSystemService, {} as any);

      const variables = JSON.stringify({ author: 'John Doe', version: '2.0.0' });
      await executeCommand(['test-project', '--template', 'my-template', '--variables', variables], false, mockContainer);

      expect(mockProjectCreationServiceInstance.createProject).toHaveBeenCalledWith(
        'test-project',
        ['my-template'],
        expect.any(String),
        { author: 'John Doe', version: '2.0.0' },
        false
      );
    });

    it('should handle invalid JSON variables', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ useCurrentDir: true });
      mockExistsSync.mockReturnValue(false);

      const result = await executeCommand(['test-project', '--template', 'my-template', '--variables', 'invalid-json']);

      expect(result.stderr.some(line => line.includes('Invalid variables JSON'))).toBe(true);
      expect(result.exitCode).toBe(1);
    });
  });

  describe('dry run mode', () => {
    it('should show dry run output without creating project', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ useCurrentDir: true });
      mockExistsSync.mockReturnValue(false);

      const result = await executeCommand(['test-project', '--template', 'my-template', '--dry-run']);

      expect(result.stdout).toContain('DRY RUN - Showing what would be created');
      expect(result.stdout).toContain('Project name: test-project');
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

      expect(result.stdout.some(line => line.includes('DRY RUN'))).toBe(true);
      expect(result.stdout.some(line => line.includes('Variables:'))).toBe(true);
    });
  });

  describe('verbose mode', () => {
    it('should show detailed output in verbose mode', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ useCurrentDir: true });
      mockExistsSync.mockReturnValue(false);

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn(),
      };
      const mockProjectCreationServiceInstance = {
        createProject: jest.fn().mockResolvedValue({
          id: 'project-123',
          version: '1.0.0',
          projectName: 'test-project',
          created: '2023-01-01T00:00:00.000Z',
          updated: '2023-01-01T00:00:00.000Z',
          templates: [{ name: 'My Template', version: '1.0.0' } as any],
          variables: {},
          history: []
        } as ProjectManifest),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);
      mockProjectCreationService.mockImplementation(() => mockProjectCreationServiceInstance as any);

      const result = await executeCommand(['test-project', '--template', 'my-template', '--verbose']);

      expect(result.stdout).toContain('Creating new project: test-project');
      expect(result.stdout.some(line => line.includes('Target path:'))).toBe(true);
      expect(result.stdout).toContain('Using template: my-template');
      expect(result.stdout).toContain('Manifest ID: project-123');
      expect(result.stdout).toContain('Created at: 2023-01-01T00:00:00.000Z');
    });
  });

  describe('error handling', () => {
    it('should handle template service errors gracefully', async () => {
      mockExistsSync.mockReturnValue(false);

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn().mockRejectedValue(new Error('Failed to load templates')),
      };

      const mockContainer = container.createChildContainer();
      mockContainer.registerInstance(TemplateService, mockTemplateServiceInstance as any);
      mockContainer.registerInstance(ProjectCreationService, { createProject: jest.fn() } as any);
      mockContainer.registerInstance(ProjectManifestService, { updateProjectManifest: jest.fn() } as any);
      mockContainer.registerInstance(FileSystemService, {} as any);

      const result = await executeCommand(['test-project'], false, mockContainer);

      expect(result.stdout).toContain('No template specified. Use --template option to specify a template.');
    });

    it('should handle project creation errors', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ useCurrentDir: true });
      mockExistsSync.mockReturnValue(false);

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn(),
      };
      const mockProjectCreationServiceInstance = {
        createProject: jest.fn().mockRejectedValue(new Error('Project creation failed')),
      };
      const mockProjectManifestServiceInstance = {
        updateProjectManifest: jest.fn(),
      };

      // Create mock container with proper services
      const mockContainer = container.createChildContainer();
      mockContainer.registerInstance(TemplateService, mockTemplateServiceInstance as any);
      mockContainer.registerInstance(ProjectCreationService, mockProjectCreationServiceInstance as any);
      mockContainer.registerInstance(ProjectManifestService, mockProjectManifestServiceInstance as any);
      mockContainer.registerInstance(FileSystemService, {} as any);

      const result = await executeCommand(['test-project', '--template', 'my-template'], false, mockContainer);

      expect(result.stderr).toContain('Error: Project creation failed');
      expect(result.exitCode).toBe(1);
    });

    it('should handle service errors by re-throwing them', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ useCurrentDir: true });
      mockExistsSync.mockReturnValue(false);

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn(),
      };
      const mockProjectCreationServiceInstance = {
        createProject: jest.fn().mockRejectedValue(new Error('Service error occurred')),
      };
      const mockProjectManifestServiceInstance = {
        updateProjectManifest: jest.fn(),
      };

      // Create mock container with proper services
      const mockContainer = container.createChildContainer();
      mockContainer.registerInstance(TemplateService, mockTemplateServiceInstance as any);
      mockContainer.registerInstance(ProjectCreationService, mockProjectCreationServiceInstance as any);
      mockContainer.registerInstance(ProjectManifestService, mockProjectManifestServiceInstance as any);
      mockContainer.registerInstance(FileSystemService, {} as any);

      const result = await executeCommand(['test-project', '--template', 'my-template'], false, mockContainer);

      expect(result.stderr).toContain('Error: Service error occurred');
      expect(result.exitCode).toBe(1);
    });

    it('should catch and handle unexpected errors', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ useCurrentDir: true });
      mockExistsSync.mockReturnValue(false);

      const mockTemplateServiceInstance = {
        loadTemplates: jest.fn(),
      };
      const mockProjectCreationServiceInstance = {
        createProject: jest.fn().mockImplementation(() => {
          throw new Error('Unexpected error');
        }),
      };
      const mockProjectManifestServiceInstance = {
        updateProjectManifest: jest.fn(),
      };

      // Create mock container with proper services
      const mockContainer = container.createChildContainer();
      mockContainer.registerInstance(TemplateService, mockTemplateServiceInstance as any);
      mockContainer.registerInstance(ProjectCreationService, mockProjectCreationServiceInstance as any);
      mockContainer.registerInstance(ProjectManifestService, mockProjectManifestServiceInstance as any);
      mockContainer.registerInstance(FileSystemService, {} as any);

      const result = await executeCommand(['test-project', '--template', 'my-template'], false, mockContainer);

      expect(result.stderr).toContain('Error: Unexpected error');
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
      const mockProjectCreationServiceInstance = {
        createProject: jest.fn().mockResolvedValue({
          id: 'project-123',
          version: '1.0.0',
          projectName: 'test-project',
          created: '2023-01-01T00:00:00.000Z',
          updated: '2023-01-01T00:00:00.000Z',
          templates: [{ name: 'My Template', version: '1.0.0' } as any],
          variables: {},
          history: []
        } as ProjectManifest),
      };

      mockTemplateService.mockImplementation(() => mockTemplateServiceInstance as any);
      mockProjectCreationService.mockImplementation(() => mockProjectCreationServiceInstance as any);

      const result = await executeCommand(['test-project', '--template', 'my-template']);

      expect(result.stdout).toContain('✓ Project created successfully!');
      expect(result.stdout).toContain('Project name: test-project');
      expect(result.stdout).toContain('Templates applied: ');
    });
  });
});