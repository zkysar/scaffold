/**
 * Unit tests for ProjectExtensionService
 */

import mockFs from 'mock-fs';
import { ProjectExtensionService } from '../../../src/services/project-extension.service';
import type { ITemplateService } from '../../../src/services/template-service';
import type { IFileSystemService } from '../../../src/services/file-system.service';
import type { Template, ProjectManifest } from '../../../src/models';
import {
  createMockImplementation,
  assertDefined,
} from '../../helpers/test-utils';

describe('ProjectExtensionService', () => {
  let extensionService: ProjectExtensionService;
  let mockTemplateService: jest.Mocked<ITemplateService>;
  let mockFileService: jest.Mocked<IFileSystemService>;
  let mockGetProjectManifest: jest.Mock;
  let mockUpdateProjectManifest: jest.Mock;
  let mockFindNearestManifest: jest.Mock;

  const mockTemplate: Template = {
    id: 'test-template-123',
    name: 'Test Template',
    version: '1.0.0',
    description: 'A test template for unit testing',
    rootFolder: 'backend',
    author: 'Test Author',
    created: '2023-01-01T00:00:00.000Z',
    updated: '2023-01-01T00:00:00.000Z',
    aliases: ['backend'],
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
        path: 'server.js',
        content: 'console.log("{{PROJECT_NAME}} server");',
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
        templateSha: 'existing-template-456',
        name: 'Existing Template',
        version: '1.0.0',
        rootFolder: 'frontend',
        appliedBy: 'test-user',
        appliedAt: '2023-01-01T00:00:00.000Z',
        status: 'active',
        conflicts: [],
      },
    ],
    variables: {
      PROJECT_NAME: 'Test Project',
      AUTHOR: 'John Doe',
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
    mockUpdateProjectManifest = jest.fn();
    mockFindNearestManifest = jest.fn();

    // Create service instance
    extensionService = new ProjectExtensionService(
      mockTemplateService,
      mockFileService,
      mockGetProjectManifest,
      mockUpdateProjectManifest,
      mockFindNearestManifest
    );

    // Setup mock-fs
    mockFs({
      '/test-project': {
        '.scaffold': {
          'manifest.json': JSON.stringify(mockManifest),
        },
        frontend: {
          'index.html': '<html></html>',
        },
      },
      '/home/user/.scaffold/templates/test-template-123/files/server.js.template':
        'console.log("{{PROJECT_NAME}} server");',
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  describe('extendProject', () => {
    beforeEach(() => {
      // Setup default mock returns
      mockGetProjectManifest.mockResolvedValue(mockManifest);
      mockFindNearestManifest.mockResolvedValue({
        manifestPath: '/test-project/.scaffold/manifest.json',
        projectPath: '/test-project',
      });
      mockTemplateService.getTemplate.mockResolvedValue(mockTemplate);
      mockFileService.resolvePath.mockImplementation((...paths) =>
        paths.join('/')
      );
      mockFileService.createDirectory.mockResolvedValue();
      mockFileService.createFile.mockResolvedValue();
      mockFileService.readFile.mockResolvedValue(
        'console.log("{{PROJECT_NAME}} server");'
      );
      mockFileService.exists.mockResolvedValue(true);
      mockUpdateProjectManifest.mockResolvedValue(undefined);
    });

    it('should extend project with new template', async () => {
      const result = await extensionService.extendProject(
        '/test-project',
        ['test-template-123'],
        { PORT: '3000' }
      );

      expect(result).toBeDefined();
      expect(result.templates).toHaveLength(2); // Original + new template
      expect(result.templates[1].templateSha).toBe(mockTemplate.id);
      expect(result.templates[1].name).toBe(mockTemplate.name);
      expect(result.templates[1].rootFolder).toBe('backend');
      expect(result.templates[1].status).toBe('active');
      expect(result.variables.PORT).toBe('3000');
      expect(result.history).toHaveLength(1);
      expect(result.history[0].action).toBe('extend');
    });

    it('should throw error for invalid project path', async () => {
      await expect(
        extensionService.extendProject('', ['test-template-123'])
      ).rejects.toThrow('Project path must be a non-empty string');

      await expect(
        extensionService.extendProject(null as any, ['test-template-123'])
      ).rejects.toThrow('Project path must be a non-empty string');
    });

    it('should throw error for empty template IDs', async () => {
      await expect(
        extensionService.extendProject('/test-project', [])
      ).rejects.toThrow('At least one template ID must be provided');
    });

    it('should throw error when no manifest is found', async () => {
      mockGetProjectManifest.mockResolvedValue(null);

      await expect(
        extensionService.extendProject('/test-project', ['test-template-123'])
      ).rejects.toThrow('No project manifest found');
    });

    it('should merge variables with existing ones', async () => {
      const result = await extensionService.extendProject(
        '/test-project',
        ['test-template-123'],
        { PORT: '3000', PROJECT_NAME: 'Updated Project' } // Override existing variable
      );

      expect(result.variables.PROJECT_NAME).toBe('Updated Project');
      expect(result.variables.AUTHOR).toBe('John Doe'); // Preserved from original
      expect(result.variables.PORT).toBe('3000'); // New variable
    });

    it('should detect rootFolder conflicts with existing templates', async () => {
      const conflictingTemplate = {
        ...mockTemplate,
        rootFolder: 'frontend', // Same as existing template
      };
      mockTemplateService.getTemplate.mockResolvedValue(conflictingTemplate);

      await expect(
        extensionService.extendProject('/test-project', ['test-template-123'])
      ).rejects.toThrow(
        "Template conflict: Template 'Test Template' uses rootFolder 'frontend' which is already used by an existing template"
      );
    });

    it('should detect rootFolder conflicts between new templates', async () => {
      const secondTemplate = {
        ...mockTemplate,
        id: 'test-template-456',
        name: 'Second Template',
        rootFolder: 'backend', // Same as first new template
      };

      mockTemplateService.getTemplate
        .mockResolvedValueOnce(mockTemplate)
        .mockResolvedValueOnce(secondTemplate);

      await expect(
        extensionService.extendProject('/test-project', [
          'test-template-123',
          'test-template-456',
        ])
      ).rejects.toThrow(
        "Template conflict: Multiple new templates use the same rootFolder 'backend'"
      );
    });

    it('should handle template variable validation', async () => {
      const templateWithRequiredVar = {
        ...mockTemplate,
        variables: [
          {
            name: 'REQUIRED_VAR',
            description: 'A required variable',
            required: true,
            default: '',
          },
        ],
      };
      mockTemplateService.getTemplate.mockResolvedValue(
        templateWithRequiredVar
      );

      await expect(
        extensionService.extendProject('/test-project', ['test-template-123'])
      ).rejects.toThrow('Template validation failed');
    });

    it('should apply template files and folders correctly', async () => {
      await extensionService.extendProject('/test-project', [
        'test-template-123',
      ]);

      // Verify directory creation
      expect(mockFileService.createDirectory).toHaveBeenCalledWith(
        '/test-project/backend'
      );
      expect(mockFileService.createDirectory).toHaveBeenCalledWith(
        '/test-project/backend/src'
      );

      // Verify file creation with variable substitution
      expect(mockFileService.createFile).toHaveBeenCalledWith(
        '/test-project/backend/server.js',
        'console.log("Test Project server");', // Variable substituted
        { mode: parseInt('644', 8), overwrite: true }
      );
    });

    it('should handle template aliases correctly', async () => {
      const result = await extensionService.extendProject(
        '/test-project',
        ['backend'] // Using alias instead of ID
      );

      expect(result.templates[1].templateAlias).toBe('backend');
      expect(result.templates[1].templateSha).toBe(mockTemplate.id);
    });

    it('should update manifest correctly', async () => {
      await extensionService.extendProject('/test-project', [
        'test-template-123',
      ]);

      expect(mockUpdateProjectManifest).toHaveBeenCalledWith(
        '/test-project',
        expect.objectContaining({
          templates: expect.arrayContaining([
            expect.objectContaining({
              templateSha: mockTemplate.id,
              name: mockTemplate.name,
              status: 'active',
            }),
          ]),
          updated: expect.any(String),
        })
      );
    });

    it('should handle template source files', async () => {
      const templateWithSourceFile = {
        ...mockTemplate,
        files: [
          {
            path: 'server.js',
            sourcePath: 'server.js.template',
            variables: true,
          },
        ],
      };
      mockTemplateService.getTemplate.mockResolvedValue(templateWithSourceFile);

      await extensionService.extendProject('/test-project', [
        'test-template-123',
      ]);

      expect(mockFileService.readFile).toHaveBeenCalledWith(
        '/home/user/.scaffold/templates/test-template-123/files/server.js.template'
      );
    });

    it('should handle multiple templates without conflicts', async () => {
      const secondTemplate = {
        ...mockTemplate,
        id: 'test-template-456',
        name: 'Database Template',
        rootFolder: 'database',
      };

      mockTemplateService.getTemplate
        .mockResolvedValueOnce(mockTemplate)
        .mockResolvedValueOnce(secondTemplate);

      const result = await extensionService.extendProject('/test-project', [
        'test-template-123',
        'test-template-456',
      ]);

      expect(result.templates).toHaveLength(3); // Original + 2 new templates
      expect(result.templates[1].rootFolder).toBe('backend');
      expect(result.templates[2].rootFolder).toBe('database');
    });
  });
});
