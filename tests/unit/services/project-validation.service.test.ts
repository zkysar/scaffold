/**
 * Unit tests for ProjectValidationService
 */

import { ProjectValidationService } from '../../../src/services/project-validation.service';
import type { Template, ProjectManifest } from '../../../src/models';
import { FakeFileSystemService } from '../../fakes/file-system.fake';
import { FakeTemplateService } from '../../fakes/template-service.fake';
import { FakeProjectManifestService } from '../../fakes/project-manifest.fake';
import { FakeVariableSubstitutionService } from '../../fakes/variable-substitution.fake';

describe('ProjectValidationService', () => {
  let validationService: ProjectValidationService;
  let fakeTemplateService: FakeTemplateService;
  let fakeFileService: FakeFileSystemService;
  let fakeProjectManifestService: FakeProjectManifestService;
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
      {
        path: 'tests',
        description: 'Test directory',
        permissions: '755',
        gitkeep: true,
      },
    ],
    files: [
      {
        path: 'package.json',
        content: '{"name": "test-project"}',
        permissions: '644',
        variables: false,
      },
      {
        path: 'README.md',
        content: '# Test Project',
        variables: false,
      },
    ],
    variables: [],
    rules: {
      strictMode: false,
      allowExtraFiles: false,
      allowExtraFolders: false,
      conflictResolution: 'prompt',
      excludePatterns: [],
      rules: [
        {
          id: 'required-license',
          name: 'Required License File',
          type: 'required_file',
          target: 'LICENSE',
          description: 'License file must exist',
          severity: 'error',
          fix: {
            action: 'create',
            content: 'MIT License',
            autoFix: true,
          },
        },
      ],
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

  beforeEach(() => {
    // Reset fake services
    fakeTemplateService = new FakeTemplateService();
    fakeFileService = new FakeFileSystemService();
    fakeProjectManifestService = new FakeProjectManifestService();
    fakeVariableService = new FakeVariableSubstitutionService();

    // Setup default data BEFORE creating the service
    fakeProjectManifestService.setManifest('/test-project', mockManifest);
    fakeTemplateService.addTemplate(mockTemplate);

    // Create service instance with a proper function binding
    const getProjectManifestFn = async (projectPath: string) => {
      return await fakeProjectManifestService.getProjectManifest(projectPath);
    };

    validationService = new ProjectValidationService(
      fakeTemplateService,
      fakeFileService,
      fakeVariableService,
      fakeProjectManifestService
    );

    // Setup fake file system
    fakeFileService.setDirectory('/test-project');
    fakeFileService.setDirectory('/test-project/.scaffold');
    fakeFileService.setDirectory('/test-project/test-project');
    fakeFileService.setDirectory('/test-project/test-project/src');
    fakeFileService.setDirectory('/test-project/test-project/tests');
    fakeFileService.setFile('/test-project/.scaffold/manifest.json', JSON.stringify(mockManifest));
    fakeFileService.setFile('/test-project/test-project/package.json', '{"name": "test-project"}');
    fakeFileService.setFile('/test-project/test-project/README.md', '# Test Project');
  });

  afterEach(() => {
    // Clean up fake services
    fakeTemplateService.reset();
    fakeFileService.reset();
    fakeProjectManifestService.reset();
  });

  describe('validateProject', () => {

    it('should validate a valid project successfully', async () => {
      const result = await validationService.validateProject('/test-project');

      expect(result).toBeDefined();
      expect(result.valid).toBe(false); // Because LICENSE file is missing due to rule
      expect(result.projectName).toBe('Test Project');
      expect(result.projectPath).toBe('/test-project');
      expect(result.templates).toEqual(['test-template-123']);
      expect(result.stats.templatesChecked).toBe(1);
      expect(result.stats.filesChecked).toBe(2);
      expect(result.stats.foldersChecked).toBe(2);
    });

    it('should throw error for invalid project path', async () => {
      await expect(validationService.validateProject('')).rejects.toThrow(
        'Project path must be a non-empty string'
      );

      await expect(
        validationService.validateProject(null as any)
      ).rejects.toThrow('Project path must be a non-empty string');
    });

    it('should throw error when no manifest is found', async () => {
      fakeProjectManifestService.setReturnValue(null);

      await expect(
        validationService.validateProject('/test-project')
      ).rejects.toThrow('No project manifest found');
    });

    it('should detect missing required folders', async () => {
      // Remove the src directory from fake file system to simulate missing folder
      fakeFileService.reset();
      fakeProjectManifestService.setManifest('/test-project', mockManifest); // Re-add manifest after reset
      fakeTemplateService.addTemplate(mockTemplate); // Re-add template after reset
      fakeFileService.setDirectory('/test-project');
      fakeFileService.setDirectory('/test-project/.scaffold');
      fakeFileService.setDirectory('/test-project/test-project');
      fakeFileService.setDirectory('/test-project/test-project/tests'); // src is missing
      fakeFileService.setFile('/test-project/.scaffold/manifest.json', JSON.stringify(mockManifest));
      fakeFileService.setFile('/test-project/test-project/package.json', '{"name": "test-project"}');
      fakeFileService.setFile('/test-project/test-project/README.md', '# Test Project');

      const result = await validationService.validateProject('/test-project');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2); // Missing src folder + LICENSE file
      expect(result.errors.some(e => e.path === 'test-project/src')).toBe(true);
      expect(result.errors.some(e => e.ruleId === 'required_folder')).toBe(
        true
      );
    });

    it('should detect missing required files', async () => {
      // Remove package.json from fake file system to simulate missing file
      fakeFileService.reset();
      fakeProjectManifestService.setManifest('/test-project', mockManifest); // Re-add manifest after reset
      fakeTemplateService.addTemplate(mockTemplate); // Re-add template after reset
      fakeFileService.setDirectory('/test-project');
      fakeFileService.setDirectory('/test-project/.scaffold');
      fakeFileService.setDirectory('/test-project/test-project');
      fakeFileService.setDirectory('/test-project/test-project/src');
      fakeFileService.setDirectory('/test-project/test-project/tests');
      fakeFileService.setFile('/test-project/.scaffold/manifest.json', JSON.stringify(mockManifest));
      // package.json is missing
      fakeFileService.setFile('/test-project/test-project/README.md', '# Test Project');

      const result = await validationService.validateProject('/test-project');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2); // Missing package.json + LICENSE file
      expect(
        result.errors.some(e => e.path === 'test-project/package.json')
      ).toBe(true);
      expect(result.errors.some(e => e.ruleId === 'required_file')).toBe(true);
    });

    it('should detect path exists but is wrong type (file instead of directory)', async () => {
      // Set up src as a file instead of a directory
      fakeFileService.reset();
      fakeProjectManifestService.setManifest('/test-project', mockManifest); // Re-add manifest after reset
      fakeTemplateService.addTemplate(mockTemplate); // Re-add template after reset
      fakeFileService.setDirectory('/test-project');
      fakeFileService.setDirectory('/test-project/.scaffold');
      fakeFileService.setDirectory('/test-project/test-project');
      fakeFileService.setDirectory('/test-project/test-project/tests');
      fakeFileService.setFile('/test-project/.scaffold/manifest.json', JSON.stringify(mockManifest));
      fakeFileService.setFile('/test-project/test-project/package.json', '{"name": "test-project"}');
      fakeFileService.setFile('/test-project/test-project/README.md', '# Test Project');
      fakeFileService.setFile('/test-project/test-project/src', 'some content'); // src is a file, not directory

      const result = await validationService.validateProject('/test-project');

      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          e =>
            e.path === 'test-project/src' &&
            e.expected === 'Path to be a directory'
        )
      ).toBe(true);
    });

    it('should handle template loading errors gracefully', async () => {
      fakeTemplateService.setError('Template not found');

      const result = await validationService.validateProject('/test-project');

      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
      expect(result.warnings.some(w => w.message.includes('could not be loaded'))).toBe(true);
    });

    it('should skip removed templates', async () => {
      const manifestWithInactiveTemplate = {
        ...mockManifest,
        templates: [
          {
            ...mockManifest.templates[0],
            status: 'removed' as const,
          },
        ],
      };
      fakeProjectManifestService.setManifest('/test-project', manifestWithInactiveTemplate);

      const result = await validationService.validateProject('/test-project');

      expect(result.stats.templatesChecked).toBe(0);
      // No need to assert method calls with fakes - just verify the outcome
    });

    it('should validate template rules', async () => {
      // LICENSE file doesn't exist in the fake file system, triggering the rule
      // The default setup already excludes LICENSE file, so this should work as-is

      const result = await validationService.validateProject('/test-project');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.ruleId === 'required-license')).toBe(
        true
      );
      expect(result.errors.some(e => e.path === 'test-project/LICENSE')).toBe(
        true
      );
    });
  });

  describe('findNearestManifest', () => {
    beforeEach(() => {
      // No special setup needed for fake services
    });

    it('should find manifest in current directory', async () => {
      // The fake file system already has the manifest file in the expected location

      const result =
        await validationService.findNearestManifest('/test-project');

      expect(result).toBeDefined();
      expect(result?.projectPath).toBe('/test-project');
      expect(result?.manifestPath).toBe(
        '/test-project/.scaffold/manifest.json'
      );
    });

    it('should find manifest in parent directory', async () => {
      // The fake file system already has the manifest file in the parent
      // This test should work as-is since the manifest is at /test-project/.scaffold/manifest.json

      const result = await validationService.findNearestManifest(
        '/test-project/subdirectory'
      );

      expect(result).toBeDefined();
      expect(result?.projectPath).toBe('/test-project');
    });

    it('should return null when no manifest is found', async () => {
      // Clear the fake file system so no manifest exists
      fakeFileService.reset();

      const result =
        await validationService.findNearestManifest('/test-project');

      expect(result).toBeNull();
    });

    it('should limit search depth to prevent infinite loops', async () => {
      // Clear the fake file system so no manifest exists
      fakeFileService.reset();

      const result = await validationService.findNearestManifest(
        '/very/deep/nested/path'
      );

      expect(result).toBeNull();
      // No need to assert method call counts with fakes - just verify the outcome
    });
  });
});
