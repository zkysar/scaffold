/**
 * Example test showing how to use the fake services
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  FakeTemplateService,
  FakeProjectCreationService,
  FakeProjectValidationService,
  FakeFileSystemService,
  createAllFakes,
  resetAllFakes,
} from './index';

describe('Fake Services Usage Examples', () => {
  describe('FakeTemplateService', () => {
    let templateService: FakeTemplateService;

    beforeEach(() => {
      templateService = new FakeTemplateService();
      templateService.reset();
    });

    it('should return stored templates', async () => {
      // Arrange
      const template = {
        id: 'abc123',
        name: 'Test Template',
        version: '1.0.0',
        description: 'A test template',
        rootFolder: '.',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        folders: [],
        files: [],
        variables: [],
        rules: {
          strictMode: false,
          allowExtraFiles: true,
          allowExtraFolders: true,
          conflictResolution: 'skip' as const,
          excludePatterns: [],
          rules: [],
        },
      };

      templateService.addTemplate(template);

      // Act
      const retrieved = await templateService.getTemplate('abc123');

      // Assert
      expect(retrieved.name).toBe('Test Template');
    });

    it('should simulate errors when configured', async () => {
      // Arrange
      templateService.setError('Template not found');

      // Act & Assert
      await expect(templateService.getTemplate('any')).rejects.toThrow('Template not found');
    });

    it('should return custom values when configured', async () => {
      // Arrange
      const customTemplate = { id: 'custom', name: 'Custom' };
      templateService.setReturnValue(customTemplate);

      // Act
      const result = await templateService.getTemplate('any');

      // Assert
      expect(result).toEqual(customTemplate);
    });
  });

  describe('FakeFileSystemService', () => {
    let fileSystem: FakeFileSystemService;

    beforeEach(() => {
      fileSystem = new FakeFileSystemService();
      fileSystem.reset();
    });

    it('should simulate file operations', async () => {
      // Arrange
      fileSystem.setFile('/test/file.txt', 'Hello World');

      // Act
      const content = await fileSystem.readFile('/test/file.txt');
      const exists = await fileSystem.exists('/test/file.txt');
      const isFile = await fileSystem.isFile('/test/file.txt');

      // Assert
      expect(content).toBe('Hello World');
      expect(exists).toBe(true);
      expect(isFile).toBe(true);
    });

    it('should handle directory operations', async () => {
      // Arrange
      fileSystem.setFile('/project/src/index.ts', 'export {}');
      fileSystem.setFile('/project/src/utils.ts', 'export {}');
      fileSystem.setDirectory('/project/tests');

      // Act
      const files = await fileSystem.readDirectory('/project/src');
      const isDir = await fileSystem.isDirectory('/project/tests');

      // Assert
      expect(files).toContain('index.ts');
      expect(files).toContain('utils.ts');
      expect(isDir).toBe(true);
    });
  });

  describe('Integration with multiple fakes', () => {
    let fakes: ReturnType<typeof createAllFakes>;

    beforeEach(() => {
      fakes = createAllFakes();
      resetAllFakes(fakes);
    });

    it('should work together for project creation', async () => {
      // Arrange
      const template = {
        id: 'template-1',
        name: 'React App',
        version: '1.0.0',
        description: 'React application template',
        rootFolder: '.',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        folders: [{ path: 'src' }, { path: 'public' }],
        files: [
          { path: 'src/index.tsx', content: 'import React from "react";' },
          { path: 'package.json', content: '{"name": "${PROJECT_NAME}"}' },
        ],
        variables: [
          { name: 'PROJECT_NAME', description: 'Project name', required: true },
        ],
        rules: {
          strictMode: false,
          allowExtraFiles: true,
          allowExtraFolders: true,
          conflictResolution: 'skip' as const,
          excludePatterns: [],
          rules: [],
        },
      };

      fakes.templateService.addTemplate(template);
      fakes.variableSubstitutionService.setSubstitutionRule('PROJECT_NAME', 'my-app');

      // Act
      const manifest = await fakes.projectCreationService.createProject(
        'my-app',
        ['template-1'],
        '/projects/my-app',
        { PROJECT_NAME: 'my-app' }
      );

      // Assert
      expect(manifest.projectName).toBe('my-app');
      expect(manifest.templates).toHaveLength(1);
      expect(manifest.templates[0].templateId).toBe('template-1');
    });

    it('should validate and fix projects', async () => {
      // Arrange - Set up validation report
      const validationReport = {
        id: 'val-1',
        timestamp: new Date().toISOString(),
        projectPath: '/projects/test',
        valid: false,
        errors: [
          {
            path: 'package.json',
            message: 'Missing required file',
            rule: 'required-file',
            severity: 'error' as const,
            autoFixable: true,
          },
        ],
        warnings: [],
        stats: {
          totalChecks: 10,
          passedChecks: 9,
          failedChecks: 1,
          warnings: 0,
          duration: 100,
        },
        checkedTemplates: [],
      };

      fakes.projectValidationService.setValidationReport('/projects/test', validationReport);

      // Act - Validate project
      const report = await fakes.projectValidationService.validateProject('/projects/test');

      // Assert validation
      expect(report.valid).toBe(false);
      expect(report.errors).toHaveLength(1);

      // Act - Fix project
      const fixReport = await fakes.projectFixService.fixProject(
        '/projects/test',
        report,
        true // auto-only
      );

      // Assert fix
      expect(fixReport.fixes).toHaveLength(1);
      expect(fixReport.stats.fixedIssues).toBe(1);
    });
  });
});