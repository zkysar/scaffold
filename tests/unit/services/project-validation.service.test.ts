/**
 * Unit tests for ProjectValidationService
 */

import mockFs from 'mock-fs';
import { ProjectValidationService } from '../../../src/services/project-validation.service';
import type { ITemplateService } from '../../../src/services/template-service';
import type { IFileSystemService } from '../../../src/services/file-system.service';
import type { Template, ProjectManifest } from '../../../src/models';
import {
  createMockImplementation,
  assertDefined,
} from '../../helpers/test-utils';

describe('ProjectValidationService', () => {
  let validationService: ProjectValidationService;
  let mockTemplateService: jest.Mocked<ITemplateService>;
  let mockFileService: jest.Mocked<IFileSystemService>;
  let mockGetProjectManifest: jest.Mock;

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

    mockGetProjectManifest = jest.fn();

    // Create service instance
    validationService = new ProjectValidationService(
      mockTemplateService,
      mockFileService,
      mockGetProjectManifest
    );

    // Setup mock-fs
    mockFs({
      '/test-project': {
        '.scaffold': {
          'manifest.json': JSON.stringify(mockManifest),
        },
        'test-project': {
          src: {},
          tests: {},
          'package.json': '{"name": "test-project"}',
          'README.md': '# Test Project',
        },
      },
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  describe('validateProject', () => {
    beforeEach(() => {
      // Setup default mock returns
      mockGetProjectManifest.mockResolvedValue(mockManifest);
      mockTemplateService.getTemplate.mockResolvedValue(mockTemplate);
      mockFileService.resolvePath.mockImplementation((...paths) =>
        paths.join('/')
      );
      mockFileService.exists.mockResolvedValue(true);
      mockFileService.isDirectory.mockResolvedValue(true);
      mockFileService.isFile.mockResolvedValue(true);
    });

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
      mockGetProjectManifest.mockResolvedValue(null);

      await expect(
        validationService.validateProject('/test-project')
      ).rejects.toThrow('No project manifest found');
    });

    it('should detect missing required folders', async () => {
      mockFileService.exists.mockImplementation((path: string) => {
        return Promise.resolve(!path.includes('src')); // src folder is missing
      });

      const result = await validationService.validateProject('/test-project');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2); // Missing src folder + LICENSE file
      expect(result.errors.some(e => e.path === 'test-project/src')).toBe(true);
      expect(result.errors.some(e => e.ruleId === 'required_folder')).toBe(
        true
      );
    });

    it('should detect missing required files', async () => {
      mockFileService.exists.mockImplementation((path: string) => {
        return Promise.resolve(!path.includes('package.json')); // package.json is missing
      });

      const result = await validationService.validateProject('/test-project');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2); // Missing package.json + LICENSE file
      expect(
        result.errors.some(e => e.path === 'test-project/package.json')
      ).toBe(true);
      expect(result.errors.some(e => e.ruleId === 'required_file')).toBe(true);
    });

    it('should detect path exists but is wrong type (file instead of directory)', async () => {
      mockFileService.exists.mockResolvedValue(true);
      mockFileService.isDirectory.mockImplementation((path: string) => {
        return Promise.resolve(!path.includes('src')); // src exists but is not a directory
      });

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
      mockTemplateService.getTemplate.mockRejectedValue(
        new Error('Template not found')
      );

      const result = await validationService.validateProject('/test-project');

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('could not be loaded');
    });

    it('should skip inactive templates', async () => {
      const manifestWithInactiveTemplate = {
        ...mockManifest,
        templates: [
          {
            ...mockManifest.templates[0],
            status: 'inactive' as const,
          },
        ],
      };
      mockGetProjectManifest.mockResolvedValue(manifestWithInactiveTemplate);

      const result = await validationService.validateProject('/test-project');

      expect(result.stats.templatesChecked).toBe(0);
      expect(mockTemplateService.getTemplate).not.toHaveBeenCalled();
    });

    it('should validate template rules', async () => {
      mockFileService.exists.mockImplementation((path: string) => {
        // LICENSE file doesn't exist, triggering the rule
        return Promise.resolve(!path.includes('LICENSE'));
      });

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
      mockFileService.resolvePath.mockImplementation((...paths) =>
        paths.join('/')
      );
    });

    it('should find manifest in current directory', async () => {
      mockFileService.exists.mockImplementation((path: string) => {
        return Promise.resolve(path.includes('manifest.json'));
      });

      const result =
        await validationService.findNearestManifest('/test-project');

      expect(result).toBeDefined();
      expect(result?.projectPath).toBe('/test-project');
      expect(result?.manifestPath).toBe(
        '/test-project/.scaffold/manifest.json'
      );
    });

    it('should find manifest in parent directory', async () => {
      mockFileService.exists.mockImplementation((path: string) => {
        // Only parent directory has manifest
        return Promise.resolve(
          path === '/test-project/.scaffold/manifest.json'
        );
      });

      const result = await validationService.findNearestManifest(
        '/test-project/subdirectory'
      );

      expect(result).toBeDefined();
      expect(result?.projectPath).toBe('/test-project');
    });

    it('should return null when no manifest is found', async () => {
      mockFileService.exists.mockResolvedValue(false);

      const result =
        await validationService.findNearestManifest('/test-project');

      expect(result).toBeNull();
    });

    it('should limit search depth to prevent infinite loops', async () => {
      mockFileService.exists.mockResolvedValue(false);

      const result = await validationService.findNearestManifest(
        '/very/deep/nested/path'
      );

      expect(result).toBeNull();
      expect(mockFileService.exists).toHaveBeenCalledTimes(20); // maxLevels
    });
  });
});
