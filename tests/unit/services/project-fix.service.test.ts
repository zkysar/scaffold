/**
 * Unit tests for ProjectFixService
 */

import mockFs from 'mock-fs';
import { ProjectFixService } from '../../../src/services/project-fix.service';
import type { ITemplateService } from '../../../src/services/template-service';
import type { IFileSystemService } from '../../../src/services/file-system.service';
import type { IProjectValidationService } from '../../../src/services/project-validation.service';
import type {
  Template,
  ProjectManifest,
  ValidationReport,
} from '../../../src/models';
import type { IVariableSubstitutionService } from '../../../src/services/variable-substitution.service';
import type { IProjectManifestService } from '../../../src/services/project-manifest.service';
import {
  createMockImplementation,
  assertDefined,
} from '../../helpers/test-utils';

describe('ProjectFixService', () => {
  let fixService: ProjectFixService;
  let mockTemplateService: jest.Mocked<ITemplateService>;
  let mockFileService: jest.Mocked<IFileSystemService>;
  let mockValidationService: jest.Mocked<IProjectValidationService>;
  let mockVariableService: jest.Mocked<IVariableSubstitutionService>;
  let mockManifestService: jest.Mocked<IProjectManifestService>;

  const mockTemplate: Template = {
    id: 'test-template-123',
    name: 'Test Template',
    version: '1.0.0',
    description: 'A test template for unit testing',
    rootFolder: 'test-project',
    author: 'Test Author',
    created: '2023-01-01T00:00:00.000Z',
    updated: '2023-01-01T00:00:00.000Z',
    folders: [
      {
        path: 'src',
        description: 'Source code directory',
        permissions: '755',
        gitkeep: false,
      },
    ],
    files: [
      {
        path: 'package.json',
        content: '{"name": "{{PROJECT_NAME}}"}',
        permissions: '644',
        variables: true,
      },
    ],
    variables: [
      {
        name: 'PROJECT_NAME',
        description: 'Name of the project',
        required: true,
        default: '',
      },
    ],
    rules: {
      strictMode: false,
      allowExtraFiles: false,
      allowExtraFolders: false,
      conflictResolution: 'prompt',
      excludePatterns: [],
      rules: [],
    },
  };

  const mockManifest: ProjectManifest = {
    id: 'project-123',
    version: '1.0.0',
    projectName: 'Test Project',
    created: '2023-01-01T00:00:00.000Z',
    updated: '2023-01-01T00:00:00.000Z',
    templates: [
      {
        templateSha: 'test-template-123',
        name: 'Test Template',
        version: '1.0.0',
        rootFolder: 'test-project',
        appliedBy: 'test-user',
        appliedAt: '2023-01-01T00:00:00.000Z',
        status: 'active',
        conflicts: [],
      },
    ],
    variables: {
      PROJECT_NAME: 'Test Project',
    },
    history: [],
  };

  const mockValidationReport: ValidationReport = {
    id: 'validation-123',
    timestamp: '2023-01-01T00:00:00.000Z',
    projectId: 'project-123',
    projectName: 'Test Project',
    projectPath: '/test-project',
    templates: ['test-template-123'],
    valid: false,
    errors: [
      {
        id: 'error-1',
        severity: 'error',
        templateSha: 'test-template-123',
        ruleId: 'required_folder',
        path: 'test-project/src',
        expected: 'Directory to exist',
        actual: 'Directory does not exist',
        message: "Required directory 'test-project/src' does not exist",
        fix: {
          action: 'create',
          autoFix: true,
        },
      },
      {
        id: 'error-2',
        severity: 'error',
        templateSha: 'test-template-123',
        ruleId: 'required_file',
        path: 'test-project/package.json',
        expected: 'File to exist',
        actual: 'File does not exist',
        message: "Required file 'test-project/package.json' does not exist",
        fix: {
          action: 'create',
          content: '{"name": "test"}',
          autoFix: true,
        },
      },
    ],
    warnings: [],
    suggestions: [],
    stats: {
      filesChecked: 1,
      foldersChecked: 1,
      templatesChecked: 1,
      errorsFound: 2,
      warningsFound: 0,
      executionTime: 100,
      rulesEvaluated: 0,
      errorCount: 2,
      warningCount: 0,
      duration: 100,
    },
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock services
    mockTemplateService = createMockImplementation<ITemplateService>({
      getTemplate: jest.fn(),
      loadTemplates: jest.fn(),
      searchTemplates: jest.fn(),
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      installTemplate: jest.fn(),
      validateTemplate: jest.fn(),
      getTemplateDependencies: jest.fn(),
      exportTemplate: jest.fn(),
      importTemplate: jest.fn(),
      loadTemplate: jest.fn(),
      saveTemplate: jest.fn(),
    });

    mockFileService = createMockImplementation<IFileSystemService>({
      exists: jest.fn(),
      isDirectory: jest.fn(),
      isFile: jest.fn(),
      readFile: jest.fn(),
      readJson: jest.fn(),
      writeFile: jest.fn(),
      writeJson: jest.fn(),
      createFile: jest.fn(),
      createDirectory: jest.fn(),
      ensureDirectory: jest.fn(),
      deletePath: jest.fn(),
      copyPath: jest.fn(),
      readDirectory: jest.fn(),
      resolvePath: jest.fn(),
      isDryRun: false,
      setDryRun: jest.fn(),
    });

    mockValidationService = createMockImplementation<IProjectValidationService>(
      {
        validateProject: jest.fn(),
        findNearestManifest: jest.fn(),
      }
    );

    mockVariableService = createMockImplementation<IVariableSubstitutionService>({
      substituteVariables: jest.fn(),
      substituteInFile: jest.fn(),
      substituteInPath: jest.fn(),
      validateRequiredVariables: jest.fn(),
      extractVariables: jest.fn(),
      applyTransformation: jest.fn(),
      createContext: jest.fn(),
    });

    mockManifestService = createMockImplementation<IProjectManifestService>({
      loadProjectManifest: jest.fn(),
      getProjectManifest: jest.fn(),
      saveProjectManifest: jest.fn(),
      updateProjectManifest: jest.fn(),
      findNearestManifest: jest.fn(),
    });

    // Create service instance
    fixService = new ProjectFixService(
      mockTemplateService,
      mockFileService,
      mockValidationService,
      mockVariableService,
      mockManifestService
    );

    // Setup mock-fs
    mockFs({
      '/test-project': {
        '.scaffold': {
          'manifest.json': JSON.stringify(mockManifest),
        },
      },
      '/home/user/.scaffold/templates/test-template-123/files/package.json.template':
        '{"name": "{{PROJECT_NAME}}"}',
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  describe('fixProject', () => {
    beforeEach(() => {
      // Setup default mock returns
      mockValidationService.validateProject.mockResolvedValue(
        mockValidationReport
      );
      mockValidationService.findNearestManifest.mockResolvedValue({
        manifestPath: '/test-project/.scaffold/manifest.json',
        projectPath: '/test-project',
      });
      mockManifestService.getProjectManifest.mockResolvedValue(mockManifest);
      mockTemplateService.getTemplate.mockResolvedValue(mockTemplate);
      mockFileService.resolvePath.mockImplementation((...paths) =>
        paths.join('/')
      );
      mockFileService.createDirectory.mockResolvedValue();
      mockFileService.createFile.mockResolvedValue();
      mockFileService.readFile.mockResolvedValue(
        '{"name": "{{PROJECT_NAME}}"}'
      );
      mockFileService.exists.mockResolvedValue(true);
      mockManifestService.updateProjectManifest.mockResolvedValue(undefined);
      mockVariableService.substituteInPath.mockImplementation((path) => path);
      mockVariableService.substituteVariables.mockImplementation((content) =>
        content.replace('{{PROJECT_NAME}}', 'Test Project')
      );
    });

    it('should return validation report if project is already valid', async () => {
      const validReport = { ...mockValidationReport, valid: true, errors: [] };
      mockValidationService.validateProject.mockResolvedValue(validReport);

      const result = await fixService.fixProject('/test-project');

      expect(result).toBe(validReport);
      expect(mockFileService.createDirectory).not.toHaveBeenCalled();
      expect(mockFileService.createFile).not.toHaveBeenCalled();
    });

    it('should throw error for invalid project path', async () => {
      await expect(fixService.fixProject('')).rejects.toThrow(
        'Project path must be a non-empty string'
      );

      await expect(fixService.fixProject(null as any)).rejects.toThrow(
        'Project path must be a non-empty string'
      );
    });

    it('should fix auto-fixable errors', async () => {
      const result = await fixService.fixProject('/test-project');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.suggestions).toContain(
        'Fixed 2 errors (1 files, 1 folders)'
      );
      expect(mockFileService.createDirectory).toHaveBeenCalledWith(
        '/test-project/test-project/src'
      );
      expect(mockFileService.createFile).toHaveBeenCalledWith(
        '/test-project/test-project/package.json',
        '{"name": "Test Project"}',
        { overwrite: true }
      );
    });

    it('should handle dry run mode', async () => {
      const result = await fixService.fixProject('/test-project', true);

      expect(mockFileService.setDryRun).toHaveBeenCalledWith(true);
      expect(result.suggestions).toContain(
        'This was a dry run - no changes were made'
      );
      expect(mockManifestService.updateProjectManifest).not.toHaveBeenCalled();
    });

    it('should restore original dry run mode after completion', async () => {
      const originalIsDryRun = true;
      Object.defineProperty(mockFileService, 'isDryRun', {
        value: originalIsDryRun,
        writable: false,
        configurable: true,
      });

      await fixService.fixProject('/test-project', false);

      expect(mockFileService.setDryRun).toHaveBeenCalledWith(originalIsDryRun);
    });

    it('should handle non-auto-fixable errors', async () => {
      const reportWithManualFix = {
        ...mockValidationReport,
        errors: [
          {
            ...mockValidationReport.errors[0],
            fix: {
              action: 'delete' as const,
              message: 'Manual intervention required',
              autoFix: false,
            },
          },
        ],
      };
      mockValidationService.validateProject.mockResolvedValue(
        reportWithManualFix
      );

      const result = await fixService.fixProject('/test-project');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(
        result.warnings.some(w => w.message.includes('Manual fix required'))
      ).toBe(true);
    });

    it('should handle fix failures gracefully', async () => {
      mockFileService.createDirectory.mockRejectedValue(
        new Error('Permission denied')
      );

      const result = await fixService.fixProject('/test-project');

      expect(result.valid).toBe(false);
      expect(
        result.warnings.some(w => w.message.includes('Failed to fix error'))
      ).toBe(true);
    });

    it('should update project manifest with fix history', async () => {
      await fixService.fixProject('/test-project');

      expect(mockManifestService.updateProjectManifest).toHaveBeenCalledWith(
        '/test-project',
        expect.objectContaining({
          history: expect.arrayContaining([
            expect.objectContaining({
              action: 'check',
              changes: expect.arrayContaining([
                expect.objectContaining({
                  type: 'added',
                  reason: expect.stringContaining('Fixed:'),
                }),
              ]),
            }),
          ]),
        })
      );
    });

    it('should not update manifest in dry run mode', async () => {
      await fixService.fixProject('/test-project', true);

      expect(mockManifestService.updateProjectManifest).not.toHaveBeenCalled();
    });

    it('should throw error when no manifest is found', async () => {
      mockManifestService.getProjectManifest.mockResolvedValue(null);

      await expect(fixService.fixProject('/test-project')).rejects.toThrow(
        'No project manifest found'
      );
    });

    it('should recreate files with proper content from template', async () => {
      await fixService.fixProject('/test-project');

      // Verify file was created with substituted variables
      expect(mockFileService.createFile).toHaveBeenCalledWith(
        '/test-project/test-project/package.json',
        '{"name": "Test Project"}', // PROJECT_NAME substituted
        { overwrite: true }
      );
    });

    it('should handle source file reading from template', async () => {
      const templateWithSourceFile = {
        ...mockTemplate,
        files: [
          {
            path: 'package.json',
            description: 'Package configuration',
            sourcePath: 'package.json.template',
            variables: true,
          },
        ],
      };
      mockTemplateService.getTemplate.mockResolvedValue(templateWithSourceFile);

      await fixService.fixProject('/test-project');

      expect(mockFileService.readFile).toHaveBeenCalledWith(
        expect.stringContaining('/templates/test-template-123/files/package.json.template')
      );
    });

    it('should handle manifest write failures gracefully', async () => {
      mockManifestService.updateProjectManifest.mockRejectedValue(
        new Error('Failed to write project manifest: Permission denied')
      );

      const result = await fixService.fixProject('/test-project');

      // Should complete successfully but add a warning about manifest failure
      expect(result.valid).toBe(true); // Files were still fixed
      expect(result.warnings.some(w =>
        w.message.includes('Failed to update project manifest') &&
        w.path === '.scaffold/manifest.json'
      )).toBe(true);
    });

    it('should not attempt manifest write in dry-run mode', async () => {
      const result = await fixService.fixProject('/test-project', true);

      expect(mockFileService.setDryRun).toHaveBeenCalledWith(true);
      expect(mockManifestService.updateProjectManifest).not.toHaveBeenCalled();
      expect(result.suggestions && result.suggestions.includes('This was a dry run - no changes were made')).toBe(true);
    });
  });
});
