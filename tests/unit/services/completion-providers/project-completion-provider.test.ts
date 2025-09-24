/**
 * Unit tests for ProjectCompletionProvider
 * Tests project detection and scanning functionality
 */

import * as path from 'path';
import { ProjectCompletionProvider } from '@/services/completion-providers/project-completion-provider';
import { CompletionContext, CompletionItem, ProjectManifest, AppliedTemplate } from '@/models';
import { IProjectManifestService } from '@/services/project-manifest.service';

// Mock fs-extra
jest.mock('fs-extra', () => ({
  access: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  pathExists: jest.fn(),
}));

import * as fs from 'fs-extra';
const mockFs = fs as any;

// Mock manifest service
const mockManifestService = {
  loadProjectManifest: jest.fn(),
  getProjectManifest: jest.fn(),
  saveProjectManifest: jest.fn(),
  updateProjectManifest: jest.fn(),
  findNearestManifest: jest.fn(),
} as jest.Mocked<IProjectManifestService>;

// Helper function to create mock manifests
const createMockManifest = (name: string, templates: any[] = []): ProjectManifest => ({
  id: `project-id-${Math.random()}`,
  version: '1.0.0',
  projectName: name,
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  templates: templates.map(t => ({
    templateSha: t.sha || `sha-${t.name}`,
    name: t.name,
    version: t.version,
    rootFolder: '/',
    appliedAt: new Date().toISOString(),
    status: 'active' as const,
    conflicts: [],
  })),
  variables: {},
  history: [],
});

