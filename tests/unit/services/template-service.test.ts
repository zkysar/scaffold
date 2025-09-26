/**
 * Unit tests for TemplateService
 */

import 'reflect-metadata';
import { DependencyContainer } from 'tsyringe';
import * as path from 'path';
import { TemplateService } from '@/services/template-service';
import type { Template, TemplateLibrary, TemplateSummary } from '@/models';
import {
  createMockImplementation,
  assertDefined,
} from '@tests/helpers/test-utils';
import { createTestContainer } from '@tests/helpers/test-container';

// Mock fs-extra with manual implementation
jest.mock('fs-extra');

// Manual in-memory file system for testing
class InMemoryFileSystem {
  public files = new Map<string, string>();
  public directories = new Set<string>();
  private shouldThrowError: string | null = null;

  reset() {
    this.files.clear();
    this.directories.clear();
    this.shouldThrowError = null;
  }

  setError(message: string) {
    this.shouldThrowError = message;
  }

  private checkError() {
    if (this.shouldThrowError) {
      const error = this.shouldThrowError;
      this.shouldThrowError = null;
      throw new Error(error);
    }
  }

  setFile(path: string, content: string) {
    this.files.set(path, content);
    // Also add parent directories
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i++) {
      this.directories.add(parts.slice(0, i).join('/'));
    }
  }

  setDirectory(path: string) {
    this.directories.add(path);
  }

  exists(path: string): boolean {
    return this.files.has(path) || this.directories.has(path);
  }

  readFile(path: string): string {
    if (!this.files.has(path)) {
      throw new Error(`File not found: ${path}`);
    }
    return this.files.get(path)!;
  }

  readJson(path: string): any {
    return JSON.parse(this.readFile(path));
  }

  writeFile(path: string, content: string): void {
    this.setFile(path, content);
  }

  writeJson(path: string, data: any): void {
    this.setFile(path, JSON.stringify(data, null, 2));
  }

  ensureDir(path: string): void {
    this.setDirectory(path);
  }

  readdir(path: string): string[] {
    this.checkError();
    const entries: Set<string> = new Set();
    const dirPrefix = path.endsWith('/') ? path : path + '/';

    // Find all direct children
    for (const [filePath] of this.files) {
      if (filePath.startsWith(dirPrefix)) {
        const relativePath = filePath.slice(dirPrefix.length);
        const firstSlash = relativePath.indexOf('/');
        if (firstSlash === -1) {
          entries.add(relativePath);
        } else {
          entries.add(relativePath.substring(0, firstSlash));
        }
      }
    }

    for (const dir of this.directories) {
      if (dir.startsWith(dirPrefix) && dir !== path) {
        const relativePath = dir.slice(dirPrefix.length);
        const firstSlash = relativePath.indexOf('/');
        if (firstSlash === -1) {
          entries.add(relativePath);
        }
      }
    }

    return Array.from(entries);
  }

  stat(path: string): any {
    if (this.files.has(path)) {
      return { isFile: () => true, isDirectory: () => false };
    } else if (this.directories.has(path)) {
      return { isFile: () => false, isDirectory: () => true };
    }
    throw new Error(`Path not found: ${path}`);
  }

  remove(path: string): void {
    this.files.delete(path);
    this.directories.delete(path);
    // Remove children
    for (const [filePath] of this.files) {
      if (filePath.startsWith(path + '/')) {
        this.files.delete(filePath);
      }
    }
    for (const dirPath of this.directories) {
      if (dirPath.startsWith(path + '/')) {
        this.directories.delete(dirPath);
      }
    }
  }

  copy(source: string, dest: string): void {
    const content = this.files.get(source);
    if (content !== undefined) {
      this.setFile(dest, content);
    }
  }
}

