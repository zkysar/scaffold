/**
 * Unit tests for ProjectFixService
 */

import { ProjectFixService } from '../../../src/services/project-fix.service';
import type {
  Template,
  ProjectManifest,
  ValidationReport,
} from '../../../src/models';
import { FakeTemplateService } from '../../fakes/template-service.fake';
import { FakeFileSystemService } from '../../fakes/file-system.fake';
import { FakeProjectValidationService } from '../../fakes/project-validation.fake';
import { FakeProjectManifestService } from '../../fakes/project-manifest.fake';
import { FakeVariableSubstitutionService } from '../../fakes/variable-substitution.fake';

describe('ProjectFixService', () => {
  let fixService: ProjectFixService;
  let fakeTemplateService: FakeTemplateService;
  let fakeFileService: FakeFileSystemService;
  let fakeValidationService: FakeProjectValidationService;
  let fakeManifestService: FakeProjectManifestService;
  let fakeVariableService: FakeVariableSubstitutionService;

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
    // Create fake services
    fakeTemplateService = new FakeTemplateService();
    fakeFileService = new FakeFileSystemService();
    fakeValidationService = new FakeProjectValidationService();
    fakeManifestService = new FakeProjectManifestService();
    fakeVariableService = new FakeVariableSubstitutionService();

    // Reset all fakes
    fakeTemplateService.reset();
    fakeFileService.reset();
    fakeValidationService.reset();
    fakeManifestService.reset();
    fakeVariableService.reset();

    // Set up fake data
    fakeTemplateService.addTemplate(mockTemplate);
    fakeManifestService.setManifest('/test-project', mockManifest);

    // Set up file system state
    fakeFileService.setDirectory('/test-project');
    fakeFileService.setDirectory('/test-project/.scaffold');
    fakeFileService.setFile('/test-project/.scaffold/manifest.json', JSON.stringify(mockManifest));
    fakeFileService.setFile(
      '/home/user/.scaffold/templates/test-template-123/files/package.json.template',
      '{"name": "{{PROJECT_NAME}}"}'
    );

    // Create service instance
    fixService = new ProjectFixService(
      fakeTemplateService,
      fakeFileService,
      fakeValidationService,
      fakeVariableService,
      fakeManifestService
    );
  });

  describe('fixProject', () => {
    beforeEach(() => {
      // Reset all fakes to ensure clean state
      fakeTemplateService.reset();
      fakeFileService.reset();
      fakeValidationService.reset();
      fakeManifestService.reset();

      // Re-setup all required data - create fresh copies to avoid cross-test contamination
      fakeTemplateService.addTemplate(mockTemplate);
      fakeManifestService.setManifest('/test-project', JSON.parse(JSON.stringify(mockManifest)));

      // Set up file system state
      fakeFileService.setDirectory('/test-project');
      fakeFileService.setDirectory('/test-project/.scaffold');
      fakeFileService.setFile('/test-project/.scaffold/manifest.json', JSON.stringify(mockManifest));
      fakeFileService.setFile(
        '/home/user/.scaffold/templates/test-template-123/files/package.json.template',
        '{"name": "{{PROJECT_NAME}}"}'
      );

      // Setup default fake behavior
      fakeValidationService.setValidationReport('/test-project', mockValidationReport);
    });

    it('should return validation report if project is already valid', async () => {
      const validReport = { ...mockValidationReport, valid: true, errors: [] };
      fakeValidationService.setValidationReport('/test-project', validReport);

      // Count files/dirs before the call
      const filesBeforeTest = fakeFileService.getFiles().size;
      const dirsBeforeTest = fakeFileService.getDirectories().size;

      const result = await fixService.fixProject('/test-project');

      expect(result).toEqual(validReport);
      // Verify no files were created by checking the fake file system state
      expect(fakeFileService.getFiles().size).toBe(filesBeforeTest);
      expect(fakeFileService.getDirectories().size).toBe(dirsBeforeTest);
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
      // Set up validation service to return validation report and manifest location
      fakeValidationService.setValidationReport('/test-project', mockValidationReport);

      // Set up findNearestManifest to return after validateProject consumes the setReturnValue
      // We need to set this right before the service call since setReturnValue is consumed
      const originalFindNearestManifest = fakeValidationService.findNearestManifest;
      fakeValidationService.findNearestManifest = async (startPath: string) => {
        return {
          manifestPath: '/test-project/.scaffold/manifest.json',
          projectPath: '/test-project',
        };
      };

      const result = await fixService.fixProject('/test-project');

      // Restore original method
      fakeValidationService.findNearestManifest = originalFindNearestManifest;

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.suggestions).toContain(
        'Fixed 2 errors (1 files, 1 folders)'
      );

      // Verify the file system operations were performed
      expect(fakeFileService.getDirectories().has('/test-project/test-project/src')).toBe(true);
      expect(fakeFileService.getFiles().has('/test-project/test-project/package.json')).toBe(true);
      expect(fakeFileService.getFiles().get('/test-project/test-project/package.json')).toBe(
        '{"name": "Test Project"}'
      );
    });

    it('should handle dry run mode', async () => {
      const initialFilesCount = fakeFileService.getFiles().size;
      const initialDirsCount = fakeFileService.getDirectories().size;

      const result = await fixService.fixProject('/test-project', true);

      expect(fakeFileService.isDryRun).toBe(false); // should be restored
      expect(result.suggestions).toContain(
        'This was a dry run - no changes were made'
      );

      // Verify no actual files/dirs were created (since it was a dry run)
      expect(fakeFileService.getFiles().size).toBe(initialFilesCount);
      expect(fakeFileService.getDirectories().size).toBe(initialDirsCount);

      // Verify manifest was not updated
      expect(fakeManifestService.getStoredManifests().get('/test-project')).toEqual(mockManifest);
    });

    it('should restore original dry run mode after completion', async () => {
      // Set initial dry run mode to true
      fakeFileService.setDryRun(true);
      const originalIsDryRun = fakeFileService.isDryRun;

      await fixService.fixProject('/test-project', false);

      // Should restore to original state
      expect(fakeFileService.isDryRun).toBe(originalIsDryRun);
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
      fakeValidationService.setValidationReport('/test-project', reportWithManualFix);

      const result = await fixService.fixProject('/test-project');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(
        result.warnings.some(w => w.message.includes('Manual fix required'))
      ).toBe(true);
    });

    it('should handle fix failures gracefully', async () => {
      // Set up the fake file service to throw an error when createDirectory is called
      fakeFileService.setError('Permission denied');

      const result = await fixService.fixProject('/test-project');

      expect(result.valid).toBe(false);
      expect(
        result.warnings.some(w => w.message.includes('Failed to fix error'))
      ).toBe(true);
    });

    it('should update project manifest with fix history', async () => {
      await fixService.fixProject('/test-project');

      const updatedManifest = fakeManifestService.getStoredManifests().get('/test-project');
      expect(updatedManifest).toBeDefined();
      expect(updatedManifest!.history).toHaveLength(1);
      expect(updatedManifest!.history[0]).toMatchObject({
        action: 'check',
        changes: expect.arrayContaining([
          expect.objectContaining({
            type: 'added',
            reason: expect.stringContaining('Fixed:'),
          }),
        ]),
      });
    });

    it('should not update manifest in dry run mode', async () => {
      const originalManifest = JSON.parse(JSON.stringify(mockManifest));

      await fixService.fixProject('/test-project', true);

      // Manifest should remain unchanged
      expect(fakeManifestService.getStoredManifests().get('/test-project')).toEqual(originalManifest);
    });

    it('should throw error when no manifest is found', async () => {
      // Remove the manifest from the fake service
      fakeManifestService.reset();

      await expect(fixService.fixProject('/test-project')).rejects.toThrow(
        'No project manifest found'
      );
    });

    it('should recreate files with proper content from template', async () => {
      await fixService.fixProject('/test-project');

      // Verify file was created with substituted variables
      const fileContent = fakeFileService.getFiles().get('/test-project/test-project/package.json');
      expect(fileContent).toBe('{"name": "Test Project"}'); // PROJECT_NAME substituted
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

      // Create a validation report specifically for this template
      const validationReportForSourceFile = {
        ...mockValidationReport,
        errors: [
          {
            ...mockValidationReport.errors[1], // Use the file error
            path: 'test-project/package.json',
            fix: {
              action: 'create' as const,
              autoFix: true,
              // Don't include content - let the service read from sourcePath
            },
          },
        ],
      };

      // Reset and setup the template service with the new template
      fakeTemplateService.reset();
      fakeTemplateService.addTemplate(templateWithSourceFile);

      // Set up the template source file with the correct path structure
      const userHome = process.env.HOME || process.env.USERPROFILE || '/home/user';
      const templateSourcePath = `${userHome}/.scaffold/templates/test-template-123/files/package.json.template`;
      fakeFileService.setFile(templateSourcePath, '{"name": "{{PROJECT_NAME}}"}');

      // Set up validation report for this specific test
      fakeValidationService.setValidationReport('/test-project', validationReportForSourceFile);

      await fixService.fixProject('/test-project');

      // Verify the file was created using content from the template source file
      const fileContent = fakeFileService.getFiles().get('/test-project/test-project/package.json');
      expect(fileContent).toBe('{"name": "Test Project"}'); // Content from template with variables substituted
    });
  });
});
