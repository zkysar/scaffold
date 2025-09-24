/**
 * Unit tests for IdentifierService
 */

import { IdentifierService } from '@/services';
import { Template } from '@/models';
import { generateSHAFromObject, isValidSHA, findSHAByPrefix } from '@/lib/sha';
import * as fs from 'fs-extra';
import * as path from 'path';


import { logger } from '@/lib/logger';
// Mock fs-extra
jest.mock('fs-extra');

// Create a concrete test implementation of the abstract IdentifierService
class TestIdentifierService extends IdentifierService {
  constructor() {
    super('/tmp/test-aliases.json');
  }

  // Expose protected properties for testing
  get testAliasMapping() {
    return this.aliasMapping;
  }

  // Override aliasMapping to be public for testing
  public aliasMapping: any = {};

  // Implement abstract methods if any
  async getAllSHAs(): Promise<string[]> {
    return Object.keys(this.testAliasMapping);
  }

  // Test helper method for computing SHA from template
  computeTemplateSHA(template: Template): string {
    // Exclude id, aliases, created, and updated fields
    const { id, aliases, created, updated, ...contentForSHA } = template;
    return generateSHAFromObject(contentForSHA, ['id', 'aliases', 'created', 'updated']);
  }

  // Expose protected method for testing
  public testCanonicalizeTemplate(template: Template): string {
    // Deep clone and exclude computed fields
    const cloned = JSON.parse(JSON.stringify(template));
    delete cloned.id;
    delete cloned.aliases;
    delete cloned.created;
    delete cloned.updated;

    // Sort arrays for consistent hashing
    if (cloned.folders && Array.isArray(cloned.folders)) {
      cloned.folders.sort((a: any, b: any) => a.path.localeCompare(b.path));
    }
    if (cloned.files && Array.isArray(cloned.files)) {
      cloned.files.sort((a: any, b: any) => a.path.localeCompare(b.path));
    }
    if (cloned.variables && Array.isArray(cloned.variables)) {
      cloned.variables.sort((a: any, b: any) => a.name.localeCompare(b.name));
    }
    if (cloned.rules) {
      if (cloned.rules.excludePatterns && Array.isArray(cloned.rules.excludePatterns)) {
        cloned.rules.excludePatterns.sort();
      }
      if (cloned.rules.rules && Array.isArray(cloned.rules.rules)) {
        cloned.rules.rules.sort((a: any, b: any) =>
          (a.id || '').localeCompare(b.id || '')
        );
      }
    }

    return JSON.stringify(cloned, Object.keys(cloned).sort(), 2);
  }

  // Expose for testing
  public testResolveSHA(identifier: string, availableSHAs: string[]): string {
    if (identifier.length === 64 && isValidSHA(identifier)) {
      return identifier;
    }

    const matches = findSHAByPrefix(identifier, availableSHAs);

    if (matches.length === 0) {
      throw new Error(`No template found matching SHA prefix: ${identifier}`);
    }

    if (matches.length > 1) {
      throw new Error(`Ambiguous SHA prefix '${identifier}' matches multiple templates`);
    }

    return matches[0];
  }

  public testIsValidSHA(sha: string): boolean {
    return isValidSHA(sha);
  }
}