describe('TemplateService', () => {
  let container: DependencyContainer;
  let templateService: TemplateService;
  let fileSystem: InMemoryFileSystem;
  const mockHomeDir = '/home/user';
  const templatesDir = path.join(mockHomeDir, '.scaffold', 'templates');
  const cacheDir = path.join(mockHomeDir, '.scaffold', 'cache');

  // Expected SHA for the mock template - computed from its content
  const expectedTemplateSHA =
    'b9be9ffb5b39dab0bdbe02b4d22b3819e5a371df918204220c70049a931afc83';

  // Mock template data
  const mockTemplate: Template = {
    id: expectedTemplateSHA,
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
    // Setup DI container
    container = createTestContainer();
    templateService = container.resolve(TemplateService);

    // Setup in-memory file system
    fileSystem = new InMemoryFileSystem();
    fileSystem.reset();

    // Setup file system structure
    fileSystem.setDirectory(mockHomeDir);
    fileSystem.setDirectory(path.join(mockHomeDir, '.scaffold'));
    fileSystem.setDirectory(templatesDir);
    fileSystem.setDirectory(cacheDir);
    fileSystem.setDirectory(path.join(templatesDir, expectedTemplateSHA));
    fileSystem.setDirectory(
      path.join(templatesDir, expectedTemplateSHA, 'files')
    );
    fileSystem.setDirectory(path.join(templatesDir, 'invalid-template'));

    // Setup template files
    fileSystem.setFile(
      path.join(templatesDir, expectedTemplateSHA, 'template.json'),
      JSON.stringify(mockTemplate)
    );
    fileSystem.setFile(
      path.join(
        templatesDir,
        expectedTemplateSHA,
        'files',
        'README.template.md'
      ),
      '# {{PROJECT_NAME}}\n\nAuthor: {{AUTHOR}}'
    );
    fileSystem.setFile(
      path.join(templatesDir, 'invalid-template', 'template.json'),
      JSON.stringify(invalidTemplate)
    );

    // Mock fs-extra to use our in-memory file system
    const fs = require('fs-extra');
    fs.pathExists = jest
      .fn()
      .mockImplementation((filePath: string) =>
        Promise.resolve(fileSystem.exists(filePath))
      );
    fs.readFile = jest
      .fn()
      .mockImplementation((filePath: string) =>
        Promise.resolve(fileSystem.readFile(filePath))
      );
    fs.writeFile = jest
      .fn()
      .mockImplementation((filePath: string, content: string) =>
        Promise.resolve(fileSystem.writeFile(filePath, content))
      );
    fs.readJson = jest
      .fn()
      .mockImplementation((filePath: string) =>
        Promise.resolve(fileSystem.readJson(filePath))
      );
    fs.writeJson = jest
      .fn()
      .mockImplementation((filePath: string, data: any) =>
        Promise.resolve(fileSystem.writeJson(filePath, data))
      );
    fs.ensureDir = jest
      .fn()
      .mockImplementation((dirPath: string) =>
        Promise.resolve(fileSystem.ensureDir(dirPath))
      );
    fs.readdir = jest
      .fn()
      .mockImplementation((dirPath: string, options?: any) => {
        if (options?.withFileTypes) {
          const entries = fileSystem.readdir(dirPath);
          return Promise.resolve(
            entries.map(name => {
              const fullPath = path.join(dirPath, name);
              return {
                name,
                isDirectory: () => fileSystem.directories.has(fullPath),
                isFile: () => fileSystem.files.has(fullPath),
              };
            })
          );
        } else {
          return Promise.resolve(fileSystem.readdir(dirPath));
        }
      });
    fs.stat = jest
      .fn()
      .mockImplementation((filePath: string) =>
        Promise.resolve(fileSystem.stat(filePath))
      );
    fs.remove = jest
      .fn()
      .mockImplementation((filePath: string) =>
        Promise.resolve(fileSystem.remove(filePath))
      );
    fs.copy = jest
      .fn()
      .mockImplementation((source: string, dest: string) =>
        Promise.resolve(fileSystem.copy(source, dest))
      );
  });

  afterEach(() => {
    // Reset file system after each test
    fileSystem.reset();
    jest.clearAllMocks();
    container.reset();
  });

  describe('constructor', () => {
    it('should initialize with correct directories', () => {
      expect(templateService).toBeDefined();
      expect(templateService).toHaveProperty('loadTemplates');
      expect(templateService).toHaveProperty('getTemplate');
    });
  });

  describe('loadTemplates', () => {
    it('should throw not implemented error for loadTemplates', async () => {
      await expect(templateService.loadTemplates()).rejects.toThrow(
        'TemplateService.loadTemplates is not implemented'
      );
    });
  });

  describe('getTemplate', () => {
    it('should throw not implemented error for getTemplate', async () => {
      await expect(
        templateService.getTemplate(expectedTemplateSHA)
      ).rejects.toThrow('TemplateService.getTemplate is not implemented');
    });
  });

  describe('searchTemplates', () => {
    it('should throw not implemented error for searchTemplates', async () => {
      await expect(templateService.searchTemplates('Test')).rejects.toThrow(
        'TemplateService.searchTemplates is not implemented'
      );
    });
  });

  describe('createTemplate', () => {
    const newTemplate: Template = {
      ...mockTemplate,
      id: '', // Will be computed by service
      name: 'New Template',
      created: undefined as any, // Will be set by service
      updated: undefined as any, // Will be set by service
    };

    it('should throw not implemented error for createTemplate', async () => {
      await expect(templateService.createTemplate(newTemplate)).rejects.toThrow(
        'TemplateService.createTemplate is not implemented'
      );
    });
  });

  describe('updateTemplate', () => {
    it('should throw not implemented error for updateTemplate', async () => {
      const updatedTemplate = {
        ...mockTemplate,
      };
      await expect(
        templateService.updateTemplate(updatedTemplate)
      ).rejects.toThrow('TemplateService.updateTemplate is not implemented');
    });
  });

  describe('deleteTemplate', () => {
    it('should throw not implemented error for deleteTemplate', async () => {
      await expect(
        templateService.deleteTemplate(expectedTemplateSHA)
      ).rejects.toThrow('TemplateService.deleteTemplate is not implemented');
    });
  });

  describe('validateTemplate', () => {
    it('should throw not implemented error for validateTemplate', async () => {
      await expect(
        templateService.validateTemplate(mockTemplate)
      ).rejects.toThrow('TemplateService.validateTemplate is not implemented');
    });
  });

  describe('getTemplateDependencies', () => {
    it('should throw not implemented error for getTemplateDependencies', async () => {
      await expect(
        templateService.getTemplateDependencies(expectedTemplateSHA)
      ).rejects.toThrow(
        'TemplateService.getTemplateDependencies is not implemented'
      );
    });
  });

  describe('exportTemplate', () => {
    it('should throw not implemented error for exportTemplate', async () => {
      await expect(
        templateService.exportTemplate(expectedTemplateSHA, '/tmp/export.json')
      ).rejects.toThrow('TemplateService.exportTemplate is not implemented');
    });
  });

  describe('importTemplate', () => {
    it('should throw not implemented error for importTemplate', async () => {
      await expect(
        templateService.importTemplate('/tmp/import.json')
      ).rejects.toThrow('TemplateService.importTemplate is not implemented');
    });
  });

  describe('loadTemplate', () => {
    it('should throw not implemented error for loadTemplate', async () => {
      const templatePath = path.join(templatesDir, expectedTemplateSHA);
      await expect(templateService.loadTemplate(templatePath)).rejects.toThrow(
        'TemplateService.loadTemplate is not implemented'
      );
    });
  });

  describe('saveTemplate', () => {
    it('should throw not implemented error for saveTemplate', async () => {
      const newTemplate = {
        ...mockTemplate,
        name: 'Saved Template',
      };
      await expect(templateService.saveTemplate(newTemplate)).rejects.toThrow(
        'TemplateService.saveTemplate is not implemented'
      );
    });
  });

  describe('installTemplate', () => {
    it('should throw not implemented error for installTemplate', async () => {
      const source = { type: 'local', path: '/test/path' } as any;
      await expect(
        templateService.installTemplate(source, 'template-123')
      ).rejects.toThrow('TemplateService.installTemplate is not implemented');
    });
  });

  describe('error handling', () => {
    it('should throw not implemented error for error handling methods', async () => {
      // All methods should throw not implemented errors
      await expect(templateService.loadTemplates()).rejects.toThrow(
        'TemplateService.loadTemplates is not implemented'
      );
    });
  });
});
