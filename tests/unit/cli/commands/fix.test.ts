/**
 * Unit tests for 'scaffold fix' command
 * Tests option parsing, validation, flow control, and error handling
 */

import 'reflect-metadata';
import { createFixCommand } from '../../../../src/cli/commands/fix.command';
import {
  ProjectFixService,
  ProjectValidationService,
  ProjectManifestService,
  TemplateService,
  FileSystemService,
} from '../../../../src/services';
import { Command } from 'commander';
import { existsSync } from 'fs';
import type { ProjectManifest, ValidationReport } from '../../../../src/models';
import { container, DependencyContainer } from 'tsyringe';

// Mock dependencies
jest.mock('../../../../src/services');
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
}));

const mockProjectFixService = ProjectFixService as jest.MockedClass<typeof ProjectFixService>;
const mockProjectValidationService = ProjectValidationService as jest.MockedClass<typeof ProjectValidationService>;
const mockProjectManifestService = ProjectManifestService as jest.MockedClass<typeof ProjectManifestService>;
const mockTemplateService = TemplateService as jest.MockedClass<typeof TemplateService>;
const mockFileSystemService = FileSystemService as jest.MockedClass<typeof FileSystemService>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;

// Global service instances for cross-test access
let mockTemplateServiceInstance: any;
let mockFileSystemServiceInstance: any;
let mockProjectManifestServiceInstance: any;
let mockProjectValidationServiceInstance: any;
let mockProjectFixServiceInstance: any;

// Helper to setup service mocks for tests
function setupServiceMocks() {
  mockTemplateServiceInstance = {} as any;
  mockFileSystemServiceInstance = {} as any;
  mockProjectManifestServiceInstance = {
    loadProjectManifest: jest.fn(),
    getProjectManifest: jest.fn(),
    updateProjectManifest: jest.fn(),
  } as any;
  mockProjectValidationServiceInstance = {} as any;
  mockProjectFixServiceInstance = {
    fixProject: jest.fn(),
  } as any;

  mockTemplateService.mockImplementation(() => mockTemplateServiceInstance);
  mockFileSystemService.mockImplementation(() => mockFileSystemServiceInstance);
  mockProjectManifestService.mockImplementation(() => mockProjectManifestServiceInstance);
  mockProjectValidationService.mockImplementation(() => mockProjectValidationServiceInstance);
  mockProjectFixService.mockImplementation(() => mockProjectFixServiceInstance);
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
      setupServiceMocks();
      // Register mock services in container
      mockContainer.registerInstance(TemplateService, mockTemplateServiceInstance as any);
      mockContainer.registerInstance(FileSystemService, mockFileSystemServiceInstance as any);
      mockContainer.registerInstance(ProjectManifestService, mockProjectManifestServiceInstance as any);
      mockContainer.registerInstance(ProjectValidationService, mockProjectValidationServiceInstance as any);
      mockContainer.registerInstance(ProjectFixService, mockProjectFixServiceInstance as any);
    }

    const command = createFixCommand(mockContainer);
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