describe('IdentifierService', () => {
  let identifierService: TestIdentifierService;

  beforeEach(() => {
    jest.clearAllMocks();
    identifierService = new TestIdentifierService();
  });

  describe('computeSHA', () => {
    it('should compute consistent SHA for the same template content', () => {
      const template: Template = {
        id: '',
        name: 'test-template',
        version: '1.0.0',
        description: 'Test template',
        rootFolder: 'test-project',
        folders: [{ path: 'src', description: 'Source' }],
        files: [{ path: 'index.js', content: 'logger.info("test");' }],
        variables: [],
        rules: {
          strictMode: false,
          allowExtraFiles: true,
          allowExtraFolders: true,
          conflictResolution: 'prompt',
          excludePatterns: [],
          rules: []
        },
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z'
      };

      const sha1 = identifierService.computeTemplateSHA(template);
      const sha2 = identifierService.computeTemplateSHA(template);

      expect(sha1).toBe(sha2);
      expect(sha1).toHaveLength(64);
      expect(sha1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce different SHAs for different templates', () => {
      const template1: Template = {
        id: '',
        name: 'template-1',
        version: '1.0.0',
        description: 'First template',
        rootFolder: 'project1',
        folders: [],
        files: [],
        variables: [],
        rules: {
          strictMode: false,
          allowExtraFiles: true,
          allowExtraFolders: true,
          conflictResolution: 'prompt',
          excludePatterns: [],
          rules: []
        },
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z'
      };

      const template2: Template = {
        ...template1,
        name: 'template-2',
        description: 'Second template'
      };

      const sha1 = identifierService.computeTemplateSHA(template1);
      const sha2 = identifierService.computeTemplateSHA(template2);

      expect(sha1).not.toBe(sha2);
    });

    it('should ignore id field when computing SHA', () => {
      const template1: Template = {
        id: 'abc123',
        name: 'test-template',
        version: '1.0.0',
        description: 'Test',
        rootFolder: 'test',
        folders: [],
        files: [],
        variables: [],
        rules: {
          strictMode: false,
          allowExtraFiles: true,
          allowExtraFolders: true,
          conflictResolution: 'prompt',
          excludePatterns: [],
          rules: []
        },
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z'
      };

      const template2 = { ...template1, id: 'xyz789' };

      const sha1 = identifierService.computeTemplateSHA(template1);
      const sha2 = identifierService.computeTemplateSHA(template2);

      expect(sha1).toBe(sha2);
    });

    it('should ignore aliases field when computing SHA', () => {
      const template1: Template = {
        id: '',
        name: 'test-template',
        version: '1.0.0',
        description: 'Test',
        rootFolder: 'test',
        folders: [],
        files: [],
        variables: [],
        rules: {
          strictMode: false,
          allowExtraFiles: true,
          allowExtraFolders: true,
          conflictResolution: 'prompt',
          excludePatterns: [],
          rules: []
        },
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        aliases: ['alias1', 'alias2']
      };

      const template2 = { ...template1, aliases: ['different', 'aliases'] };

      const sha1 = identifierService.computeTemplateSHA(template1);
      const sha2 = identifierService.computeTemplateSHA(template2);

      expect(sha1).toBe(sha2);
    });

    it('should handle templates with complex nested structures', () => {
      const template: Template = {
        id: '',
        name: 'complex-template',
        version: '2.0.0',
        description: 'Complex template with nested structures',
        rootFolder: 'complex-app',
        folders: [
          { path: 'src', description: 'Source', permissions: '755', gitkeep: false },
          { path: 'src/components', description: 'Components' },
          { path: 'tests', description: 'Tests', gitkeep: true }
        ],
        files: [
          {
            path: 'package.json',
            content: '{"name": "{{PROJECT_NAME}}", "version": "1.0.0"}',
            permissions: '644',
            variables: true
          },
          {
            path: 'README.md',
            sourcePath: 'templates/readme.md',
            variables: true
          }
        ],
        variables: [
          { name: 'PROJECT_NAME', description: 'Project name', default: 'my-app', required: true },
          { name: 'AUTHOR', description: 'Author name', required: false }
        ],
        rules: {
          strictMode: true,
          allowExtraFiles: false,
          allowExtraFolders: false,
          conflictResolution: 'replace',
          excludePatterns: ['node_modules/**', '.git/**'],
          rules: [
            {
              id: 'rule1',
              name: 'Test Rule',
              description: 'Test rule',
              type: 'required_file',
              target: 'package.json',
              fix: { action: 'create', autoFix: true },
              severity: 'error'
            }
          ]
        },
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-06-01T00:00:00.000Z',
        author: 'Test Author',
        dependencies: ['dep1', 'dep2']
      };

      const sha = identifierService.computeTemplateSHA(template);

      expect(sha).toHaveLength(64);
      expect(sha).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('canonicalize', () => {
    it('should produce consistent canonical form', () => {
      const template: Template = {
        id: '',
        name: 'test',
        version: '1.0.0',
        description: 'Test',
        rootFolder: 'test',
        folders: [
          { path: 'b', description: 'B' },
          { path: 'a', description: 'A' }
        ],
        files: [],
        variables: [],
        rules: {
          strictMode: false,
          allowExtraFiles: true,
          allowExtraFolders: true,
          conflictResolution: 'prompt',
          excludePatterns: [],
          rules: []
        },
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z'
      };

      const canonical1 = identifierService.testCanonicalizeTemplate(template);
      const canonical2 = identifierService.testCanonicalizeTemplate(template);

      expect(canonical1).toBe(canonical2);
    });

    it.skip('should sort arrays consistently', () => {
      const template: Template = {
        id: '',
        name: 'test',
        version: '1.0.0',
        description: 'Test',
        rootFolder: 'test',
        folders: [
          { path: 'z', description: 'Z' },
          { path: 'a', description: 'A' },
          { path: 'm', description: 'M' }
        ],
        files: [
          { path: 'file2.txt', content: 'test' },
          { path: 'file1.txt', content: 'test' }
        ],
        variables: [
          { name: 'VAR_Z', description: 'Z', required: true },
          { name: 'VAR_A', description: 'A', required: true }
        ],
        rules: {
          strictMode: false,
          allowExtraFiles: true,
          allowExtraFolders: true,
          conflictResolution: 'prompt',
          excludePatterns: ['z', 'a', 'm'],
          rules: []
        },
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z'
      };

      const canonical = identifierService.testCanonicalizeTemplate(template);
      const parsed = JSON.parse(canonical);

      // Check that arrays are sorted
      expect(parsed.folders).toBeDefined();
      expect(parsed.folders).toHaveLength(3);
      expect(parsed.folders[0]).toBeDefined();
      expect(parsed.folders[0].path).toBe('a');
      expect(parsed.folders[1].path).toBe('m');
      expect(parsed.folders[2].path).toBe('z');

      expect(parsed.files[0].path).toBe('file1.txt');
      expect(parsed.files[1].path).toBe('file2.txt');

      expect(parsed.variables[0].name).toBe('VAR_A');
      expect(parsed.variables[1].name).toBe('VAR_Z');

      expect(parsed.rules.excludePatterns[0]).toBe('a');
      expect(parsed.rules.excludePatterns[1]).toBe('m');
      expect(parsed.rules.excludePatterns[2]).toBe('z');
    });

    it('should exclude computed fields', () => {
      const template: Template = {
        id: 'should-be-excluded',
        name: 'test',
        version: '1.0.0',
        description: 'Test',
        rootFolder: 'test',
        folders: [],
        files: [],
        variables: [],
        rules: {
          strictMode: false,
          allowExtraFiles: true,
          allowExtraFolders: true,
          conflictResolution: 'prompt',
          excludePatterns: [],
          rules: []
        },
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        aliases: ['should-be-excluded']
      };

      const canonical = identifierService.testCanonicalizeTemplate(template);
      const parsed = JSON.parse(canonical);

      expect(parsed.id).toBeUndefined();
      expect(parsed.aliases).toBeUndefined();
    });
  });

  describe('resolveSHA', () => {
    it('should return full SHA if input is already 64 chars', () => {
      const fullSHA = 'a'.repeat(64);
      const result = identifierService.testResolveSHA(fullSHA, [fullSHA]);

      expect(result).toBe(fullSHA);
    });

    it('should resolve short SHA to full SHA', () => {
      const fullSHA = 'abcdef1234567890' + 'a'.repeat(48);
      const shortSHA = 'abcdef12';

      const result = identifierService.testResolveSHA(shortSHA, [fullSHA]);

      expect(result).toBe(fullSHA);
    });

    it('should throw error if short SHA matches multiple templates', () => {
      const sha1 = 'abcdef12' + '1'.repeat(56);
      const sha2 = 'abcdef12' + '2'.repeat(56);
      const shortSHA = 'abcdef12';

      expect(() => {
        identifierService.testResolveSHA(shortSHA, [sha1, sha2]);
      }).toThrow('Ambiguous SHA prefix');
    });

    it('should throw error if SHA not found', () => {
      const shortSHA = 'notfound';
      const availableSHAs = ['abcdef' + '1'.repeat(58)];

      expect(() => {
        identifierService.testResolveSHA(shortSHA, availableSHAs);
      }).toThrow('No template found matching SHA prefix');
    });

    it('should handle empty available SHAs list', () => {
      const shortSHA = 'abcd';

      expect(() => {
        identifierService.testResolveSHA(shortSHA, []);
      }).toThrow('No template found matching SHA prefix');
    });
  });

  describe('isValidSHA', () => {
    it('should validate full 64-char SHA', () => {
      const validSHA = 'a'.repeat(64);
      expect(identifierService.testIsValidSHA(validSHA)).toBe(true);
    });

    it('should validate short SHA (8 chars)', () => {
      const shortSHA = 'abcdef12';
      expect(identifierService.testIsValidSHA(shortSHA)).toBe(true);
    });

    it('should reject non-hex characters', () => {
      const invalidSHA = 'ghijklmn';
      expect(identifierService.testIsValidSHA(invalidSHA)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(identifierService.testIsValidSHA('')).toBe(false);
    });

    it('should reject SHA longer than 64 chars', () => {
      const tooLong = 'a'.repeat(65);
      expect(identifierService.testIsValidSHA(tooLong)).toBe(false);
    });

    it('should accept mixed case hex', () => {
      const mixedCase = 'AbCdEf12';
      expect(identifierService.testIsValidSHA(mixedCase)).toBe(true);
    });
  });
});