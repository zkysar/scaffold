/**
 * Unit tests for ProjectCreationService
 */

import 'reflect-metadata';
import { DependencyContainer } from 'tsyringe';
import { ProjectCreationService } from '@/services/project-creation.service';
import { createTestContainer } from '@tests/helpers/test-container';

describe('ProjectCreationService', () => {
  let container: DependencyContainer;
  let service: ProjectCreationService;

  beforeEach(() => {
    container = createTestContainer();
    service = container.resolve(ProjectCreationService);
  });

  afterEach(() => {
    container.reset();
  });

  describe('method implementations', () => {
    it('should throw not implemented error for createProject', async () => {
      await expect(
        service.createProject('TestProject', ['template-123'], '/test-path')
      ).rejects.toThrow('Method not implemented');
    });

    it('should throw not implemented error for initializeProjectManifest', () => {
      expect(() =>
        service.initializeProjectManifest('TestProject', 'template-123')
      ).toThrow('Method not implemented');
    });

    it('should throw not implemented error for ensureProjectDirectory', async () => {
      await expect(
        service.ensureProjectDirectory('/test-path')
      ).rejects.toThrow('Method not implemented');
    });
  });
});
