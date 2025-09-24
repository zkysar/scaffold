/**
 * Unit tests for ProjectCreationService
 */

import { ProjectCreationService } from '@/services/project-creation.service';
import type { Template } from '@/models';
import {
  FakeTemplateService,
  FakeFileSystemService,
} from '@tests/fakes';

describe('ProjectCreationService', () => {
  let creationService: ProjectCreationService;
  let fakeTemplateService: FakeTemplateService;
  let fakeFileService: FakeFileSystemService;

  const mockTemplate: Template = {
    id: 'test-template-123',
    name: 'Test Template',
    version: '1.0.0',
    description: 'A test template for unit testing',
    rootFolder: 'test-project',
    author: 'Test Author',
    created: '2023-01-01T00:00:00.000Z',
    updated: '2023-01-01T00:00:00.000Z',
    aliases: ['test'],
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
        content: '{"name": "{{PROJECT_NAME}}"}',
        permissions: '644',
        variables: true,
      },
      {
        path: 'README.md',
        sourcePath: 'README.md.template',
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

  beforeEach(() => {
    // Create fake services
    fakeTemplateService = new FakeTemplateService();
    fakeFileService = new FakeFileSystemService();

    // Reset fakes
    fakeTemplateService.reset();
    fakeFileService.reset();

    // Setup template in fake service
    fakeTemplateService.addTemplate(mockTemplate);

    // Setup file system state
    fakeFileService.setFile(
      '/home/user/.scaffold/templates/test-template-123/files/README.md.template',
      '# {{PROJECT_NAME}}\nWelcome to your new project!'
    );

    // Create service instance
    creationService = new ProjectCreationService(
      fakeTemplateService,
      fakeFileService
    );
  });

  describe('createProject', () => {

    it('should create a project with valid inputs', async () => {
      const projectName = 'MyTestProject';
      const templateIds = ['test-template-123'];
      const targetPath = '/test-project';
      const variables = { AUTHOR: 'John Doe' };

      const result = await creationService.createProject(
        projectName,
        templateIds,
        targetPath,
        variables
      );

      expect(result).toBeDefined();
      expect(result.projectName).toBe(projectName);
      expect(result.variables.PROJECT_NAME).toBe(projectName);
      expect(result.variables.AUTHOR).toBe(variables.AUTHOR);
      expect(result.templates).toHaveLength(1);
      expect(result.templates[0].templateSha).toBe(mockTemplate.id);
      expect(result.templates[0].name).toBe(mockTemplate.name);
      expect(result.templates[0].status).toBe('active');
      expect(result.history).toHaveLength(1);
      expect(result.history[0].action).toBe('create');
    });

    it('should throw error for invalid project name', async () => {
      await expect(
        creationService.createProject(
          '',
          ['test-template-123'],
          '/test-project'
        )
      ).rejects.toThrow('Project name must be a non-empty string');

      await expect(
        creationService.createProject(
          null as any,
          ['test-template-123'],
          '/test-project'
        )
      ).rejects.toThrow('Project name must be a non-empty string');
    });

    it('should throw error for empty template IDs', async () => {
      await expect(
        creationService.createProject('TestProject', [], '/test-project')
      ).rejects.toThrow('At least one template ID must be provided');
    });

    it('should throw error for invalid target path', async () => {
      await expect(
        creationService.createProject('TestProject', ['test-template-123'], '')
      ).rejects.toThrow('Target path must be a non-empty string');
    });

    it('should throw error when template is not found', async () => {
      fakeTemplateService.setError('Template not found');

      await expect(
        creationService.createProject(
          'TestProject',
          ['invalid-template'],
          '/test-project'
        )
      ).rejects.toThrow("Failed to create project 'TestProject'");
    });

    it('should handle multiple templates with different root folders', async () => {
      const secondTemplate = {
        ...mockTemplate,
        id: 'test-template-456',
        name: 'Second Template',
        rootFolder: 'backend',
      };

      fakeTemplateService.addTemplate(secondTemplate);

      const result = await creationService.createProject(
        'TestProject',
        ['test-template-123', 'test-template-456'],
        '/test-project'
      );

      expect(result.templates).toHaveLength(2);
      expect(result.templates[0].rootFolder).toBe('test-project');
      expect(result.templates[1].rootFolder).toBe('backend');
    });

    it('should detect rootFolder conflicts', async () => {
      const conflictingTemplate = {
        ...mockTemplate,
        id: 'test-template-456',
        name: 'Conflicting Template',
        rootFolder: 'test-project', // Same as first template
      };

      fakeTemplateService.addTemplate(conflictingTemplate);

      await expect(
        creationService.createProject(
          'TestProject',
          ['test-template-123', 'test-template-456'],
          '/test-project'
        )
      ).rejects.toThrow(
        'Template conflict: Multiple templates use the same rootFolder'
      );
    });
  });

  describe('initializeProjectManifest', () => {
    it('should create a valid manifest with required fields', () => {
      const projectName = 'TestProject';
      const templateSha = 'test-template-123';

      const manifest = creationService.initializeProjectManifest(
        projectName,
        templateSha
      );

      expect(manifest).toBeDefined();
      expect(manifest.id).toBeDefined();
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.projectName).toBe(projectName);
      expect(manifest.created).toBeDefined();
      expect(manifest.updated).toBeDefined();
      expect(manifest.templates).toEqual([]);
      expect(manifest.variables).toEqual({});
      expect(manifest.history).toEqual([]);
    });

    it('should throw error for invalid project name', () => {
      expect(() =>
        creationService.initializeProjectManifest('', 'template-123')
      ).toThrow('Project name must be a non-empty string');

      expect(() =>
        creationService.initializeProjectManifest(null as any, 'template-123')
      ).toThrow('Project name must be a non-empty string');
    });

    it('should throw error for invalid template SHA', () => {
      expect(() =>
        creationService.initializeProjectManifest('TestProject', '')
      ).toThrow('Template SHA must be a non-empty string');

      expect(() =>
        creationService.initializeProjectManifest('TestProject', null as any)
      ).toThrow('Template SHA must be a non-empty string');
    });
  });

  describe('ensureProjectDirectory', () => {
    it('should create project and .scaffold directories', async () => {
      await creationService.ensureProjectDirectory('/test-project');

      expect(await fakeFileService.exists('/test-project')).toBe(true);
      expect(await fakeFileService.exists('/test-project/.scaffold')).toBe(true);
      expect(await fakeFileService.isDirectory('/test-project')).toBe(true);
      expect(await fakeFileService.isDirectory('/test-project/.scaffold')).toBe(true);
    });

    it('should throw error for invalid project path', async () => {
      await expect(creationService.ensureProjectDirectory('')).rejects.toThrow(
        'Project path must be a non-empty string'
      );

      await expect(
        creationService.ensureProjectDirectory(null as any)
      ).rejects.toThrow('Project path must be a non-empty string');
    });

    it('should handle file service errors', async () => {
      fakeFileService.setError('Permission denied');

      await expect(
        creationService.ensureProjectDirectory('/test-project')
      ).rejects.toThrow('Failed to ensure project directory structure');
    });
  });
});
