/**
 * Unit tests for ProjectManifestService
 */

import { ProjectManifestService } from '@/services/project-manifest.service';
import type { ProjectManifest } from '@/models';
import {
  FakeFileSystemService,
} from '@tests/fakes';

describe('ProjectManifestService', () => {
  let manifestService: ProjectManifestService;
  let fakeFileService: FakeFileSystemService;

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
    // Create fake services
    fakeFileService = new FakeFileSystemService();
    fakeFileService.reset();

    // Setup file system state
    fakeFileService.setFile('/test-project/.scaffold/manifest.json', JSON.stringify(mockManifest));
    fakeFileService.setFile('/parent-project/.scaffold/manifest.json', JSON.stringify(mockManifest));
    fakeFileService.setDirectory('/parent-project/child-directory');

    // Create service instance
    manifestService = new ProjectManifestService(fakeFileService);
  });

  describe('getProjectManifest', () => {

    it('should throw error for invalid project path', async () => {
      await expect(manifestService.getProjectManifest('')).rejects.toThrow(
        'Project path must be a non-empty string'
      );

      await expect(
        manifestService.getProjectManifest(null as any)
      ).rejects.toThrow('Project path must be a non-empty string');
    });

    it('should read manifest from direct path', async () => {
      const result = await manifestService.getProjectManifest('/test-project');

      expect(result).toEqual(mockManifest);
    });

    it('should search upward for nearest manifest when not found in direct path', async () => {
      // Remove manifest from child directory, only exists in parent
      await fakeFileService.deletePath('/parent-project/child-directory/.scaffold/manifest.json');

      const result = await manifestService.getProjectManifest(
        '/parent-project/child-directory'
      );

      expect(result).toEqual(mockManifest);
    });

    it('should return null when no manifest is found', async () => {
      await fakeFileService.deletePath('/test-project/.scaffold/manifest.json');

      const result = await manifestService.getProjectManifest('/test-project');

      expect(result).toBeNull();
    });

    it('should handle file service errors', async () => {
      fakeFileService.setError('Read error');

      await expect(
        manifestService.getProjectManifest('/test-project')
      ).rejects.toThrow('Failed to read project manifest');
    });
  });

  describe('loadProjectManifest', () => {
    it('should delegate to getProjectManifest', async () => {
      // File already set up in beforeEach
      const result = await manifestService.loadProjectManifest('/test-project');

      expect(result).toEqual(mockManifest);
    });
  });

  describe('saveProjectManifest', () => {
    it('should delegate to updateProjectManifest', async () => {
      // Clear the existing manifest to test creation
      await fakeFileService.deletePath('/test-project/.scaffold/manifest.json');

      await manifestService.saveProjectManifest('/test-project', mockManifest);

      // Verify the file was written
      const writtenContent = await fakeFileService.readFile('/test-project/.scaffold/manifest.json');
      expect(JSON.parse(writtenContent)).toEqual(mockManifest);
    });
  });

  describe('updateProjectManifest', () => {
    beforeEach(() => {
      // Reset fake file service state for each test
      fakeFileService.reset();
      fakeFileService.setDirectory('/test-project');
      fakeFileService.setDirectory('/parent-project');
      fakeFileService.setDirectory('/parent-project/child-directory');
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
      await manifestService.updateProjectManifest(
        '/test-project',
        mockManifest
      );

      // Verify the manifest was written
      const writtenContent = await fakeFileService.readFile('/test-project/.scaffold/manifest.json');
      expect(JSON.parse(writtenContent)).toEqual(mockManifest);
    });

    it('should use actual project path when manifest exists in parent', async () => {
      // Set up manifest only in parent
      fakeFileService.setFile('/parent-project/.scaffold/manifest.json', JSON.stringify(mockManifest));

      await manifestService.updateProjectManifest(
        '/parent-project/child-directory',
        mockManifest
      );

      // Verify the manifest was written to the parent location
      const writtenContent = await fakeFileService.readFile('/parent-project/.scaffold/manifest.json');
      expect(JSON.parse(writtenContent)).toEqual(mockManifest);
    });

    it('should handle file service errors', async () => {
      fakeFileService.setError('Write error');

      await expect(
        manifestService.updateProjectManifest('/test-project', mockManifest)
      ).rejects.toThrow('Failed to write project manifest');
    });
  });

  describe('findNearestManifest', () => {
    beforeEach(() => {
      // Reset state for each test
      fakeFileService.reset();
    });

    it('should find manifest in current directory', async () => {
      fakeFileService.setFile('/test-project/.scaffold/manifest.json', JSON.stringify(mockManifest));

      const result = await manifestService.findNearestManifest('/test-project');

      expect(result).toBeDefined();
      expect(result?.projectPath).toBe('/test-project');
      expect(result?.manifestPath).toBe(
        '/test-project/.scaffold/manifest.json'
      );
    });

    it('should find manifest in parent directory', async () => {
      // Only parent directory has manifest
      fakeFileService.setDirectory('/parent-project/child-directory');
      fakeFileService.setFile('/parent-project/.scaffold/manifest.json', JSON.stringify(mockManifest));

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
      fakeFileService.setDirectory('/test-project');
      // No manifest file set

      const result = await manifestService.findNearestManifest('/test-project');

      expect(result).toBeNull();
    });

    it('should limit search depth to prevent infinite loops', async () => {
      // Create deep directory structure without any manifest
      fakeFileService.setDirectory('/very/deep/nested/path/with/many/levels/that/go/deep/enough/to/hit/limit');

      const result = await manifestService.findNearestManifest(
        '/very/deep/nested/path/with/many/levels/that/go/deep/enough/to/hit/limit'
      );

      expect(result).toBeNull();
      // We can't directly test the call count with fakes, but we verify the behavior
    });

    it('should stop at root directory', async () => {
      fakeFileService.setDirectory('/');
      // No manifest at root

      const result = await manifestService.findNearestManifest('/');

      expect(result).toBeNull();
    });
  });
});
