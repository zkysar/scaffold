/**
 * Unit tests for TemplateService
 */

import mockFs from 'mock-fs';
import * as path from 'path';
import * as os from 'os';
import { TemplateService } from '@/services/template-service';
import type {
  Template,
  TemplateLibrary,
  TemplateSummary,
} from '@/models';
import {
  createMockImplementation,
  assertDefined,
} from '@tests/helpers/test-utils';

// Mock os module
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  homedir: jest.fn(() => '/home/user'),
}));

describe('TemplateService', () => {
  let templateService: TemplateService;
  const mockHomeDir = '/home/user';
  const templatesDir = path.join(mockHomeDir, '.scaffold', 'templates');
  const cacheDir = path.join(mockHomeDir, '.scaffold', 'cache');

  // Mock template data
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
        content: '{\n  "name": "{{PROJECT_NAME}}",\n  "version": "1.0.0"\n}',
        permissions: '644',
        variables: true,
      },
      {
        path: 'README.md',
        sourcePath: 'README.template.md',
        permissions: '644',
        variables: true,
      },
    ],
    variables: [
      {
        name: 'PROJECT_NAME',
        description: 'The name of the project',
        required: true,
        pattern: '^[a-zA-Z0-9_-]+$',
      },
      {
        name: 'AUTHOR',
        description: 'Author of the project',
        required: false,
        default: 'Anonymous',
      },
    ],
    rules: {
      strictMode: false,
      allowExtraFiles: true,
      allowExtraFolders: true,
      conflictResolution: 'prompt',
      excludePatterns: ['node_modules/**', '.git/**'],
      rules: [
        {
          id: 'package-json-required',
          name: 'Package.json Required',
          description: 'Every project must have a package.json file',
          type: 'required_file',
          target: 'package.json',
          fix: {
            action: 'create',
            content: '{"name": "default-project", "version": "1.0.0"}',
            autoFix: true,
          },
          severity: 'error',
        },
      ],
    },
    dependencies: [],
  };

  const invalidTemplate = {
    // Missing required fields
    name: 'Invalid Template',
    description: 'Missing required fields',
  };

  beforeEach(() => {
    // Setup mock filesystem
    const mockFileSystem = {
      [mockHomeDir]: {
        '.scaffold': {
          templates: {
            'test-template-123': {
              'template.json': JSON.stringify(mockTemplate),
              files: {
                'README.template.md':
                  '# {{PROJECT_NAME}}\n\nAuthor: {{AUTHOR}}',
              },
            },
            'invalid-template': {
              'template.json': JSON.stringify(invalidTemplate),
            },
          },
          cache: {},
        },
      },
    };

    mockFs(mockFileSystem);

    templateService = new TemplateService();
  });

  afterEach(() => {
    mockFs.restore();
  });

  describe('constructor', () => {
    it('should initialize with correct directories', () => {
      expect(templateService).toBeInstanceOf(TemplateService);
    });
  });

  describe('loadTemplates', () => {
    it('should load all valid templates', async () => {
      const library = await templateService.loadTemplates();

      expect(library).toBeDefined();
      expect(library.sources).toHaveLength(1);
      expect(library.sources[0].type).toBe('global');
      expect(library.sources[0].path).toBe(templatesDir);
      expect(library.templates).toHaveLength(1);

      const template = library.templates[0];
      expect(template.id).toBe('test-template-123');
      expect(template.name).toBe('Test Template');
      expect(template.version).toBe('1.0.0');
      expect(template.source).toBe('local');
      expect(template.installed).toBe(true);
    });

    it('should handle empty templates directory', async () => {
      // Setup empty directory
      mockFs({
        [mockHomeDir]: {
          '.scaffold': {
            templates: {},
            cache: {},
          },
        },
      });

      const library = await templateService.loadTemplates();

      expect(library.templates).toHaveLength(0);
      expect(library.sources).toHaveLength(1);
    });

    it('should create directories if they do not exist', async () => {
      // Setup no .scaffold directory
      mockFs({
        [mockHomeDir]: {},
      });

      const library = await templateService.loadTemplates();

      expect(library).toBeDefined();
      expect(library.templates).toHaveLength(0);
    });

    it('should skip invalid templates with warnings', async () => {
      // Capture console.warn calls
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const library = await templateService.loadTemplates();

      // Should load only the valid template, skip invalid one
      expect(library.templates).toHaveLength(1);
      expect(library.templates[0].id).toBe('test-template-123');
      expect(warnSpy).toHaveBeenCalled();
    });

    it('should throw error on filesystem failure', async () => {
      // Create a service that will fail during construction
      const originalHomedir = os.homedir;
      const mockHomedir = jest.fn(() => {
        throw new Error('Filesystem error');
      });
      (os as any).homedir = mockHomedir;

      expect(() => new TemplateService()).toThrow('Filesystem error');

      // Restore
      (os as any).homedir = originalHomedir;
    });
  });

  describe('getTemplate', () => {
    it('should return template by valid ID', async () => {
      const template = await templateService.getTemplate('test-template-123');

      expect(template).toBeDefined();
      expect(template.id).toBe('test-template-123');
      expect(template.name).toBe('Test Template');
      expect(template.folders).toHaveLength(2);
      expect(template.files).toHaveLength(2);
      expect(template.variables).toHaveLength(2);
    });

    it('should throw error for non-existent template', async () => {
      await expect(templateService.getTemplate('non-existent')).rejects.toThrow(
        "Template with ID 'non-existent' not found"
      );
    });

    it('should throw error for invalid template ID', async () => {
      await expect(templateService.getTemplate('')).rejects.toThrow(
        'Template ID must be a non-empty string'
      );

      await expect(templateService.getTemplate(null as any)).rejects.toThrow(
        'Template ID must be a non-empty string'
      );
    });
  });

  describe('searchTemplates', () => {
    it('should find templates by name', async () => {
      const results = await templateService.searchTemplates('Test');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Test Template');
    });

    it('should find templates by description', async () => {
      const results = await templateService.searchTemplates('test template');

      expect(results).toHaveLength(1);
      expect(results[0].description).toBe('A test template for unit testing');
    });

    it('should return empty array for no matches', async () => {
      const results = await templateService.searchTemplates('nonexistent');

      expect(results).toHaveLength(0);
    });

    it('should be case insensitive', async () => {
      const results = await templateService.searchTemplates('TEST');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Test Template');
    });

    it('should throw error for invalid query', async () => {
      await expect(templateService.searchTemplates('')).rejects.toThrow(
        'Search query must be a non-empty string'
      );
    });
  });

  describe('createTemplate', () => {
    const newTemplate: Template = {
      ...mockTemplate,
      id: 'new-template-456',
      name: 'New Template',
      created: undefined as any, // Will be set by service
      updated: undefined as any, // Will be set by service
    };

    it('should create valid template', async () => {
      await expect(
        templateService.createTemplate(newTemplate)
      ).resolves.not.toThrow();

      // Verify template was created
      const created = await templateService.getTemplate('new-template-456');
      expect(created.name).toBe('New Template');
      expect(created.created).toBeDefined();
      expect(created.updated).toBeDefined();
    });

    it('should throw error for duplicate template ID', async () => {
      const duplicateTemplate = { ...mockTemplate, name: 'Duplicate' };

      await expect(
        templateService.createTemplate(duplicateTemplate)
      ).rejects.toThrow("Template with ID 'test-template-123' already exists");
    });

    it('should throw error for invalid template', async () => {
      const invalidTemplate = {
        ...mockTemplate,
        id: '', // Invalid ID
      };

      await expect(
        templateService.createTemplate(invalidTemplate)
      ).rejects.toThrow('Template validation failed');
    });
  });

  describe('updateTemplate', () => {
    it('should update existing template', async () => {
      const updatedTemplate = {
        ...mockTemplate,
        name: 'Updated Template',
        description: 'Updated description',
      };

      await expect(
        templateService.updateTemplate(updatedTemplate)
      ).resolves.not.toThrow();

      const template = await templateService.getTemplate('test-template-123');
      expect(template.name).toBe('Updated Template');
      expect(template.description).toBe('Updated description');
      expect(template.updated).not.toBe(mockTemplate.updated);
    });

    it('should preserve created date on update', async () => {
      const originalCreated = mockTemplate.created;
      const updatedTemplate = {
        ...mockTemplate,
        name: 'Updated Template',
      };

      await templateService.updateTemplate(updatedTemplate);

      const template = await templateService.getTemplate('test-template-123');
      expect(template.created).toBe(originalCreated);
    });

    it('should throw error for non-existent template', async () => {
      const nonExistentTemplate = {
        ...mockTemplate,
        id: 'non-existent-789',
      };

      await expect(
        templateService.updateTemplate(nonExistentTemplate)
      ).rejects.toThrow("Template with ID 'non-existent-789' not found");
    });

    it('should throw error for invalid template', async () => {
      const invalidTemplate = {
        ...mockTemplate,
        version: 'invalid-version', // Invalid semver
      };

      await expect(
        templateService.updateTemplate(invalidTemplate)
      ).rejects.toThrow('Template validation failed');
    });
  });

  describe('deleteTemplate', () => {
    it('should delete existing template', async () => {
      await expect(
        templateService.deleteTemplate('test-template-123')
      ).resolves.not.toThrow();

      await expect(
        templateService.getTemplate('test-template-123')
      ).rejects.toThrow("Template with ID 'test-template-123' not found");
    });

    it('should throw error for non-existent template', async () => {
      await expect(
        templateService.deleteTemplate('non-existent')
      ).rejects.toThrow("Template with ID 'non-existent' not found");
    });

    it('should throw error for invalid template ID', async () => {
      await expect(templateService.deleteTemplate('')).rejects.toThrow(
        'Template ID must be a non-empty string'
      );
    });
  });

  describe('validateTemplate', () => {
    it('should return no errors for valid template', async () => {
      const errors = await templateService.validateTemplate(mockTemplate);

      expect(errors).toHaveLength(0);
    });

    it('should return errors for missing required fields', async () => {
      const invalidTemplate = {
        name: 'Invalid Template',
      } as Template;

      const errors = await templateService.validateTemplate(invalidTemplate);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain(
        expect.stringMatching(/Template ID is required/)
      );
      expect(errors).toContain(
        expect.stringMatching(/Template version is required/)
      );
    });

    it('should validate semantic version', async () => {
      const invalidTemplate = {
        ...mockTemplate,
        version: 'not-a-version',
      };

      const errors = await templateService.validateTemplate(invalidTemplate);

      expect(errors).toContain(
        expect.stringMatching(
          /Template version must be a valid semantic version/
        )
      );
    });

    it('should validate rootFolder format', async () => {
      const invalidTemplate = {
        ...mockTemplate,
        rootFolder: 'invalid/path',
      };

      const errors = await templateService.validateTemplate(invalidTemplate);

      expect(errors).toContain(
        expect.stringMatching(
          /Template rootFolder must be a simple directory name/
        )
      );
    });

    it('should validate folder paths are relative', async () => {
      const invalidTemplate = {
        ...mockTemplate,
        folders: [
          {
            path: '/absolute/path/src',
            description: 'Invalid folder',
          },
        ],
      };

      const errors = await templateService.validateTemplate(invalidTemplate);

      expect(errors.some(e => e.includes('must be relative'))).toBe(true);
    });

    it('should validate file paths are relative', async () => {
      const invalidTemplate = {
        ...mockTemplate,
        files: [
          {
            path: '/absolute/file.txt',
            content: 'test',
          },
        ],
      };

      const errors = await templateService.validateTemplate(invalidTemplate);

      expect(errors.some(e => e.includes('must be relative'))).toBe(true);
    });

    it('should reject paths with directory traversal', async () => {
      const invalidTemplate = {
        ...mockTemplate,
        files: [
          {
            path: '../outside/file.txt',
            content: 'test',
          },
        ],
      };

      const errors = await templateService.validateTemplate(invalidTemplate);

      expect(errors.some(e => e.includes('cannot contain'))).toBe(true);
    });

    it('should validate file has content or sourcePath', async () => {
      const invalidTemplate = {
        ...mockTemplate,
        files: [
          {
            path: 'empty.txt',
            // Missing content and sourcePath
          },
        ],
      };

      const errors = await templateService.validateTemplate(invalidTemplate);

      expect(errors).toContain(
        expect.stringMatching(/either sourcePath or content must be provided/)
      );
    });

    it('should validate variable names are unique', async () => {
      const invalidTemplate = {
        ...mockTemplate,
        variables: [
          {
            name: 'DUPLICATE',
            description: 'First variable',
            required: true,
          },
          {
            name: 'DUPLICATE',
            description: 'Second variable',
            required: false,
          },
        ],
      };

      const errors = await templateService.validateTemplate(invalidTemplate);

      expect(errors).toContain(
        expect.stringMatching(/duplicate variable name/)
      );
    });

    it('should validate rule IDs are unique', async () => {
      const invalidTemplate = {
        ...mockTemplate,
        rules: {
          ...mockTemplate.rules,
          rules: [
            {
              id: 'duplicate-rule',
              name: 'First Rule',
              description: 'First rule',
              type: 'required_file' as const,
              target: 'file1.txt',
              fix: { action: 'create' as const, autoFix: true },
              severity: 'error' as const,
            },
            {
              id: 'duplicate-rule',
              name: 'Second Rule',
              description: 'Second rule',
              type: 'required_file' as const,
              target: 'file2.txt',
              fix: { action: 'create' as const, autoFix: true },
              severity: 'error' as const,
            },
          ],
        },
      };

      const errors = await templateService.validateTemplate(invalidTemplate);

      expect(errors).toContain(expect.stringMatching(/duplicate rule ID/));
    });
  });

  describe('getTemplateDependencies', () => {
    it('should return empty array for template with no dependencies', async () => {
      const dependencies =
        await templateService.getTemplateDependencies('test-template-123');

      expect(dependencies).toHaveLength(0);
    });

    it('should throw error for circular dependencies', async () => {
      // Create templates with circular dependencies
      const template1 = {
        ...mockTemplate,
        id: 'template-1',
        dependencies: ['template-2'],
      };
      const template2 = {
        ...mockTemplate,
        id: 'template-2',
        dependencies: ['template-1'],
      };

      mockFs({
        [mockHomeDir]: {
          '.scaffold': {
            templates: {
              'template-1': {
                'template.json': JSON.stringify(template1),
              },
              'template-2': {
                'template.json': JSON.stringify(template2),
              },
            },
            cache: {},
          },
        },
      });

      await expect(
        templateService.getTemplateDependencies('template-1')
      ).rejects.toThrow("Failed to resolve dependency 'template-2'");
    });

    it('should throw error for missing dependency', async () => {
      const templateWithDeps = {
        ...mockTemplate,
        id: 'template-with-deps',
        dependencies: ['missing-template'],
      };

      mockFs({
        [mockHomeDir]: {
          '.scaffold': {
            templates: {
              'template-with-deps': {
                'template.json': JSON.stringify(templateWithDeps),
              },
            },
            cache: {},
          },
        },
      });

      await expect(
        templateService.getTemplateDependencies('template-with-deps')
      ).rejects.toThrow("Failed to resolve dependency 'missing-template'");
    });
  });

  describe('exportTemplate', () => {
    it('should export template with files', async () => {
      const outputPath = '/tmp/export.json';

      await expect(
        templateService.exportTemplate('test-template-123', outputPath)
      ).resolves.not.toThrow();
    });

    it('should throw error for non-existent template', async () => {
      await expect(
        templateService.exportTemplate('non-existent', '/tmp/export.json')
      ).rejects.toThrow("Template with ID 'non-existent' not found");
    });
  });

  describe('importTemplate', () => {
    it('should import valid template', async () => {
      const exportData = {
        template: {
          ...mockTemplate,
          id: 'imported-template',
        },
        files: {
          'README.template.md': '# Imported Template',
        },
      };

      const archivePath = '/tmp/import.json';
      mockFs({
        [mockHomeDir]: {
          '.scaffold': {
            templates: {
              'test-template-123': {
                'template.json': JSON.stringify(mockTemplate),
                files: {
                  'README.template.md':
                    '# {{PROJECT_NAME}}\n\nAuthor: {{AUTHOR}}',
                },
              },
            },
            cache: {},
          },
        },
        [archivePath]: JSON.stringify(exportData),
      });

      const imported = await templateService.importTemplate(archivePath);

      expect(imported.id).toBe('imported-template');
      expect(imported.name).toBe('Test Template');
    });

    it('should throw error for non-existent archive', async () => {
      await expect(
        templateService.importTemplate('/tmp/missing.json')
      ).rejects.toThrow("Archive file '/tmp/missing.json' does not exist");
    });

    it('should throw error for invalid export file', async () => {
      const archivePath = '/tmp/invalid.json';
      mockFs({
        [mockHomeDir]: {
          '.scaffold': {
            templates: {
              'test-template-123': {
                'template.json': JSON.stringify(mockTemplate),
                files: {
                  'README.template.md':
                    '# {{PROJECT_NAME}}\n\nAuthor: {{AUTHOR}}',
                },
              },
            },
            cache: {},
          },
        },
        [archivePath]: JSON.stringify({ invalid: 'data' }),
      });

      await expect(templateService.importTemplate(archivePath)).rejects.toThrow(
        'Invalid export file: missing template data'
      );
    });

    it('should throw error for duplicate template ID', async () => {
      const exportData = {
        template: mockTemplate, // Same ID as existing template
        files: {},
      };

      const archivePath = '/tmp/duplicate.json';
      mockFs({
        [mockHomeDir]: {
          '.scaffold': {
            templates: {
              'test-template-123': {
                'template.json': JSON.stringify(mockTemplate),
                files: {
                  'README.template.md':
                    '# {{PROJECT_NAME}}\n\nAuthor: {{AUTHOR}}',
                },
              },
            },
            cache: {},
          },
        },
        [archivePath]: JSON.stringify(exportData),
      });

      await expect(templateService.importTemplate(archivePath)).rejects.toThrow(
        "Template with ID 'test-template-123' already exists"
      );
    });
  });

  describe('loadTemplate', () => {
    it('should load template from path', async () => {
      const templatePath = path.join(templatesDir, 'test-template-123');
      const template = await templateService.loadTemplate(templatePath);

      expect(template.id).toBe('test-template-123');
      expect(template.name).toBe('Test Template');
    });

    it('should throw error for missing template.json', async () => {
      const templatePath = '/tmp/empty-template';
      mockFs({
        [mockHomeDir]: {
          '.scaffold': {
            templates: {},
            cache: {},
          },
        },
        [templatePath]: {},
      });

      await expect(templateService.loadTemplate(templatePath)).rejects.toThrow(
        'Template definition not found'
      );
    });

    it('should throw error for invalid JSON', async () => {
      const templatePath = '/tmp/invalid-template';
      mockFs({
        [mockHomeDir]: {
          '.scaffold': {
            templates: {},
            cache: {},
          },
        },
        [templatePath]: {
          'template.json': 'invalid json content',
        },
      });

      await expect(templateService.loadTemplate(templatePath)).rejects.toThrow(
        'Invalid JSON in template definition'
      );
    });

    it('should throw error for invalid template data', async () => {
      const templatePath = '/tmp/invalid-template';
      mockFs({
        [mockHomeDir]: {
          '.scaffold': {
            templates: {},
            cache: {},
          },
        },
        [templatePath]: {
          'template.json': JSON.stringify(invalidTemplate),
        },
      });

      await expect(templateService.loadTemplate(templatePath)).rejects.toThrow(
        'Invalid template'
      );
    });
  });

  describe('saveTemplate', () => {
    it('should save template to filesystem', async () => {
      const newTemplate = {
        ...mockTemplate,
        id: 'saved-template',
        name: 'Saved Template',
      };

      await expect(
        templateService.saveTemplate(newTemplate)
      ).resolves.not.toThrow();

      // Verify template was saved
      const saved = await templateService.getTemplate('saved-template');
      expect(saved.name).toBe('Saved Template');
    });

    it('should create template directory if it does not exist', async () => {
      // Clear filesystem
      mockFs({
        [mockHomeDir]: {
          '.scaffold': {
            templates: {},
            cache: {},
          },
        },
      });

      const newTemplate = {
        ...mockTemplate,
        id: 'new-template',
        name: 'New Template',
      };

      await expect(
        templateService.saveTemplate(newTemplate)
      ).resolves.not.toThrow();
    });
  });

  describe('installTemplate', () => {
    it('should throw not implemented error', async () => {
      const mockTemplateSource = {
        type: 'registry' as const,
        url: 'https://example.com/templates',
        priority: 50,
        enabled: true,
      };

      await expect(
        templateService.installTemplate(mockTemplateSource, 'test-template-id')
      ).rejects.toThrow('Remote template installation not yet implemented');
    });
  });

  describe('error handling', () => {
    it('should handle filesystem permission errors gracefully', async () => {
      // Mock fs to throw permission error
      mockFs({});

      await expect(templateService.loadTemplates()).rejects.toThrow(
        'Failed to load templates'
      );
    });

    it('should handle corrupted template files gracefully', async () => {
      mockFs({
        [mockHomeDir]: {
          '.scaffold': {
            templates: {
              'corrupted-template': {
                'template.json': 'corrupted content {{',
              },
            },
            cache: {},
          },
        },
      });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const library = await templateService.loadTemplates();

      expect(library.templates).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalled();
    });
  });
});
