/**
 * Unit tests for ProjectExtensionService
 */

import 'reflect-metadata';
import { DependencyContainer } from 'tsyringe';
import { ProjectExtensionService } from '@/services/project-extension.service';
import type { ProjectManifest } from '@/models';
import { createTestContainer } from '@tests/helpers/test-container';

describe('ProjectExtensionService', () => {
  let container: DependencyContainer;
  let service: ProjectExtensionService;

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
    service = container.resolve(ProjectExtensionService);
  });

  afterEach(() => {
    container.reset();
  });

  describe('method implementations', () => {
    it('should throw not implemented error for extendProject', async () => {
      await expect(
        service.extendProject('/test-project', ['template-123'])
      ).rejects.toThrow('Method not implemented');
    });
  });
});