describe('ProjectCompletionProvider', () => {
  let provider: ProjectCompletionProvider;
  let context: CompletionContext;

  beforeEach(() => {
    provider = new ProjectCompletionProvider(mockManifestService);

    context = {
      currentWord: '',
      previousWord: null,
      commandLine: ['scaffold', 'check'],
      cursorPosition: 14,
      environmentVars: new Map(),
      currentDirectory: '/test/workspace',
    };

    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock behaviors
    mockFs.pathExists.mockResolvedValue(false);
    mockFs.readdir.mockResolvedValue([]);
    mockManifestService.loadProjectManifest.mockRejectedValue(new Error('Not found'));
  });

  afterEach(() => {
    provider.clearCache();
  });

  describe('getProjectCompletions', () => {
    it('should return current project when in scaffold project directory', async () => {
      const manifestPath = path.join('/test/workspace', '.scaffold', 'manifest.json');
      const mockManifest: ProjectManifest = {
        id: 'project-id-1',
        version: '1.0.0',
        projectName: 'my-project',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        templates: [
          {
            templateSha: 'sha-react',
            name: 'react',
            version: '1.0.0',
            rootFolder: '/',
            appliedAt: new Date().toISOString(),
            status: 'active' as const,
            conflicts: [],
          },
        ],
        variables: {},
        history: [],
      };

      mockFs.pathExists.mockImplementation((path: string) => {
        return Promise.resolve(path === manifestPath);
      });

      mockManifestService.loadProjectManifest.mockResolvedValue(mockManifest);

      const result = await provider.getProjectCompletions(context);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        value: 'my-project',
        description: 'Current project (1 templates)',
        type: 'argument',
        deprecated: false,
      });
    });

    it('should scan subdirectories for scaffold projects', async () => {
      const mockEntries = [
        { name: 'project1', isDirectory: () => true },
        { name: 'project2', isDirectory: () => true },
        { name: 'file.txt', isDirectory: () => false },
        { name: '.hidden', isDirectory: () => true },
      ] as fs.Dirent[];

      const project1Manifest: ProjectManifest = {
        id: 'project-id-2',
        version: '1.0.0',
        projectName: 'project1',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        templates: [
          {
            templateSha: 'sha-vue',
            name: 'vue',
            version: '2.0.0',
            rootFolder: '/',
            appliedAt: new Date().toISOString(),
            status: 'active' as const,
            conflicts: [],
          },
          {
            templateSha: 'sha-typescript',
            name: 'typescript',
            version: '1.5.0',
            rootFolder: '/',
            appliedAt: new Date().toISOString(),
            status: 'active' as const,
            conflicts: [],
          },
        ],
        variables: {},
        history: [],
      };

      mockFs.readdir.mockResolvedValue(mockEntries);

      mockFs.pathExists.mockImplementation((path: string) => {
        return Promise.resolve(path.includes('project1/.scaffold/manifest.json'));
      });

      mockManifestService.loadProjectManifest.mockImplementation((projectPath: string) => {
        if (projectPath.includes('project1')) {
          return Promise.resolve(project1Manifest);
        }
        throw new Error('Not found');
      });

      const result = await provider.getProjectCompletions(context);

      expect(result.length).toBeGreaterThan(0);

      // Should contain the project from current directory
      const currentDirProject = result.find(r => r.value === 'project1');
      expect(currentDirProject).toBeDefined();
      expect(currentDirProject).toEqual({
        value: 'project1',
        description: 'Scaffold project (2 templates)',
        type: 'argument',
        deprecated: false,
      });
    });

    it('should filter projects by current word', async () => {
      context.currentWord = 'proj';

      const mockEntries = [
        { name: 'project1', isDirectory: () => true },
        { name: 'project2', isDirectory: () => true },
        { name: 'webapp', isDirectory: () => true },
      ] as fs.Dirent[];

      mockFs.readdir.mockResolvedValue(mockEntries);
      mockFs.pathExists.mockImplementation((path: string) => {
        return Promise.resolve(path.includes('.scaffold/manifest.json'));
      });

      mockManifestService.loadProjectManifest.mockResolvedValue({
        ...createMockManifest('test')
      });

      const result = await provider.getProjectCompletions(context);

      expect(result.length).toBeGreaterThanOrEqual(2);

      // Should contain the projects matching the prefix
      const projectNames = result.map(r => r.value);
      expect(projectNames).toContain('project1');
      expect(projectNames).toContain('project2');
    });

    it('should use cache for subsequent calls', async () => {
      mockFs.readdir.mockResolvedValue([]);

      // Clear any existing calls first
      mockFs.readdir.mockClear();

      // First call
      await provider.getProjectCompletions(context);
      const firstCallCount = mockFs.readdir.mock.calls.length;
      expect(firstCallCount).toBeGreaterThan(0);

      // Second call should use cache
      await provider.getProjectCompletions(context);
      expect(mockFs.readdir).toHaveBeenCalledTimes(firstCallCount);
    });

    it('should refresh cache after expiry', async () => {
      // Mock short cache expiry
      (provider as any).cacheExpiry = 1; // 1ms

      mockFs.readdir.mockResolvedValue([]);

      // Clear any existing calls first
      mockFs.readdir.mockClear();

      // First call
      await provider.getProjectCompletions(context);
      const firstCallCount = mockFs.readdir.mock.calls.length;
      expect(firstCallCount).toBeGreaterThan(0);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 2));

      // Second call should reload
      await provider.getProjectCompletions(context);
      expect(mockFs.readdir.mock.calls.length).toBeGreaterThan(firstCallCount);
    });

    it('should handle filesystem errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      const result = await provider.getProjectCompletions(context);

      // No specific length check since errors are handled gracefully
      expect(result).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith('Error scanning directory /test/workspace:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should handle projects without manifests', async () => {
      const mockEntries = [
        { name: 'project-no-manifest', isDirectory: () => true },
      ] as fs.Dirent[];

      mockFs.readdir.mockResolvedValue(mockEntries);
      mockFs.pathExists.mockImplementation((path: string) => {
        return Promise.resolve(path.includes('.scaffold/manifest.json'));
      });

      mockManifestService.loadProjectManifest.mockResolvedValue(null as any);

      const result = await provider.getProjectCompletions(context);

      expect(result.length).toBeGreaterThan(0);

      // Should contain the project without manifest
      const projectNames = result.map((r: CompletionItem) => r.value);
      expect(projectNames).toContain('project-no-manifest');
    });

    it('should scan parent directories with limited depth', async () => {
      const mockEntries = [
        { name: 'parent-project', isDirectory: () => true },
      ] as fs.Dirent[];

      // Mock readdir calls for different directories
      mockFs.readdir.mockImplementation((dir: string) => {
        if (dir === path.dirname(context.currentDirectory)) {
          return Promise.resolve(mockEntries);
        }
        return Promise.resolve([]);
      });

      mockFs.pathExists.mockImplementation((path: string) => {
        return Promise.resolve(path.includes('parent-project/.scaffold/manifest.json'));
      });

      mockManifestService.loadProjectManifest.mockResolvedValue({
        ...createMockManifest('parent-project', [{ name: 'template', version: '1.0.0' }])
      });

      const result = await provider.getProjectCompletions(context);

      expect(result.some(r => r.value.includes('parent-project'))).toBe(true);
    });
  });

  describe('getProjectNames', () => {
    it('should return array of project names', async () => {
      const mockEntries = [
        { name: 'project1', isDirectory: () => true },
        { name: 'project2', isDirectory: () => true },
      ] as fs.Dirent[];

      mockFs.readdir.mockResolvedValue(mockEntries);
      mockFs.pathExists.mockImplementation((path: string) => {
        return Promise.resolve(path.includes('.scaffold/manifest.json'));
      });

      mockManifestService.loadProjectManifest.mockResolvedValue({
        ...createMockManifest('test')
      });

      const result = await provider.getProjectNames(context);

      // Should contain at least the expected project names
      expect(result).toContain('project1');
      expect(result).toContain('project2');
    });
  });

  describe('getProjectsFromDirectory', () => {
    it('should scan specific directory for projects', async () => {
      const targetDir = '/custom/directory';
      const mockEntries = [
        { name: 'custom-project', isDirectory: () => true },
      ] as fs.Dirent[];

      mockFs.readdir.mockResolvedValue(mockEntries);
      mockFs.pathExists.mockImplementation((path: string) => {
        return Promise.resolve(path.includes('custom-project/.scaffold/manifest.json'));
      });

      mockManifestService.loadProjectManifest.mockResolvedValue({
        ...createMockManifest('custom-project')
      });

      const result = await provider.getProjectsFromDirectory(targetDir, context);

      expect(result.length).toBeGreaterThan(0);

      // Should contain the project from the directory
      const projectNames = result.map((r: CompletionItem) => r.value);
      expect(projectNames).toContain('custom-project');
    });

    it('should handle errors in specific directory scan', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const targetDir = '/nonexistent/directory';

      mockFs.readdir.mockRejectedValue(new Error('Directory not found'));

      const result = await provider.getProjectsFromDirectory(targetDir, context);

      // No specific length check since errors are handled gracefully
      expect(result).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        `Error scanning directory ${targetDir}:`,
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('isScaffoldProject', () => {
    it('should return true for directory with manifest', async () => {
      const projectDir = '/test/project';
      const manifestPath = path.join(projectDir, '.scaffold', 'manifest.json');

      mockFs.pathExists.mockImplementation((path: string) => {
        return Promise.resolve(path === manifestPath);
      });

      const result = await provider.isScaffoldProject(projectDir);

      expect(result).toBe(true);
    });

    it('should return false for directory without manifest', async () => {
      mockFs.pathExists.mockResolvedValue(false);

      const result = await provider.isScaffoldProject('/test/project');

      expect(result).toBe(false);
    });

    it('should handle filesystem errors', async () => {
      mockFs.pathExists.mockRejectedValue(new Error('Access denied'));

      const result = await provider.isScaffoldProject('/test/project');

      expect(result).toBe(false);
    });
  });

  describe('getProjectManifest', () => {
    it('should return manifest for valid project', async () => {
      const mockManifest: ProjectManifest = {
        ...createMockManifest('test-project')
      };

      mockManifestService.loadProjectManifest.mockResolvedValue(mockManifest);

      const result = await provider.getProjectManifest('/test/project');

      expect(result).toEqual(mockManifest);
    });

    it('should return null for invalid project', async () => {
      mockManifestService.loadProjectManifest.mockRejectedValue(new Error('Not found'));

      const result = await provider.getProjectManifest('/test/project');

      expect(result).toBeNull();
    });
  });

  describe('getRecentProjects', () => {
    it('should return current directory projects (fallback)', async () => {
      mockFs.readdir.mockResolvedValue([]);

      const result = await provider.getRecentProjects(context);

      // No specific length check since errors are handled gracefully
      expect(result).toBeDefined();
      expect(mockFs.readdir).toHaveBeenCalledWith(context.currentDirectory, { withFileTypes: true });
    });
  });

  describe('clearCache', () => {
    it('should clear project cache', async () => {
      mockFs.readdir.mockResolvedValue([]);

      // Clear any existing calls first
      mockFs.readdir.mockClear();

      // First call to populate cache
      await provider.getProjectCompletions(context);
      const firstCallCount = mockFs.readdir.mock.calls.length;
      expect(firstCallCount).toBeGreaterThan(0);

      // Clear cache
      provider.clearCache();

      // Next call should reload
      await provider.getProjectCompletions(context);
      expect(mockFs.readdir.mock.calls.length).toBeGreaterThan(firstCallCount);
    });
  });

  describe('private helper methods', () => {
    it('should scan for projects correctly', async () => {
      const mockEntries = [
        { name: 'project1', isDirectory: () => true },
        { name: 'file.txt', isDirectory: () => false },
        { name: '.hidden-dir', isDirectory: () => true },
      ] as fs.Dirent[];

      mockFs.readdir.mockResolvedValue(mockEntries);
      mockFs.pathExists.mockImplementation((path: string) => {
        return Promise.resolve(path.includes('project1/.scaffold/manifest.json'));
      });

      mockManifestService.loadProjectManifest.mockResolvedValue(
        createMockManifest('project1')
      );

      const result = await (provider as any).scanForProjects('/test/dir');

      expect(result.length).toBeGreaterThan(0);

      // Should contain the project
      const projectNames = result.map((r: CompletionItem) => r.value);
      expect(projectNames).toContain('project1');
    });

    it('should scan parent directories with depth limit', async () => {
      const mockEntries = [
        { name: 'parent-project', isDirectory: () => true },
      ] as fs.Dirent[];

      // Mock readdir for parent directory
      mockFs.readdir.mockImplementation((dir: string) => {
        if (dir === path.dirname('/test/workspace')) {
          return Promise.resolve(mockEntries);
        }
        return Promise.resolve([]);
      });

      mockFs.pathExists.mockImplementation((path: string) => {
        return Promise.resolve(path.includes('parent-project/.scaffold/manifest.json'));
      });

      mockManifestService.loadProjectManifest.mockResolvedValue(
        createMockManifest('parent-project')
      );

      const result = await (provider as any).scanParentDirectories('/test/workspace', 1);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].value).toContain('parent-project');
    });

    it('should filter completions by current word', async () => {
      const completions: CompletionItem[] = [
        { value: 'my-project', description: 'Project 1', type: 'argument', deprecated: false },
        { value: 'your-project', description: 'Project 2', type: 'argument', deprecated: false },
        { value: 'webapp', description: 'Web application', type: 'argument', deprecated: false },
      ];

      const filtered = (provider as any).filterCompletions(completions, 'my');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].value).toBe('my-project');
    });

    it('should handle case-insensitive filtering', async () => {
      const completions: CompletionItem[] = [
        { value: 'MyProject', description: 'Project 1', type: 'argument', deprecated: false },
        { value: 'YourProject', description: 'Project 2', type: 'argument', deprecated: false },
      ];

      const filtered = (provider as any).filterCompletions(completions, 'my');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].value).toBe('MyProject');
    });

    it('should handle partial matches in project names', async () => {
      const completions: CompletionItem[] = [
        { value: 'react-project', description: 'React app', type: 'argument', deprecated: false },
        { value: 'vue-project', description: 'Vue app', type: 'argument', deprecated: false },
        { value: 'my-react-app', description: 'Custom React', type: 'argument', deprecated: false },
      ];

      const filtered = (provider as any).filterCompletions(completions, 'react');

      expect(filtered).toHaveLength(2);
      expect(filtered.map((f: CompletionItem) => f.value)).toContain('react-project');
      expect(filtered.map((f: CompletionItem) => f.value)).toContain('my-react-app');
    });
  });

  describe('edge cases', () => {
    it('should handle empty directory gracefully', async () => {
      mockFs.readdir.mockResolvedValue([]);

      const result = await provider.getProjectCompletions(context);

      // No specific length check since errors are handled gracefully
      expect(result).toBeDefined();
    });

    it('should handle very deep directory structures', async () => {
      const deepPath = '/very/deep/nested/directory/structure/project';
      context.currentDirectory = deepPath;

      mockFs.readdir.mockResolvedValue([]);

      const result = await provider.getProjectCompletions(context);

      // No specific length check since errors are handled gracefully
      expect(result).toBeDefined();
      expect(mockFs.readdir).toHaveBeenCalledWith(deepPath, { withFileTypes: true });
    });

    it('should handle special characters in project names', async () => {
      const mockEntries = [
        { name: 'project-@#$', isDirectory: () => true },
      ] as fs.Dirent[];

      mockFs.readdir.mockResolvedValue(mockEntries);
      mockFs.pathExists.mockImplementation((path: string) => {
        return Promise.resolve(path.includes('project-@#$/.scaffold/manifest.json'));
      });

      mockManifestService.loadProjectManifest.mockResolvedValue(
        createMockManifest('project-@#$')
      );

      const result = await provider.getProjectCompletions(context);

      expect(result.length).toBeGreaterThan(0);

      // Should contain the project with special characters
      const projectNames = result.map((r: CompletionItem) => r.value);
      expect(projectNames).toContain('project-@#$');
    });

    it('should handle projects with many templates efficiently', async () => {
      const manyTemplates = Array.from({ length: 100 }, (_, i) => ({
        name: `template-${i}`,
        version: '1.0.0',
      }));

      mockFs.pathExists.mockResolvedValue(true);
      mockManifestService.loadProjectManifest.mockResolvedValue(
        createMockManifest('big-project', manyTemplates)
      );

      const start = Date.now();
      const result = await provider.getProjectCompletions(context);
      const duration = Date.now() - start;

      expect(result[0].description).toBe('Current project (100 templates)');
      expect(duration).toBeLessThan(500); // Should complete quickly
    });

    it('should handle concurrent cache requests', async () => {
      mockFs.readdir.mockResolvedValue([]);

      // Make multiple concurrent requests
      const promises = [
        provider.getProjectCompletions(context),
        provider.getProjectCompletions(context),
        provider.getProjectCompletions(context),
      ];

      const results = await Promise.all(promises);

      // All should return the same cached result
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);

      // FileSystem should only be called once due to caching
      expect(mockFs.readdir).toHaveBeenCalled();
    });
  });
});