/**
 * Unit tests for ProjectExtensionService
 */

import { ProjectExtensionService } from '@/services/project-extension.service';
import type { Template, ProjectManifest } from '@/models';
import { FakeTemplateService } from '@tests/fakes/template-service.fake';
import { FakeFileSystemService } from '@tests/fakes/file-system.fake';
import { FakeProjectManifestService } from '@tests/fakes/project-manifest.fake';


import { logger } from '@/lib/logger';
describe('ProjectExtensionService', () => {
  let extensionService: ProjectExtensionService;
  let fakeTemplateService: FakeTemplateService;
  let fakeFileService: FakeFileSystemService;
  let fakeManifestService: FakeProjectManifestService;

  const mockTemplate: Template = {
    id: 'test-template-123',
    name: 'Test Template',
    version: '1.0.0',
    description: 'A test template for unit testing',
    rootFolder: 'api',
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
        content: 'logger.info("{{PROJECT_NAME}} server");',
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
    // Create fake services
    fakeTemplateService = new FakeTemplateService();
    fakeFileService = new FakeFileSystemService();
    fakeManifestService = new FakeProjectManifestService();

    // Reset all fakes
    fakeTemplateService.reset();
    fakeFileService.reset();
    fakeManifestService.reset();

    // Setup fake data
    fakeTemplateService.addTemplate(mockTemplate);
    fakeManifestService.setManifest('/test-project', mockManifest);

    // Setup fake file system
    fakeFileService.setFile(
      '/test-project/.scaffold/manifest.json',
      JSON.stringify(mockManifest)
    );
    fakeFileService.setFile('/test-project/frontend/index.html', '<html></html>');
    fakeFileService.setFile(
      '/home/user/.scaffold/templates/test-template-123/files/server.js.template',
      'logger.info("{{PROJECT_NAME}} server");'
    );
    fakeFileService.setDirectory('/test-project');
    fakeFileService.setDirectory('/test-project/.scaffold');
    fakeFileService.setDirectory('/test-project/frontend');
    fakeFileService.setDirectory('/home/user/.scaffold/templates/test-template-123/files');

    // Create service instance
    extensionService = new ProjectExtensionService(
      fakeTemplateService,
      fakeFileService,
      (projectPath: string) => fakeManifestService.getProjectManifest(projectPath),
      (projectPath: string, manifest: ProjectManifest) =>
        fakeManifestService.updateProjectManifest(projectPath, manifest),
      (startPath: string) => fakeManifestService.findNearestManifest(startPath)
    );
  });

  afterEach(() => {
    // Reset all fakes after each test
    fakeTemplateService.reset();
    fakeFileService.reset();
    fakeManifestService.reset();
  });

  describe('extendProject', () => {
    beforeEach(() => {
      // Reset and re-setup the manifest service completely
      fakeManifestService.reset();
      // Create a fresh copy of the manifest to avoid mutation issues
      const freshManifest = JSON.parse(JSON.stringify(mockManifest));
      fakeManifestService.setManifest('/test-project', freshManifest);
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
      expect(result.templates[1].rootFolder).toBe('api');
      expect(result.templates[1].status).toBe('active');
      expect(result.variables.PORT).toBe('3000');
      expect(result.history).toHaveLength(1);
      expect(result.history[0].action).toBe('extend');

      // Verify the manifest was updated
      const updatedManifest = fakeManifestService.getStoredManifests().get('/test-project');
      expect(updatedManifest).toBeDefined();
      expect(updatedManifest!.templates).toHaveLength(2);
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
      fakeManifestService.setReturnValue(null);

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
      fakeTemplateService.reset();
      fakeTemplateService.addTemplate(conflictingTemplate);

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
        rootFolder: 'api', // Same as first new template
      };

      fakeTemplateService.addTemplate(secondTemplate);

      await expect(
        extensionService.extendProject('/test-project', [
          'test-template-123',
          'test-template-456',
        ])
      ).rejects.toThrow(
        "Template conflict: Multiple new templates use the same rootFolder 'api'"
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
      fakeTemplateService.reset();
      fakeTemplateService.addTemplate(templateWithRequiredVar);

      await expect(
        extensionService.extendProject('/test-project', ['test-template-123'])
      ).rejects.toThrow('Template validation failed');
    });

    it('should apply template files and folders correctly', async () => {
      await extensionService.extendProject('/test-project', [
        'test-template-123',
      ]);

      // Verify directory creation in fake file system
      expect(fakeFileService.getDirectories().has('/test-project/api')).toBe(true);
      expect(fakeFileService.getDirectories().has('/test-project/api/src')).toBe(true);

      // Verify file creation with variable substitution
      const files = fakeFileService.getFiles();
      expect(files.has('/test-project/api/server.js')).toBe(true);
      expect(files.get('/test-project/api/server.js')).toContain('Test Project server');
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

      // Verify manifest was updated in fake service
      const updatedManifest = fakeManifestService.getStoredManifests().get('/test-project');
      expect(updatedManifest).toBeDefined();
      expect(updatedManifest!.templates).toHaveLength(2);
      expect(updatedManifest!.templates[1].templateSha).toBe(mockTemplate.id);
      expect(updatedManifest!.templates[1].name).toBe(mockTemplate.name);
      expect(updatedManifest!.templates[1].status).toBe('active');
      expect(updatedManifest!.updated).toBeDefined();
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
      fakeTemplateService.reset();
      fakeTemplateService.addTemplate(templateWithSourceFile);

      await extensionService.extendProject('/test-project', [
        'test-template-123',
      ]);

      // Verify the template file was read from the expected location
      const files = fakeFileService.getFiles();
      expect(files.has('/test-project/api/server.js')).toBe(true);
    });

    it('should handle multiple templates without conflicts', async () => {
      const secondTemplate = {
        ...mockTemplate,
        id: 'test-template-456',
        name: 'Database Template',
        rootFolder: 'database',
      };

      fakeTemplateService.addTemplate(secondTemplate);

      const result = await extensionService.extendProject('/test-project', [
        'test-template-123',
        'test-template-456',
      ]);

      expect(result.templates).toHaveLength(3); // Original + 2 new templates
      expect(result.templates[1].rootFolder).toBe('api');
      expect(result.templates[2].rootFolder).toBe('database');
    });
  });
});
