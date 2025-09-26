/**
 * Unit tests for ProjectManifestService
 */

import 'reflect-metadata';
import { DependencyContainer } from 'tsyringe';
import { ProjectManifestService } from '@/services/project-manifest.service';
import type { ProjectManifest } from '@/models';
import { createTestContainer } from '@tests/helpers/test-container';

describe('ProjectManifestService', () => {
  let container: DependencyContainer;
  let service: ProjectManifestService;

  const mockManifest: ProjectManifest = {
    id: 'project-123',
    version: '1.0.0',
    projectName: 'Test Project',
    created: '2023-01-01T00:00:00.000Z',
    updated: '2023-01-01T00:00:00.000Z',
    templates: [],
    variables: {},
    history: [],
  };

  beforeEach(() => {
    container = createTestContainer();
    service = container.resolve(ProjectManifestService);
  });

  afterEach(() => {
    container.reset();
  });

  describe('method implementations', () => {
    it('should throw not implemented error for getProjectManifest', async () => {
      await expect(service.getProjectManifest('/test-project')).rejects.toThrow(
        'Method not implemented'
      );
    });

    it('should throw not implemented error for loadProjectManifest', async () => {
      await expect(
        service.loadProjectManifest('/test-project')
      ).rejects.toThrow('Method not implemented');
    });

    it('should throw not implemented error for saveProjectManifest', async () => {
      await expect(
        service.saveProjectManifest('/test-project', mockManifest)
      ).rejects.toThrow('Method not implemented');
    });

    it('should throw not implemented error for updateProjectManifest', async () => {
      await expect(
        service.updateProjectManifest('/test-project', mockManifest)
      ).rejects.toThrow('Method not implemented');
    });

    it('should throw not implemented error for findNearestManifest', async () => {
      await expect(
        service.findNearestManifest('/test-project')
      ).rejects.toThrow('Method not implemented');
    });
  });
});
