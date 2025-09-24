/**
 * Unit tests for ProjectManifestService
 */

import mockFs from 'mock-fs';
import { ProjectManifestService } from '../../../src/services/project-manifest.service';
import type { IFileSystemService } from '../../../src/services/file-system.service';
import type { ProjectManifest } from '../../../src/models';
import {
  createMockImplementation,
  assertDefined,
} from '../../helpers/test-utils';

describe('ProjectManifestService', () => {
  let manifestService: ProjectManifestService;
  let mockFileService: jest.Mocked<IFileSystemService>;

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

    // Create service instance
    manifestService = new ProjectManifestService(mockFileService);

    // Setup mock-fs
    mockFs({
      '/test-project': {
        '.scaffold': {
          'manifest.json': JSON.stringify(mockManifest),
        },
      },
      '/parent-project': {
        '.scaffold': {
          'manifest.json': JSON.stringify(mockManifest),
        },
        'child-directory': {},
      },
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  describe('getProjectManifest', () => {
    beforeEach(() => {
      mockFileService.resolvePath.mockImplementation((...paths) =>
        paths.join('/')
      );
      mockFileService.readJson.mockResolvedValue(mockManifest);
    });

    it('should throw error for invalid project path', async () => {
      await expect(manifestService.getProjectManifest('')).rejects.toThrow(
        'Project path must be a non-empty string'
      );

      await expect(
        manifestService.getProjectManifest(null as any)
      ).rejects.toThrow('Project path must be a non-empty string');
    });

    it('should read manifest from direct path', async () => {
      mockFileService.exists.mockImplementation((path: string) => {
        return Promise.resolve(path.includes('manifest.json'));
      });

      const result = await manifestService.getProjectManifest('/test-project');

      expect(result).toEqual(mockManifest);
      expect(mockFileService.readJson).toHaveBeenCalledWith(
        '/test-project/.scaffold/manifest.json'
      );
    });

    it('should search upward for nearest manifest when not found in direct path', async () => {
      mockFileService.exists.mockImplementation((path: string) => {
        // Only parent directory has manifest
        return Promise.resolve(
          path === '/parent-project/.scaffold/manifest.json'
        );
      });

      const result = await manifestService.getProjectManifest(
        '/parent-project/child-directory'
      );

      expect(result).toEqual(mockManifest);
      expect(mockFileService.readJson).toHaveBeenCalledWith(
        '/parent-project/.scaffold/manifest.json'
      );
    });

    it('should return null when no manifest is found', async () => {
      mockFileService.exists.mockResolvedValue(false);

      const result = await manifestService.getProjectManifest('/test-project');

      expect(result).toBeNull();
    });

    it('should handle file service errors', async () => {
      mockFileService.exists.mockResolvedValue(true);
      mockFileService.readJson.mockRejectedValue(new Error('Read error'));

      await expect(
        manifestService.getProjectManifest('/test-project')
      ).rejects.toThrow('Failed to read project manifest');
    });
  });

  describe('loadProjectManifest', () => {
    it('should delegate to getProjectManifest', async () => {
      mockFileService.resolvePath.mockImplementation((...paths) =>
        paths.join('/')
      );
      mockFileService.exists.mockResolvedValue(true);
      mockFileService.readJson.mockResolvedValue(mockManifest);

      const result = await manifestService.loadProjectManifest('/test-project');

      expect(result).toEqual(mockManifest);
    });
  });

  describe('saveProjectManifest', () => {
    it('should delegate to updateProjectManifest', async () => {
      mockFileService.resolvePath.mockImplementation((...paths) =>
        paths.join('/')
      );
      mockFileService.exists.mockResolvedValue(false); // No existing manifest found
      mockFileService.writeJson.mockResolvedValue();

      await manifestService.saveProjectManifest('/test-project', mockManifest);

      expect(mockFileService.writeJson).toHaveBeenCalledWith(
        '/test-project/.scaffold/manifest.json',
        mockManifest,
        {
          spaces: 2,
          atomic: true,
          createParentDirs: true,
          overwrite: true,
        }
      );
    });
  });

  describe('updateProjectManifest', () => {
    beforeEach(() => {
      mockFileService.resolvePath.mockImplementation((...paths) =>
        paths.join('/')
      );
      mockFileService.writeJson.mockResolvedValue();
    });

    it('should throw error for invalid project path', async () => {
      await expect(
        manifestService.updateProjectManifest('', mockManifest)
      ).rejects.toThrow('Project path must be a non-empty string');

      await expect(
        manifestService.updateProjectManifest(null as any, mockManifest)
      ).rejects.toThrow('Project path must be a non-empty string');
    });

    it('should throw error for invalid manifest', async () => {
      await expect(
        manifestService.updateProjectManifest('/test-project', null as any)
      ).rejects.toThrow('Manifest must be a valid object');

      await expect(
        manifestService.updateProjectManifest('/test-project', undefined as any)
      ).rejects.toThrow('Manifest must be a valid object');
    });

    it('should write manifest to project directory', async () => {
      mockFileService.exists.mockResolvedValue(false); // No existing manifest found

      await manifestService.updateProjectManifest(
        '/test-project',
        mockManifest
      );

      expect(mockFileService.writeJson).toHaveBeenCalledWith(
        '/test-project/.scaffold/manifest.json',
        mockManifest,
        {
          spaces: 2,
          atomic: true,
          createParentDirs: true,
          overwrite: true,
        }
      );
    });

    it('should use actual project path when manifest exists in parent', async () => {
      mockFileService.exists.mockImplementation((path: string) => {
        return Promise.resolve(
          path === '/parent-project/.scaffold/manifest.json'
        );
      });

      await manifestService.updateProjectManifest(
        '/parent-project/child-directory',
        mockManifest
      );

      expect(mockFileService.writeJson).toHaveBeenCalledWith(
        '/parent-project/.scaffold/manifest.json',
        mockManifest,
        {
          spaces: 2,
          atomic: true,
          createParentDirs: true,
          overwrite: true,
        }
      );
    });

    it('should handle file service errors', async () => {
      mockFileService.exists.mockResolvedValue(false);
      mockFileService.writeJson.mockRejectedValue(new Error('Write error'));

      await expect(
        manifestService.updateProjectManifest('/test-project', mockManifest)
      ).rejects.toThrow('Failed to write project manifest');
    });

    it('should respect dry-run mode and not write files', async () => {
      Object.defineProperty(mockFileService, 'isDryRun', {
        value: true,
        writable: false,
        configurable: true,
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await manifestService.updateProjectManifest('/test-project', mockManifest);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[DRY RUN] Would update project manifest in: /test-project'
      );
      expect(mockFileService.writeJson).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should validate manifest structure before writing', async () => {
      mockFileService.exists.mockResolvedValue(false);
      mockFileService.ensureDirectory.mockResolvedValue();

      const invalidManifest = {
        ...mockManifest,
        version: undefined,
        projectName: undefined,
      };

      await expect(
        manifestService.updateProjectManifest('/test-project', invalidManifest as any)
      ).rejects.toThrow('Manifest missing required fields: version, projectName');

      expect(mockFileService.writeJson).not.toHaveBeenCalled();
    });

    it('should ensure scaffold directory exists before writing', async () => {
      mockFileService.exists.mockResolvedValue(false);
      mockFileService.ensureDirectory.mockResolvedValue();

      await manifestService.updateProjectManifest('/test-project', mockManifest);

      expect(mockFileService.ensureDirectory).toHaveBeenCalledWith(
        '/test-project/.scaffold'
      );
      expect(mockFileService.writeJson).toHaveBeenCalledWith(
        '/test-project/.scaffold/manifest.json',
        mockManifest,
        expect.objectContaining({
          overwrite: true,
        })
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

      const result = await manifestService.findNearestManifest('/test-project');

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
          path === '/parent-project/.scaffold/manifest.json'
        );
      });

      const result = await manifestService.findNearestManifest(
        '/parent-project/child-directory'
      );

      expect(result).toBeDefined();
      expect(result?.projectPath).toBe('/parent-project');
      expect(result?.manifestPath).toBe(
        '/parent-project/.scaffold/manifest.json'
      );
    });

    it('should return null when no manifest is found', async () => {
      mockFileService.exists.mockResolvedValue(false);

      const result = await manifestService.findNearestManifest('/test-project');

      expect(result).toBeNull();
    });

    it('should limit search depth to prevent infinite loops', async () => {
      mockFileService.exists.mockResolvedValue(false);
      mockFileService.resolvePath.mockImplementation((...paths) =>
        paths.join('/')
      );

      const result = await manifestService.findNearestManifest(
        '/very/deep/nested/path/with/many/levels/that/go/deep/enough/to/hit/limit'
      );

      expect(result).toBeNull();
      // Should have called exists up to maxLevels times (may be fewer if it reaches root)
      expect(mockFileService.exists.mock.calls.length).toBeLessThanOrEqual(20);
      expect(mockFileService.exists.mock.calls.length).toBeGreaterThan(10);
    });

    it('should stop at root directory', async () => {
      mockFileService.exists.mockResolvedValue(false);

      const result = await manifestService.findNearestManifest('/');

      expect(result).toBeNull();
      expect(mockFileService.exists).toHaveBeenCalledTimes(1);
    });
  });
});
