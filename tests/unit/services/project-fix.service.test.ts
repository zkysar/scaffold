/**
 * Unit tests for ProjectFixService
 */

import 'reflect-metadata';
import { DependencyContainer } from 'tsyringe';
import { ProjectFixService } from '@/services/project-fix.service';
import type { ProjectManifest } from '@/models';
import { createTestContainer } from '@tests/helpers/test-container';

describe('ProjectFixService', () => {
  let container: DependencyContainer;
  let service: ProjectFixService;

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
    service = container.resolve(ProjectFixService);
  });

  afterEach(() => {
    container.reset();
  });

  describe('method implementations', () => {
    it('should throw not implemented error for fixProject', async () => {
      await expect(service.fixProject('/test-project')).rejects.toThrow(
        'Method not implemented'
      );
    });
  });
});
