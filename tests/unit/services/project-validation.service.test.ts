/**
 * Unit tests for ProjectValidationService
 */

import 'reflect-metadata';
import { DependencyContainer } from 'tsyringe';
import { ProjectValidationService } from '@/services/project-validation.service';
import type { ProjectManifest } from '@/models';
import { createTestContainer } from '@tests/helpers/test-container';

describe('ProjectValidationService', () => {
  let container: DependencyContainer;
  let service: ProjectValidationService;

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
    service = container.resolve(ProjectValidationService);
  });

  afterEach(() => {
    container.reset();
  });

  describe('method implementations', () => {
    it('should throw not implemented error for validateProject', async () => {
      await expect(service.validateProject('/test-project')).rejects.toThrow(
        'Method not implemented'
      );
    });

    it('should throw not implemented error for findNearestManifest', async () => {
      await expect(
        service.findNearestManifest('/test-project')
      ).rejects.toThrow('Method not implemented');
    });
  });
});
