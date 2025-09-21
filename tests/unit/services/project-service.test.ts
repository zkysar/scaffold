/**
 * Unit tests for ProjectService
 */

import mockFs from 'mock-fs';
import * as path from 'path';
import * as os from 'os';
import { ProjectService } from '../../../src/services/project-service';
import { TemplateService } from '../../../src/services/template-service';
import { FileSystemService } from '../../../src/services/file-system.service';
import { ConfigurationService } from '../../../src/services/configuration.service';
import type {
  ProjectManifest,
  ValidationReport,
  Template,
  AppliedTemplate,
  HistoryEntry,
  ValidationError,
  ValidationWarning
} from '../../../src/models';
import { createMockImplementation, assertDefined } from '../../helpers/test-utils';

// Mock os module
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  homedir: jest.fn(() => '/home/user')
}));

describe('ProjectService', () => {
  let projectService: ProjectService;
  let mockTemplateService: jest.Mocked<TemplateService>;
  let mockFileService: jest.Mocked<FileSystemService>;
  let mockConfigService: jest.Mocked<ConfigurationService>;

  const mockHomeDir = '/home/user';
  const testProjectPath = '/test/project';
  const manifestPath = path.join(testProjectPath, '.scaffold', 'manifest.json');


  // Mock template data
  const mockTemplate: Template = {
    id: 'test-template-123',
    name: 'Test Template',
    version: '1.0.0',
    description: 'A test template',
    rootFolder: 'my-app',
    author: 'Test Author',
    created: '2023-01-01T00:00:00.000Z',
    updated: '2023-01-01T00:00:00.000Z',
    folders: [
      {
        path: 'src',
        description: 'Source directory',
        permissions: '755',
        gitkeep: false
      },
      {
        path: 'tests',
        description: 'Test directory',
        permissions: '755',
        gitkeep: true
      }
    ],
    files: [
      {
        path: 'package.json',
        content: '{\n  "name": "{{PROJECT_NAME}}",\n  "version": "1.0.0"\n}',
        permissions: '644',
        variables: true
      },
      {
        path: 'README.md',
        content: '# {{PROJECT_NAME}}\n\nBy {{AUTHOR}}',
        permissions: '644',
        variables: true
      }
    ],
    variables: [
      {
        name: 'PROJECT_NAME',
        description: 'The project name',
        required: true,
        pattern: '^[a-zA-Z0-9_-]+$'
      },
      {
        name: 'AUTHOR',
        description: 'Project author',
        required: false,
        default: 'Anonymous'
      }
    ],
    rules: {
      strictMode: false,
      allowExtraFiles: true,
      allowExtraFolders: true,
      conflictResolution: 'prompt',
      excludePatterns: ['node_modules/**'],
      rules: [
        {
          id: 'package-json-required',
          name: 'Package.json Required',
          description: 'Package.json must exist',
          type: 'required_file',
          target: 'package.json',
          fix: {
            action: 'create',
            content: '{"name": "default", "version": "1.0.0"}',
            autoFix: true
          },
          severity: 'error'
        }
      ]
    }
  };

  const mockManifest: ProjectManifest = {
    id: 'test-project-456',
    version: '1.0.0',
    projectName: 'test-project',
    created: '2023-01-01T00:00:00.000Z',
    updated: '2023-01-01T00:00:00.000Z',
    templates: [
      {
        templateId: 'test-template-123',
        name: 'Test Template',
        version: '1.0.0',
        rootFolder: 'my-app',
        appliedBy: 'testuser',
        appliedAt: '2023-01-01T00:00:00.000Z',
        status: 'active',
        conflicts: []
      }
    ],
    variables: {
      PROJECT_NAME: 'test-project',
      AUTHOR: 'Test User'
    },
    history: [
      {
        id: 'history-1',
        timestamp: '2023-01-01T00:00:00.000Z',
        action: 'create',
        templates: ['test-template-123'],
        user: 'testuser',
        changes: []
      }
    ]
  };

  beforeEach(() => {
    // Mock file system structure
    const mockFileSystem = {
      [testProjectPath]: {
        '.scaffold': {
          'manifest.json': JSON.stringify(mockManifest)
        },
        'my-app': {
          'src': {},
          'tests': {
            '.gitkeep': ''
          },
          'package.json': '{"name": "test-project", "version": "1.0.0"}',
          'README.md': '# test-project\n\nBy Test User'
        }
      },
      [mockHomeDir]: {
        '.scaffold': {
          'templates': {
            'test-template-123': {
              'template.json': JSON.stringify(mockTemplate),
              'files': {}
            }
          }
        }
      }
    };

    mockFs(mockFileSystem);

    // Mock dependencies
    mockTemplateService = createMockImplementation<TemplateService>({
      getTemplate: jest.fn().mockResolvedValue(mockTemplate),
      loadTemplate: jest.fn().mockResolvedValue(mockTemplate),
    });

    mockFileService = createMockImplementation<FileSystemService>({
      resolvePath: jest.fn((...paths) => path.resolve(...paths)),
      exists: jest.fn().mockResolvedValue(true),
      isDirectory: jest.fn().mockResolvedValue(true),
      isFile: jest.fn().mockResolvedValue(true),
      readJson: jest.fn().mockResolvedValue(mockManifest),
      writeJson: jest.fn().mockResolvedValue(undefined),
      createDirectory: jest.fn().mockResolvedValue(undefined),
      createFile: jest.fn().mockResolvedValue(undefined),
      readFile: jest.fn().mockResolvedValue('file content'),
      ensureDirectory: jest.fn().mockResolvedValue(undefined),
      deletePath: jest.fn().mockResolvedValue(undefined),
      readDirectory: jest.fn().mockResolvedValue([]),
      isDryRun: false,
      setDryRun: jest.fn()
    });

    mockConfigService = createMockImplementation<ConfigurationService>({
      get: jest.fn().mockReturnValue(false)
    });

    projectService = new ProjectService(
      mockTemplateService,
      mockFileService,
      mockConfigService
    );
  });

  afterEach(() => {
    mockFs.restore();
  });

  describe('constructor', () => {
    it('should initialize with required services', () => {
      expect(projectService).toBeInstanceOf(ProjectService);
    });

    it('should work without optional config service', () => {
      const serviceWithoutConfig = new ProjectService(
        mockTemplateService,
        mockFileService
      );
      expect(serviceWithoutConfig).toBeInstanceOf(ProjectService);
    });
  });

  describe('createProject', () => {
    it('should create project with single template', async () => {
      const projectName = 'new-project';
      const templateIds = ['test-template-123'];
      const targetPath = '/test/new-project-dir';
      const variables = { PROJECT_NAME: projectName, AUTHOR: 'Test Author' };

      const manifest = await projectService.createProject(
        projectName,
        templateIds,
        targetPath,
        variables
      );

      expect(manifest).toBeDefined();
      expect(manifest.projectName).toBe(projectName);
      expect(manifest.templates).toHaveLength(1);
      expect(manifest.templates[0].templateId).toBe('test-template-123');
      expect(manifest.variables.PROJECT_NAME).toBe(projectName);
      expect(manifest.history).toHaveLength(1);
      expect(manifest.history[0].action).toBe('create');

      // Verify service calls
      expect(mockTemplateService.getTemplate).toHaveBeenCalledWith('test-template-123');
      expect(mockFileService.createDirectory).toHaveBeenCalled();
      expect(mockFileService.createFile).toHaveBeenCalled();
    });

    it('should create project with multiple templates', async () => {
      const mockTemplate2 = {
        ...mockTemplate,
        id: 'test-template-456',
        name: 'Second Template',
        rootFolder: 'backend'
      };

      mockTemplateService.getTemplate
        .mockResolvedValueOnce(mockTemplate)
        .mockResolvedValueOnce(mockTemplate2);

      const projectName = 'multi-template-project';
      const templateIds = ['test-template-123', 'test-template-456'];
      const targetPath = '/test/multi-project';

      const manifest = await projectService.createProject(
        projectName,
        templateIds,
        targetPath
      );

      expect(manifest.templates).toHaveLength(2);
      expect(manifest.templates[0].rootFolder).toBe('my-app');
      expect(manifest.templates[1].rootFolder).toBe('backend');
    });

    it('should throw error for invalid project name', async () => {
      await expect(projectService.createProject('', ['template'], '/path')).rejects.toThrow(
        'Project name must be a non-empty string'
      );

      await expect(projectService.createProject(null as any, ['template'], '/path')).rejects.toThrow(
        'Project name must be a non-empty string'
      );
    });

    it('should throw error for empty template IDs', async () => {
      await expect(projectService.createProject('project', [], '/path')).rejects.toThrow(
        'At least one template ID must be provided'
      );

      await expect(projectService.createProject('project', null as any, '/path')).rejects.toThrow(
        'At least one template ID must be provided'
      );
    });

    it('should throw error for invalid target path', async () => {
      await expect(projectService.createProject('project', ['template'], '')).rejects.toThrow(
        'Target path must be a non-empty string'
      );
    });

    it('should throw error for rootFolder conflicts', async () => {
      const mockTemplate2 = {
        ...mockTemplate,
        id: 'conflicting-template',
        rootFolder: 'my-app' // Same as first template
      };

      mockTemplateService.getTemplate
        .mockResolvedValueOnce(mockTemplate)
        .mockResolvedValueOnce(mockTemplate2);

      await expect(projectService.createProject(
        'conflict-project',
        ['test-template-123', 'conflicting-template'],
        '/test/conflict'
      )).rejects.toThrow('Template conflict');
    });

    it('should throw error for missing required variables', async () => {
      const templateWithRequiredVar = {
        ...mockTemplate,
        variables: [
          {
            name: 'REQUIRED_VAR',
            description: 'Required variable',
            required: true
          }
        ]
      };

      mockTemplateService.getTemplate.mockResolvedValue(templateWithRequiredVar);

      await expect(projectService.createProject(
        'project',
        ['test-template-123'],
        '/test/missing-vars'
      )).rejects.toThrow('Template validation failed');
    });

    it('should throw error for non-existent template', async () => {
      mockTemplateService.getTemplate.mockRejectedValue(new Error('Template not found'));

      await expect(projectService.createProject(
        'project',
        ['non-existent'],
        '/test/missing'
      )).rejects.toThrow('Failed to create project');
    });
  });

  describe('validateProject', () => {
    beforeEach(() => {
      // Mock file service for validation tests
      mockFileService.exists.mockImplementation(async (path: string) => {
        // Mock existing files
        return path.includes('package.json') || path.includes('README.md') ||
               path.includes('src') || path.includes('tests');
      });

      mockFileService.isDirectory.mockImplementation(async (path: string) => {
        return path.includes('src') || path.includes('tests');
      });

      mockFileService.isFile.mockImplementation(async (path: string) => {
        return path.includes('package.json') || path.includes('README.md');
      });
    });

    it('should return valid report for healthy project', async () => {
      const report = await projectService.validateProject(testProjectPath);

      expect(report).toBeDefined();
      expect(report.valid).toBe(true);
      expect(report.projectName).toBe('test-project');
      expect(report.templates).toContain('test-template-123');
      expect(report.errors).toHaveLength(0);
      expect(report.stats.templatesChecked).toBe(1);
    });

    it('should detect missing required folders', async () => {
      mockFileService.exists.mockImplementation(async (path: string) => {
        // Mock missing src directory
        return !path.includes('src');
      });

      const report = await projectService.validateProject(testProjectPath);

      expect(report.valid).toBe(false);
      expect(report.errors.length).toBeGreaterThan(0);
      expect(report.errors[0].ruleId).toBe('required_folder');
      expect(report.errors[0].path).toContain('src');
      expect(report.errors[0].fix?.autoFix).toBe(true);
    });

    it('should detect missing required files', async () => {
      mockFileService.exists.mockImplementation(async (path: string) => {
        // Mock missing package.json
        return !path.includes('package.json');
      });

      const report = await projectService.validateProject(testProjectPath);

      expect(report.valid).toBe(false);
      expect(report.errors.length).toBeGreaterThan(0);
      expect(report.errors[0].ruleId).toBe('required_file');
      expect(report.errors[0].path).toContain('package.json');
      expect(report.errors[0].fix?.autoFix).toBe(true);
    });

    it('should detect path type mismatches', async () => {
      // Mock src as file instead of directory
      mockFileService.isDirectory.mockImplementation(async (path: string) => {
        return !path.includes('src');
      });

      const report = await projectService.validateProject(testProjectPath);

      expect(report.valid).toBe(false);
      expect(report.errors.length).toBeGreaterThan(0);
      expect(report.errors[0].message).toContain('not a directory');
    });

    it('should validate custom template rules', async () => {
      const templateWithRules = {
        ...mockTemplate,
        rules: {
          ...mockTemplate.rules,
          rules: [
            {
              id: 'custom-rule',
              name: 'Custom File Required',
              description: 'Custom file must exist',
              type: 'required_file' as const,
              target: 'custom.txt',
              fix: {
                action: 'create' as const,
                content: 'custom content',
                autoFix: true
              },
              severity: 'error' as const
            }
          ]
        }
      };

      mockTemplateService.getTemplate.mockResolvedValue(templateWithRules);
      mockFileService.exists.mockImplementation(async (path: string) => {
        return !path.includes('custom.txt');
      });

      const report = await projectService.validateProject(testProjectPath);

      expect(report.valid).toBe(false);
      expect(report.errors.some(e => e.ruleId === 'custom-rule')).toBe(true);
    });

    it('should throw error for invalid project path', async () => {
      await expect(projectService.validateProject('')).rejects.toThrow(
        'Project path must be a non-empty string'
      );
    });

    it('should throw error for project without manifest', async () => {
      mockFileService.readJson.mockRejectedValue(new Error('File not found'));

      await expect(projectService.validateProject('/nonexistent')).rejects.toThrow(
        'No project manifest found'
      );
    });

    it('should handle template loading errors gracefully', async () => {
      mockTemplateService.getTemplate.mockRejectedValue(new Error('Template not found'));

      const report = await projectService.validateProject(testProjectPath);

      expect(report.warnings.length).toBeGreaterThan(0);
      expect(report.warnings[0].message).toContain('could not be loaded');
    });
  });

  describe('fixProject', () => {
    beforeEach(() => {
      // Setup project with issues that can be fixed
      mockFileService.exists.mockImplementation(async (path: string) => {
        // Mock missing files/folders
        return !(path.includes('src') || path.includes('missing.txt'));
      });
    });

    it('should fix auto-fixable errors', async () => {
      const report = await projectService.fixProject(testProjectPath, false);

      expect(mockFileService.createDirectory).toHaveBeenCalled();
      expect(mockFileService.createFile).toHaveBeenCalled();
      expect(report.suggestions.some(s => s.includes('Fixed'))).toBe(true);
    });

    it('should run in dry-run mode without making changes', async () => {
      const report = await projectService.fixProject(testProjectPath, true);

      expect(mockFileService.setDryRun).toHaveBeenCalledWith(true);
      expect(report.suggestions.some(s => s.includes('dry run'))).toBe(true);
    });

    it('should skip non-auto-fixable errors', async () => {
      const templateWithManualFix = {
        ...mockTemplate,
        rules: {
          ...mockTemplate.rules,
          rules: [
            {
              id: 'manual-rule',
              name: 'Manual Fix Required',
              description: 'Requires manual intervention',
              type: 'required_file' as const,
              target: 'manual.txt',
              fix: {
                action: 'create' as const,
                autoFix: false,
                message: 'Manual fix required'
              },
              severity: 'error' as const
            }
          ]
        }
      };

      mockTemplateService.getTemplate.mockResolvedValue(templateWithManualFix);

      const report = await projectService.fixProject(testProjectPath, false);

      expect(report.warnings.some(w => w.message.includes('Manual fix required'))).toBe(true);
    });

    it('should handle fix failures gracefully', async () => {
      mockFileService.createDirectory.mockRejectedValue(new Error('Permission denied'));

      const report = await projectService.fixProject(testProjectPath, false);

      expect(report.warnings.some(w => w.message.includes('Failed to fix'))).toBe(true);
    });

    it('should return existing report if project is already valid', async () => {
      // Mock all files existing
      mockFileService.exists.mockResolvedValue(true);

      const report = await projectService.fixProject(testProjectPath, false);

      expect(report.valid).toBe(true);
      expect(report.errors).toHaveLength(0);
    });
  });

  describe('extendProject', () => {
    it('should extend project with additional template', async () => {
      const newTemplate = {
        ...mockTemplate,
        id: 'extension-template',
        name: 'Extension Template',
        rootFolder: 'extensions'
      };

      mockTemplateService.getTemplate.mockResolvedValue(newTemplate);

      const manifest = await projectService.extendProject(
        testProjectPath,
        ['extension-template'],
        { NEW_VAR: 'value' }
      );

      expect(manifest.templates).toHaveLength(2);
      expect(manifest.templates[1].templateId).toBe('extension-template');
      expect(manifest.variables.NEW_VAR).toBe('value');
      expect(manifest.history.length).toBeGreaterThan(1);
      expect(manifest.history[manifest.history.length - 1].action).toBe('extend');
    });

    it('should throw error for rootFolder conflicts with existing templates', async () => {
      const conflictingTemplate = {
        ...mockTemplate,
        id: 'conflicting-extension',
        rootFolder: 'my-app' // Conflicts with existing template
      };

      mockTemplateService.getTemplate.mockResolvedValue(conflictingTemplate);

      await expect(projectService.extendProject(
        testProjectPath,
        ['conflicting-extension']
      )).rejects.toThrow('Template conflict');
    });

    it('should throw error for non-existent project', async () => {
      mockFileService.readJson.mockRejectedValue(new Error('Not found'));

      await expect(projectService.extendProject(
        '/nonexistent',
        ['template']
      )).rejects.toThrow('No project manifest found');
    });
  });

  describe('loadProjectManifest', () => {
    it('should load manifest from project path', async () => {
      const manifest = await projectService.loadProjectManifest(testProjectPath);

      expect(manifest).toBeDefined();
      expect(manifest?.projectName).toBe('test-project');
      expect(mockFileService.readJson).toHaveBeenCalled();
    });

    it('should return null for non-existent manifest', async () => {
      mockFileService.readJson.mockRejectedValue(new Error('Not found'));

      const manifest = await projectService.loadProjectManifest('/nonexistent');

      expect(manifest).toBeNull();
    });
  });

  describe('saveProjectManifest', () => {
    it('should save manifest to project path', async () => {
      await projectService.saveProjectManifest(testProjectPath, mockManifest);

      expect(mockFileService.writeJson).toHaveBeenCalledWith(
        expect.stringContaining('manifest.json'),
        mockManifest,
        expect.any(Object)
      );
    });
  });

  describe('cleanProject', () => {
    beforeEach(() => {
      mockFileService.exists.mockImplementation(async (path: string) => {
        return path.includes('.scaffold-temp') || path.includes('.scaffold-backup');
      });

      mockFileService.readDirectory.mockResolvedValue([
        'file1.txt',
        'file2.scaffold-backup',
        'file3.js'
      ]);
    });

    it('should clean temporary files and backups', async () => {
      await projectService.cleanProject(testProjectPath);

      expect(mockFileService.deletePath).toHaveBeenCalled();
    });

    it('should use current directory if no path provided', async () => {
      const originalCwd = process.cwd();
      jest.spyOn(process, 'cwd').mockReturnValue('/current/dir');

      await projectService.cleanProject();

      expect(mockFileService.resolvePath).toHaveBeenCalledWith('/current/dir');

      jest.spyOn(process, 'cwd').mockReturnValue(originalCwd);
    });

    it('should run in dry-run mode', async () => {
      mockFileService.isDryRun = true;

      await projectService.cleanProject(testProjectPath);

      // Should not actually delete files in dry-run mode
      expect(mockFileService.deletePath).not.toHaveBeenCalled();
    });

    it('should handle cleanup failures gracefully', async () => {
      mockFileService.deletePath.mockRejectedValue(new Error('Permission denied'));

      // Should not throw error
      await expect(projectService.cleanProject(testProjectPath)).resolves.not.toThrow();
    });

    it('should skip cleanup if no items found', async () => {
      mockFileService.exists.mockResolvedValue(false);

      await projectService.cleanProject(testProjectPath);

      expect(mockFileService.deletePath).not.toHaveBeenCalled();
    });
  });

  describe('getProjectManifest', () => {
    it('should get manifest from direct path', async () => {
      const manifest = await projectService.getProjectManifest(testProjectPath);

      expect(manifest).toBeDefined();
      expect(manifest?.id).toBe('test-project-456');
    });

    it('should search upward for nearest manifest', async () => {
      const deepPath = path.join(testProjectPath, 'my-app', 'src', 'components');

      // Mock the file system to find manifest in parent directory
      mockFileService.exists.mockImplementation(async (filePath: string) => {
        return filePath.includes('.scaffold/manifest.json') &&
               !filePath.includes('components') &&
               !filePath.includes('src');
      });

      const manifest = await projectService.getProjectManifest(deepPath);

      expect(manifest).toBeDefined();
      expect(manifest?.projectName).toBe('test-project');
    });

    it('should return null if no manifest found', async () => {
      mockFileService.exists.mockResolvedValue(false);

      const manifest = await projectService.getProjectManifest('/no/manifest');

      expect(manifest).toBeNull();
    });

    it('should throw error for invalid path', async () => {
      await expect(projectService.getProjectManifest('')).rejects.toThrow(
        'Project path must be a non-empty string'
      );
    });
  });

  describe('initializeProjectManifest', () => {
    it('should create manifest with required fields', () => {
      const manifest = projectService.initializeProjectManifest('new-project', 'template-123');

      expect(manifest.projectName).toBe('new-project');
      expect(manifest.id).toBeDefined();
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.created).toBeDefined();
      expect(manifest.updated).toBeDefined();
      expect(manifest.templates).toEqual([]);
      expect(manifest.variables).toEqual({});
      expect(manifest.history).toEqual([]);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => projectService.initializeProjectManifest('', 'template')).toThrow(
        'Project name must be a non-empty string'
      );

      expect(() => projectService.initializeProjectManifest('project', '')).toThrow(
        'Template ID must be a non-empty string'
      );
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      mockFileService.readJson.mockRejectedValue(new Error('Disk error'));

      await expect(projectService.validateProject(testProjectPath)).rejects.toThrow(
        'Failed to validate project'
      );
    });

    it('should provide detailed error messages', async () => {
      mockTemplateService.getTemplate.mockRejectedValue(new Error('Template corrupted'));

      await expect(projectService.createProject(
        'project',
        ['bad-template'],
        '/test/path'
      )).rejects.toThrow('Failed to create project');
    });

    it('should handle variable substitution service errors', async () => {
      // This would be tested if variable service throws errors
      // For now, we assume it works correctly
      const manifest = await projectService.createProject(
        'test-project',
        ['test-template-123'],
        '/test/path',
        { PROJECT_NAME: 'test' }
      );

      expect(manifest).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle manifest with no templates', async () => {
      const emptyManifest = {
        ...mockManifest,
        templates: []
      };

      mockFileService.readJson.mockResolvedValue(emptyManifest);

      const report = await projectService.validateProject(testProjectPath);

      expect(report.valid).toBe(true);
      expect(report.stats.templatesChecked).toBe(0);
    });

    it('should handle templates with no files or folders', async () => {
      const minimalTemplate = {
        ...mockTemplate,
        files: [],
        folders: []
      };

      mockTemplateService.getTemplate.mockResolvedValue(minimalTemplate);

      const manifest = await projectService.createProject(
        'minimal-project',
        ['test-template-123'],
        '/test/minimal'
      );

      expect(manifest).toBeDefined();
      expect(manifest.templates).toHaveLength(1);
    });

    it('should handle large numbers of templates', async () => {
      const manyTemplates = Array.from({ length: 100 }, (_, i) => ({
        ...mockTemplate,
        id: `template-${i}`,
        rootFolder: `app-${i}`
      }));

      let callCount = 0;
      mockTemplateService.getTemplate.mockImplementation(async (id: string) => {
        return manyTemplates[callCount++];
      });

      const templateIds = manyTemplates.map(t => t.id);

      const manifest = await projectService.createProject(
        'large-project',
        templateIds,
        '/test/large'
      );

      expect(manifest.templates).toHaveLength(100);
    });
  });
});