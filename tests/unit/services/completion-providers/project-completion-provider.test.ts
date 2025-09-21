/**
 * Unit tests for ProjectCompletionProvider
 * Tests project detection and scanning functionality
 */

import * as path from 'path';
import { ProjectCompletionProvider } from '@/services/completion-providers/project-completion-provider';
import { CompletionContext, CompletionItem, ProjectManifest, AppliedTemplate } from '@/models';
import { IProjectService } from '@/services/project-service';

// Mock fs-extra
jest.mock('fs-extra');
import * as fs from 'fs-extra';
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock project service
const mockProjectService = {
  createProject: jest.fn(),
  validateProject: jest.fn(),
  fixProject: jest.fn(),
  extendProject: jest.fn(),
  loadProjectManifest: jest.fn(),
  saveProjectManifest: jest.fn(),
  updateProjectManifest: jest.fn(),
  getProjectStatus: jest.fn(),
  listProjects: jest.fn(),
} as jest.Mocked<IProjectService>;

describe('ProjectCompletionProvider', () => {
  let provider: ProjectCompletionProvider;
  let context: CompletionContext;

  beforeEach(() => {
    provider = new ProjectCompletionProvider(mockProjectService);

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
    mockProjectService.loadProjectManifest.mockRejectedValue(new Error('Not found'));
  });

  afterEach(() => {
    provider.clearCache();
  });

  describe('getProjectCompletions', () => {
    it('should return current project when in scaffold project directory', async () => {
      const manifestPath = path.join('/test/workspace', '.scaffold', 'manifest.json');
      const mockManifest: ProjectManifest = {
        version: '1.0.0',
        projectName: 'my-project',
        templates: [
          { id: 'react', version: '1.0.0', appliedAt: new Date(), variables: {} },
        ] as AppliedTemplate[],
        variables: {},
        history: [],
      };

      mockFs.pathExists.mockImplementation((path: string) => {
        return Promise.resolve(path === manifestPath);
      });

      mockProjectService.loadProjectManifest.mockResolvedValue(mockManifest);

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
        version: '1.0.0',
        projectName: 'project1',
        templates: [
          { id: 'vue', version: '2.0.0', appliedAt: new Date(), variables: {} },
          { id: 'typescript', version: '1.5.0', appliedAt: new Date(), variables: {} },
        ] as AppliedTemplate[],
        variables: {},
        history: [],
      };

      mockFs.readdir.mockResolvedValue(mockEntries);

      mockFs.pathExists.mockImplementation((path: string) => {
        return Promise.resolve(path.includes('project1/.scaffold/manifest.json'));
      });

      mockProjectService.loadProjectManifest.mockImplementation((projectPath: string) => {
        if (projectPath.includes('project1')) {
          return Promise.resolve(project1Manifest);
        }
        throw new Error('Not found');
      });

      const result = await provider.getProjectCompletions(context);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
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

      mockProjectService.loadProjectManifest.mockResolvedValue({
        version: '1.0.0',
        projectName: 'test',
        templates: [],
        variables: {},
        history: [],
      });

      const result = await provider.getProjectCompletions(context);

      expect(result).toHaveLength(2);
      expect(result.map(r => r.value)).toEqual(['project1', 'project2']);
    });

    it('should use cache for subsequent calls', async () => {
      mockFs.readdir.mockResolvedValue([]);

      // First call
      await provider.getProjectCompletions(context);
      expect(mockFs.readdir).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await provider.getProjectCompletions(context);
      expect(mockFs.readdir).toHaveBeenCalledTimes(1);
    });

    it('should refresh cache after expiry', async () => {
      // Mock short cache expiry
      (provider as any).cacheExpiry = 1; // 1ms

      mockFs.readdir.mockResolvedValue([]);

      // First call
      await provider.getProjectCompletions(context);
      expect(mockFs.readdir).toHaveBeenCalledTimes(1);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 2));

      // Second call should reload
      await provider.getProjectCompletions(context);
      expect(mockFs.readdir).toHaveBeenCalledTimes(2);
    });

    it('should handle filesystem errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      const result = await provider.getProjectCompletions(context);

      expect(result).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to scan for projects:', expect.any(Error));

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

      mockProjectService.loadProjectManifest.mockResolvedValue(null as any);

      const result = await provider.getProjectCompletions(context);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        value: 'project-no-manifest',
        description: 'Scaffold project',
        type: 'argument',
        deprecated: false,
      });
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

      mockProjectService.loadProjectManifest.mockResolvedValue({
        version: '1.0.0',
        projectName: 'parent-project',
        templates: [{ id: 'template', version: '1.0.0', appliedAt: new Date(), variables: {} }] as AppliedTemplate[],
        variables: {},
        history: [],
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

      mockProjectService.loadProjectManifest.mockResolvedValue({
        version: '1.0.0',
        projectName: 'test',
        templates: [],
        variables: {},
        history: [],
      });

      const result = await provider.getProjectNames(context);

      expect(result).toEqual(['project1', 'project2']);
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

      mockProjectService.loadProjectManifest.mockResolvedValue({
        version: '1.0.0',
        projectName: 'custom-project',
        templates: [],
        variables: {},
        history: [],
      });

      const result = await provider.getProjectsFromDirectory(targetDir, context);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('custom-project');
    });

    it('should handle errors in specific directory scan', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const targetDir = '/nonexistent/directory';

      mockFs.readdir.mockRejectedValue(new Error('Directory not found'));

      const result = await provider.getProjectsFromDirectory(targetDir, context);

      expect(result).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        `Failed to scan directory ${targetDir} for projects:`,
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
        version: '1.0.0',
        projectName: 'test-project',
        templates: [],
        variables: {},
        history: [],
      };

      mockProjectService.loadProjectManifest.mockResolvedValue(mockManifest);

      const result = await provider.getProjectManifest('/test/project');

      expect(result).toEqual(mockManifest);
    });

    it('should return null for invalid project', async () => {
      mockProjectService.loadProjectManifest.mockRejectedValue(new Error('Not found'));

      const result = await provider.getProjectManifest('/test/project');

      expect(result).toBeNull();
    });
  });

  describe('getRecentProjects', () => {
    it('should return current directory projects (fallback)', async () => {
      mockFs.readdir.mockResolvedValue([]);

      const result = await provider.getRecentProjects(context);

      expect(result).toHaveLength(0);
      expect(mockFs.readdir).toHaveBeenCalledWith(context.currentDirectory, { withFileTypes: true });
    });
  });

  describe('clearCache', () => {
    it('should clear project cache', async () => {
      mockFs.readdir.mockResolvedValue([]);

      // First call to populate cache
      await provider.getProjectCompletions(context);
      expect(mockFs.readdir).toHaveBeenCalledTimes(1);

      // Clear cache
      provider.clearCache();

      // Next call should reload
      await provider.getProjectCompletions(context);
      expect(mockFs.readdir).toHaveBeenCalledTimes(2);
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

      mockProjectService.loadProjectManifest.mockResolvedValue({
        version: '1.0.0',
        projectName: 'project1',
        templates: [],
        variables: {},
        history: [],
      });

      const result = await (provider as any).scanForProjects('/test/dir');

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('project1');
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

      mockProjectService.loadProjectManifest.mockResolvedValue({
        version: '1.0.0',
        projectName: 'parent-project',
        templates: [],
        variables: {},
        history: [],
      });

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
      expect(filtered.map(f => f.value)).toContain('react-project');
      expect(filtered.map(f => f.value)).toContain('my-react-app');
    });
  });

  describe('edge cases', () => {
    it('should handle empty directory gracefully', async () => {
      mockFs.readdir.mockResolvedValue([]);

      const result = await provider.getProjectCompletions(context);

      expect(result).toHaveLength(0);
    });

    it('should handle very deep directory structures', async () => {
      const deepPath = '/very/deep/nested/directory/structure/project';
      context.currentDirectory = deepPath;

      mockFs.readdir.mockResolvedValue([]);

      const result = await provider.getProjectCompletions(context);

      expect(result).toHaveLength(0);
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

      mockProjectService.loadProjectManifest.mockResolvedValue({
        version: '1.0.0',
        projectName: 'project-@#$',
        templates: [],
        variables: {},
        history: [],
      });

      const result = await provider.getProjectCompletions(context);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('project-@#$');
    });

    it('should handle projects with many templates efficiently', async () => {
      const manyTemplates = Array.from({ length: 100 }, (_, i) => ({
        id: `template-${i}`,
        version: '1.0.0',
        appliedAt: new Date(),
        variables: {},
      })) as AppliedTemplate[];

      mockFs.pathExists.mockResolvedValue(true);
      mockProjectService.loadProjectManifest.mockResolvedValue({
        version: '1.0.0',
        projectName: 'big-project',
        templates: manyTemplates,
        variables: {},
        history: [],
      });

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
      expect(mockFs.readdir).toHaveBeenCalledTimes(1);
    });
  });
});