describe('scaffold fix command unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupServiceMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('command structure', () => {
    it('should create command with correct configuration', () => {
      const mockContainer = container.createChildContainer();
      const command = createFixCommand(mockContainer);

      expect(command.name()).toBe('fix');
      expect(command.description()).toBe('Fix project structure issues automatically');

      // Check arguments
      const args = command.registeredArguments;
      expect(args).toHaveLength(1);
      // Check argument description by looking at the argument object
      // args[0] is a string but commander stores metadata elsewhere

      // Check options
      const options = command.options;
      const optionNames = options.map(opt => opt.long);
      expect(optionNames).toContain('--verbose');
      expect(optionNames).toContain('--dry-run');
      expect(optionNames).toContain('--force');
      expect(optionNames).toContain('--backup');
    });

    it('should have proper option configurations', () => {
      const mockContainer = container.createChildContainer();
      const command = createFixCommand(mockContainer);
      const options = command.options;

      const verboseOption = options.find(opt => opt.long === '--verbose');
      expect(verboseOption?.description).toContain('Show detailed fix output');

      const dryRunOption = options.find(opt => opt.long === '--dry-run');
      expect(dryRunOption?.description).toContain('Show what would be fixed');

      const forceOption = options.find(opt => opt.long === '--force');
      expect(forceOption?.description).toContain('Fix issues without confirmation');

      const backupOption = options.find(opt => opt.long === '--backup');
      expect(backupOption?.description).toContain('Create backup before making changes');
      expect(backupOption?.defaultValue).toBe(true);
    });
  });

  describe('path resolution', () => {
    it('should use current directory when no project path provided', async () => {
      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue('/current/directory');
      mockExistsSync.mockReturnValue(true);

      const mockProjectManifestServiceInstance = {
        loadProjectManifest: jest.fn().mockResolvedValue(null),
              };

      mockProjectManifestService.mockImplementation(() => mockProjectManifestServiceInstance as any);

      const result = await executeCommand([]);

      expect(result.stdout).toContain('Not a scaffold-managed project.');
      cwdSpy.mockRestore();
    });

    it('should use provided project path', async () => {
      mockExistsSync.mockReturnValue(true);

      const mockProjectManifestServiceInstance = {
        loadProjectManifest: jest.fn().mockResolvedValue({
          id: '123',
          projectName: 'test-project',
          templates: [],
          version: '1.0.0'
        } as any),
      };
      const mockProjectFixServiceInstance = {
        fixProject: jest.fn().mockResolvedValue({
          valid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          stats: { filesChecked: 10, foldersChecked: 5, errorCount: 0, warningCount: 0, duration: 100 }
        }),
      };

      mockProjectManifestService.mockImplementation(() => mockProjectManifestServiceInstance as any);
      mockProjectFixService.mockImplementation(() => mockProjectFixServiceInstance as any);

      await executeCommand(['/specified/path']);

      expect(mockProjectManifestServiceInstance.loadProjectManifest).toHaveBeenCalledWith('/specified/path');
    });

    it('should handle relative paths correctly', async () => {
      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue('/current/directory');
      mockExistsSync.mockReturnValue(true);

      const mockProjectManifestServiceInstance = {
        loadProjectManifest: jest.fn().mockResolvedValue({
          id: '123',
          projectName: 'test-project',
          templates: [],
          version: '1.0.0'
        } as any),
      };
      const mockProjectFixServiceInstance = {
        fixProject: jest.fn().mockResolvedValue({
          valid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          stats: { filesChecked: 10, foldersChecked: 5, errorCount: 0, warningCount: 0, duration: 100 }
        }),
      };

      mockProjectManifestService.mockImplementation(() => mockProjectManifestServiceInstance as any);
      mockProjectFixService.mockImplementation(() => mockProjectFixServiceInstance as any);

      await executeCommand(['./relative/path']);

      expect(mockProjectManifestServiceInstance.loadProjectManifest).toHaveBeenCalledWith('/current/directory/relative/path');
      cwdSpy.mockRestore();
    });
  });

  describe('directory validation', () => {
    it('should fail when target directory does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await executeCommand(['/nonexistent/path']);

      expect(result.stderr).toContain('Error: Directory "/nonexistent/path" does not exist');
      expect(result.exitCode).toBe(1);
    });

    it('should proceed when target directory exists', async () => {
      mockExistsSync.mockReturnValue(true);

      const mockProjectManifestServiceInstance = {
        loadProjectManifest: jest.fn().mockResolvedValue(null),
              };

      mockProjectManifestService.mockImplementation(() => mockProjectManifestServiceInstance as any);

      const result = await executeCommand(['/existing/path']);

      expect(result.stdout).toContain('Not a scaffold-managed project.');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('scaffold manifest detection', () => {
    it('should handle non-scaffold-managed projects gracefully', async () => {
      mockExistsSync.mockReturnValue(true);

      const mockProjectManifestServiceInstance = {
        loadProjectManifest: jest.fn().mockResolvedValue(null),
              };

      mockProjectManifestService.mockImplementation(() => mockProjectManifestServiceInstance as any);

      const result = await executeCommand(['/regular/project']);

      expect(result.stdout).toContain('Not a scaffold-managed project.');
      expect(result.stdout).toContain('No .scaffold/manifest.json file found.');
      expect(result.stdout).toContain('Use "scaffold new" to create a new project or "scaffold extend" to add templates.');
      expect(result.exitCode).toBe(0);
    });

    it('should process scaffold-managed projects', async () => {
      mockExistsSync.mockReturnValue(true);

      const mockManifest: ProjectManifest = {
        id: 'project-123',
        version: '1.0.0',
        projectName: 'test-project',
        templates: [
          {
            templateSha: 'template1',
            name: 'Template 1',
            version: '1.0.0',
            appliedAt: '2023-01-01T00:00:00.000Z',
            rootFolder: 'project',
            status: 'active' as const,
            conflicts: []
          }
        ],
        variables: {},
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        history: [],
      };

      const mockReport: ValidationReport = {
        id: 'report-123',
        timestamp: '2023-01-01T00:00:00.000Z',
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        stats: {
          filesChecked: 10,
          foldersChecked: 5,
          templatesChecked: 1,
          errorsFound: 0,
          warningsFound: 0,
          executionTime: 150,
          rulesEvaluated: 5,
          errorCount: 0,
          warningCount: 0,
          duration: 150,
        },
      };

      // Set up the global service mocks before calling executeCommand
      const mockContainer = container.createChildContainer();

      const mockTemplateServiceInstance = {} as any;
      const mockFileSystemServiceInstance = {} as any;
      const mockProjectManifestServiceInstance = {
        loadProjectManifest: jest.fn().mockResolvedValue(mockManifest),
        getProjectManifest: jest.fn(),
        updateProjectManifest: jest.fn(),
      } as any;
      const mockProjectValidationServiceInstance = {} as any;
      const mockProjectFixServiceInstance = {
        fixProject: jest.fn().mockResolvedValue(mockReport),
      } as any;

      // Register mock services in container
      mockContainer.registerInstance(TemplateService, mockTemplateServiceInstance);
      mockContainer.registerInstance(FileSystemService, mockFileSystemServiceInstance);
      mockContainer.registerInstance(ProjectManifestService, mockProjectManifestServiceInstance);
      mockContainer.registerInstance(ProjectValidationService, mockProjectValidationServiceInstance);
      mockContainer.registerInstance(ProjectFixService, mockProjectFixServiceInstance);

      const result = await executeCommand(['/scaffold/project'], false, mockContainer);

      expect(result.stdout).toContain('Project Fix Report');
      expect(result.stdout.some(line => line.includes('Project structure is valid'))).toBe(true);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('verbose mode', () => {
    it('should show detailed output in verbose mode', async () => {
      mockExistsSync.mockReturnValue(true);

      const mockManifest: ProjectManifest = {
        id: 'project-123',
        version: '1.0.0',
        projectName: 'test-project',
        templates: [
          {
            templateSha: 'template1',
            name: 'Template 1',
            version: '1.0.0',
            appliedAt: '2023-01-01T00:00:00.000Z',
            rootFolder: 'project',
            status: 'active' as const,
            conflicts: []
          },
          {
            templateSha: 'template2',
            name: 'Template 2',
            version: '2.0.0',
            appliedAt: '2023-01-01T00:00:00.000Z',
            rootFolder: 'project',
            status: 'active' as const,
            conflicts: []
          }
        ],
        variables: {},
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        history: [],
      };

      const mockReport: ValidationReport = {
        id: 'report-123',
        timestamp: '2023-01-01T00:00:00.000Z',
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        stats: {
          filesChecked: 10,
          foldersChecked: 5,
          templatesChecked: 2,
          errorsFound: 0,
          warningsFound: 0,
          executionTime: 150,
          rulesEvaluated: 8,
          errorCount: 0,
          warningCount: 0,
          duration: 150,
        },
      };

      const mockProjectManifestServiceInstance = {
        loadProjectManifest: jest.fn().mockResolvedValue(mockManifest),
        fixProject: jest.fn().mockResolvedValue(mockReport),
      };

      mockProjectManifestService.mockImplementation(() => mockProjectManifestServiceInstance as any);

      const result = await executeCommand(['/scaffold/project', '--verbose']);

      expect(result.stdout).toContain('Fixing project: /scaffold/project');
      expect(result.stdout).toContain('Project name: test-project');
      expect(result.stdout).toContain('Applied templates: Template 1@1.0.0, Template 2@2.0.0');
    });
  });

  describe('fix report display', () => {
    it('should display valid project report', async () => {
      mockExistsSync.mockReturnValue(true);

      const mockManifest: ProjectManifest = {
        id: 'project-123',
        version: '1.0.0',
        projectName: 'test-project',
        templates: [],
        variables: {},
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        history: [],
      };

      const mockReport: ValidationReport = {
        id: 'report-123',
        timestamp: '2023-01-01T00:00:00.000Z',
        valid: true,
        errors: [],
        warnings: [],
        suggestions: ['Project structure is optimal'],
        stats: {
          filesChecked: 15,
          foldersChecked: 8,
          templatesChecked: 1,
          errorsFound: 0,
          warningsFound: 0,
          executionTime: 200,
          rulesEvaluated: 10,
          errorCount: 0,
          warningCount: 0,
          duration: 200,
        },
      };

      const mockProjectManifestServiceInstance = {
        loadProjectManifest: jest.fn().mockResolvedValue(mockManifest),
        fixProject: jest.fn().mockResolvedValue(mockReport),
      };

      mockProjectManifestService.mockImplementation(() => mockProjectManifestServiceInstance as any);

      const result = await executeCommand(['/scaffold/project']);

      expect(result.stdout).toContain('Project Fix Report');
      expect(result.stdout).toContain('✓ Project structure is valid - no fixes needed');
      expect(result.stdout).toContain('Summary:');
      expect(result.stdout).toContain('Project structure is optimal');
      expect(result.stdout).toContain('Statistics:');
      expect(result.stdout).toContain('Files checked: 15');
      expect(result.stdout).toContain('Folders checked: 8');
      expect(result.stdout).toContain('Errors: 0');
      expect(result.stdout).toContain('Warnings: 0');
      expect(result.stdout).toContain('Duration: 200ms');
      expect(result.exitCode).toBe(0);
    });

    it('should display errors and warnings', async () => {
      mockExistsSync.mockReturnValue(true);

      const mockManifest: ProjectManifest = {
        id: 'project-123',
        version: '1.0.0',
        projectName: 'test-project',
        templates: [],
        variables: {},
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        history: [],
      };

      const mockReport: ValidationReport = {
        id: 'report-123',
        timestamp: '2023-01-01T00:00:00.000Z',
        valid: false,
        errors: [
          {
            id: 'error-1',
            severity: 'error' as const,
            templateSha: 'template-123',
            ruleId: 'package-json-required',
            path: 'package.json',
            expected: 'package.json file',
            actual: 'missing',
            message: 'Missing required file: package.json',
            suggestion: 'Create package.json with npm init'
          }
        ],
        warnings: [
          {
            id: 'warning-1',
            template: 'template-123',
            path: 'package.json',
            message: 'Outdated dependency version',
            suggestion: 'Update dependencies with npm update'
          }
        ],
        suggestions: ['Run npm audit to check for vulnerabilities'],
        stats: {
          filesChecked: 10,
          foldersChecked: 5,
          templatesChecked: 1,
          errorsFound: 1,
          warningsFound: 1,
          executionTime: 180,
          rulesEvaluated: 7,
          errorCount: 1,
          warningCount: 1,
          duration: 180,
        },
      };

      const mockProjectManifestServiceInstance = {
        loadProjectManifest: jest.fn().mockResolvedValue(mockManifest),
        fixProject: jest.fn().mockResolvedValue(mockReport),
      };

      mockProjectManifestService.mockImplementation(() => mockProjectManifestServiceInstance as any);

      const result = await executeCommand(['/scaffold/project']);

      expect(result.stdout).toContain('Remaining Errors:');
      expect(result.stdout).toContain('✗ Missing required file: package.json');
      expect(result.stdout).toContain('Suggestion: Create package.json with npm init');
      expect(result.stdout).toContain('Warnings:');
      expect(result.stdout).toContain('⚠ Outdated dependency version');
      expect(result.stdout).toContain('Suggestion: Update dependencies with npm update');
      expect(result.stdout).toContain('Summary:');
      expect(result.stdout).toContain('Run npm audit to check for vulnerabilities');
      expect(result.exitCode).toBe(1);
    });

    it('should handle warnings-only projects', async () => {
      mockExistsSync.mockReturnValue(true);

      const mockManifest: ProjectManifest = {
        id: 'project-123',
        version: '1.0.0',
        projectName: 'test-project',
        templates: [],
        variables: {},
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        history: [],
      };

      const mockReport: ValidationReport = {
        id: 'report-123',
        timestamp: '2023-01-01T00:00:00.000Z',
        valid: false,
        errors: [],
        warnings: [
          {
            id: 'warning-2',
            template: 'template-123',
            path: 'config.js',
            message: 'Potential security issue',
            suggestion: 'Review security settings'
          }
        ],
        suggestions: [],
        stats: {
          filesChecked: 8,
          foldersChecked: 3,
          templatesChecked: 1,
          errorsFound: 0,
          warningsFound: 1,
          executionTime: 100,
          rulesEvaluated: 5,
          errorCount: 0,
          warningCount: 1,
          duration: 100,
        },
      };

      const mockProjectManifestServiceInstance = {
        loadProjectManifest: jest.fn().mockResolvedValue(mockManifest),
        fixProject: jest.fn().mockResolvedValue(mockReport),
      };

      mockProjectManifestService.mockImplementation(() => mockProjectManifestServiceInstance as any);

      const result = await executeCommand(['/scaffold/project']);

      expect(result.stdout).toContain('Warnings:');
      expect(result.stdout).toContain('⚠ Potential security issue');
      expect(result.stdout).not.toContain('Remaining Errors:');
      expect(result.exitCode).toBe(2);
    });
  });

  describe('dry run mode', () => {
    it('should pass dry run flag to fix service', async () => {
      mockExistsSync.mockReturnValue(true);

      const mockManifest: ProjectManifest = {
        id: 'project-123',
        version: '1.0.0',
        projectName: 'test-project',
        templates: [],
        variables: {},
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        history: [],
      };

      const mockReport: ValidationReport = {
        id: 'report-123',
        timestamp: '2023-01-01T00:00:00.000Z',
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        stats: {
          filesChecked: 5,
          foldersChecked: 2,
          templatesChecked: 1,
          errorsFound: 0,
          warningsFound: 0,
          executionTime: 50,
          rulesEvaluated: 3,
          errorCount: 0,
          warningCount: 0,
          duration: 50,
        },
      };

      const mockProjectManifestServiceInstance = {
        loadProjectManifest: jest.fn().mockResolvedValue(mockManifest),
        fixProject: jest.fn().mockResolvedValue(mockReport),
      };

      mockProjectManifestService.mockImplementation(() => mockProjectManifestServiceInstance as any);

      await executeCommand(['/scaffold/project', '--dry-run']);

      expect(mockProjectFixServiceInstance.fixProject).toHaveBeenCalledWith('/scaffold/project', true);
    });
  });

  describe('option combinations', () => {
    it('should handle multiple options correctly', async () => {
      mockExistsSync.mockReturnValue(true);

      const mockManifest: ProjectManifest = {
        id: 'project-123',
        version: '1.0.0',
        projectName: 'test-project',
        templates: [],
        variables: {},
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        history: [],
      };

      const mockReport: ValidationReport = {
        id: 'report-123',
        timestamp: '2023-01-01T00:00:00.000Z',
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        stats: {
          filesChecked: 3,
          foldersChecked: 1,
          templatesChecked: 1,
          errorsFound: 0,
          warningsFound: 0,
          executionTime: 25,
          rulesEvaluated: 2,
          errorCount: 0,
          warningCount: 0,
          duration: 25,
        },
      };

      const mockProjectManifestServiceInstance = {
        loadProjectManifest: jest.fn().mockResolvedValue(mockManifest),
        fixProject: jest.fn().mockResolvedValue(mockReport),
      };

      mockProjectManifestService.mockImplementation(() => mockProjectManifestServiceInstance as any);

      const result = await executeCommand(['/scaffold/project', '--verbose', '--dry-run', '--force', '--backup']);

      expect(result.stdout).toContain('Fixing project: /scaffold/project');
      expect(result.stdout).toContain('Project Fix Report');
      expect(mockProjectFixServiceInstance.fixProject).toHaveBeenCalledWith('/scaffold/project', true);
    });

    it('should handle --no-backup option', async () => {
      mockExistsSync.mockReturnValue(true);

      const mockManifest: ProjectManifest = {
        id: 'project-123',
        version: '1.0.0',
        projectName: 'test-project',
        templates: [],
        variables: {},
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        history: [],
      };

      const mockReport: ValidationReport = {
        id: 'report-123',
        timestamp: '2023-01-01T00:00:00.000Z',
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        stats: {
          filesChecked: 3,
          foldersChecked: 1,
          templatesChecked: 1,
          errorsFound: 0,
          warningsFound: 0,
          executionTime: 25,
          rulesEvaluated: 2,
          errorCount: 0,
          warningCount: 0,
          duration: 25,
        },
      };

      const mockProjectManifestServiceInstance = {
        loadProjectManifest: jest.fn().mockResolvedValue(mockManifest),
        fixProject: jest.fn().mockResolvedValue(mockReport),
      };

      mockProjectManifestService.mockImplementation(() => mockProjectManifestServiceInstance as any);

      await executeCommand(['/scaffold/project', '--no-backup']);

      expect(mockProjectFixServiceInstance.fixProject).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      mockExistsSync.mockReturnValue(true);

      const mockProjectManifestServiceInstance = {
        loadProjectManifest: jest.fn().mockRejectedValue(new Error('Failed to load manifest')),
              };

      mockProjectManifestService.mockImplementation(() => mockProjectManifestServiceInstance as any);

      const result = await executeCommand(['/scaffold/project']);

      expect(result.stderr).toContain('Failed to load manifest');
      expect(result.exitCode).toBe(1);
    });

    it('should handle fix service errors', async () => {
      mockExistsSync.mockReturnValue(true);

      const mockManifest: ProjectManifest = {
        id: 'project-123',
        version: '1.0.0',
        projectName: 'test-project',
        templates: [],
        variables: {},
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        history: [],
      };

      const mockProjectManifestServiceInstance = {
        loadProjectManifest: jest.fn().mockResolvedValue(mockManifest),
        fixProject: jest.fn().mockRejectedValue(new Error('Fix operation failed')),
      };

      mockProjectManifestService.mockImplementation(() => mockProjectManifestServiceInstance as any);

      const result = await executeCommand(['/scaffold/project']);

      expect(result.stderr).toContain('Fix operation failed');
      expect(result.exitCode).toBe(1);
    });

    it('should handle unexpected errors', async () => {
      mockExistsSync.mockReturnValue(true);

      const mockProjectManifestServiceInstance = {
        loadProjectManifest: jest.fn().mockImplementation(() => {
          throw new Error('Unexpected error');
        }),
              };

      mockProjectManifestService.mockImplementation(() => mockProjectManifestServiceInstance as any);

      const result = await executeCommand(['/scaffold/project']);

      expect(result.stderr).toContain('Unexpected error');
      expect(result.exitCode).toBe(1);
    });
  });

  describe('exit codes', () => {
    it('should exit with code 0 for valid projects', async () => {
      mockExistsSync.mockReturnValue(true);

      const mockManifest: ProjectManifest = {
        id: 'project-123',
        version: '1.0.0',
        projectName: 'test-project',
        templates: [],
        variables: {},
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        history: [],
      };

      const mockReport: ValidationReport = {
        id: 'report-123',
        timestamp: '2023-01-01T00:00:00.000Z',
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        stats: {
          filesChecked: 5,
          foldersChecked: 2,
          templatesChecked: 1,
          errorsFound: 0,
          warningsFound: 0,
          executionTime: 50,
          rulesEvaluated: 3,
          errorCount: 0,
          warningCount: 0,
          duration: 50,
        },
      };

      const mockProjectManifestServiceInstance = {
        loadProjectManifest: jest.fn().mockResolvedValue(mockManifest),
        fixProject: jest.fn().mockResolvedValue(mockReport),
      };

      mockProjectManifestService.mockImplementation(() => mockProjectManifestServiceInstance as any);

      const result = await executeCommand(['/scaffold/project']);

      expect(result.exitCode).toBe(0);
    });

    it('should exit with code 1 for projects with errors', async () => {
      mockExistsSync.mockReturnValue(true);

      const mockManifest: ProjectManifest = {
        id: 'project-123',
        version: '1.0.0',
        projectName: 'test-project',
        templates: [],
        variables: {},
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        history: [],
      };

      const mockReport: ValidationReport = {
        id: 'report-123',
        timestamp: '2023-01-01T00:00:00.000Z',
        valid: false,
        errors: [{
          id: 'error-2',
          severity: 'error' as const,
          templateSha: 'template-123',
          ruleId: 'some-rule',
          path: 'file.js',
          expected: 'valid file',
          actual: 'invalid',
          message: 'Error occurred'
        }],
        warnings: [],
        suggestions: [],
        stats: {
          filesChecked: 5,
          foldersChecked: 2,
          templatesChecked: 1,
          errorsFound: 1,
          warningsFound: 0,
          executionTime: 50,
          rulesEvaluated: 3,
          errorCount: 1,
          warningCount: 0,
          duration: 50,
        },
      };

      const mockProjectManifestServiceInstance = {
        loadProjectManifest: jest.fn().mockResolvedValue(mockManifest),
        fixProject: jest.fn().mockResolvedValue(mockReport),
      };

      mockProjectManifestService.mockImplementation(() => mockProjectManifestServiceInstance as any);

      const result = await executeCommand(['/scaffold/project']);

      expect(result.exitCode).toBe(1);
    });

    it('should exit with code 2 for projects with only warnings', async () => {
      mockExistsSync.mockReturnValue(true);

      const mockManifest: ProjectManifest = {
        id: 'project-123',
        version: '1.0.0',
        projectName: 'test-project',
        templates: [],
        variables: {},
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        history: [],
      };

      const mockReport: ValidationReport = {
        id: 'report-123',
        timestamp: '2023-01-01T00:00:00.000Z',
        valid: false,
        errors: [],
        warnings: [{
          id: 'warning-3',
          template: 'template-123',
          path: 'file.js',
          message: 'Warning occurred'
        }],
        suggestions: [],
        stats: {
          filesChecked: 5,
          foldersChecked: 2,
          templatesChecked: 1,
          errorsFound: 0,
          warningsFound: 1,
          executionTime: 50,
          rulesEvaluated: 3,
          errorCount: 0,
          warningCount: 1,
          duration: 50,
        },
      };

      const mockProjectManifestServiceInstance = {
        loadProjectManifest: jest.fn().mockResolvedValue(mockManifest),
        fixProject: jest.fn().mockResolvedValue(mockReport),
      };

      mockProjectManifestService.mockImplementation(() => mockProjectManifestServiceInstance as any);

      const result = await executeCommand(['/scaffold/project']);

      expect(result.exitCode).toBe(2);
    });
  });
});