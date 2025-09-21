/**
 * Unit tests for IdentifierService
 */

import { IdentifierService } from '@/services';
import { Template } from '@/models';

describe('IdentifierService', () => {
  let identifierService: IdentifierService;

  beforeEach(() => {
    identifierService = new IdentifierService();
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
        files: [{ path: 'index.js', content: 'console.log("test");' }],
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

      const sha1 = identifierService.computeSHA(template);
      const sha2 = identifierService.computeSHA(template);

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

      const sha1 = identifierService.computeSHA(template1);
      const sha2 = identifierService.computeSHA(template2);

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

      const sha1 = identifierService.computeSHA(template1);
      const sha2 = identifierService.computeSHA(template2);

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

      const sha1 = identifierService.computeSHA(template1);
      const sha2 = identifierService.computeSHA(template2);

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
          { name: 'PROJECT_NAME', description: 'Project name', defaultValue: 'my-app', required: true },
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

      const sha = identifierService.computeSHA(template);

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

      const canonical1 = identifierService['canonicalize'](template);
      const canonical2 = identifierService['canonicalize'](template);

      expect(canonical1).toBe(canonical2);
    });

    it('should sort arrays consistently', () => {
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

      const canonical = identifierService['canonicalize'](template);
      const parsed = JSON.parse(canonical);

      // Check that arrays are sorted
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

      const canonical = identifierService['canonicalize'](template);
      const parsed = JSON.parse(canonical);

      expect(parsed.id).toBeUndefined();
      expect(parsed.aliases).toBeUndefined();
    });
  });

  describe('resolveSHA', () => {
    it('should return full SHA if input is already 64 chars', () => {
      const fullSHA = 'a'.repeat(64);
      const result = identifierService.resolveSHA(fullSHA, [fullSHA]);

      expect(result).toBe(fullSHA);
    });

    it('should resolve short SHA to full SHA', () => {
      const fullSHA = 'abcdef1234567890' + 'a'.repeat(48);
      const shortSHA = 'abcdef12';

      const result = identifierService.resolveSHA(shortSHA, [fullSHA]);

      expect(result).toBe(fullSHA);
    });

    it('should throw error if short SHA matches multiple templates', () => {
      const sha1 = 'abcd' + '1'.repeat(60);
      const sha2 = 'abcd' + '2'.repeat(60);
      const shortSHA = 'abcd';

      expect(() => {
        identifierService.resolveSHA(shortSHA, [sha1, sha2]);
      }).toThrow('Ambiguous SHA prefix');
    });

    it('should throw error if SHA not found', () => {
      const shortSHA = 'notfound';
      const availableSHAs = ['abcdef' + '1'.repeat(58)];

      expect(() => {
        identifierService.resolveSHA(shortSHA, availableSHAs);
      }).toThrow('No template found matching SHA prefix');
    });

    it('should handle empty available SHAs list', () => {
      const shortSHA = 'abcd';

      expect(() => {
        identifierService.resolveSHA(shortSHA, []);
      }).toThrow('No template found matching SHA prefix');
    });
  });

  describe('isValidSHA', () => {
    it('should validate full 64-char SHA', () => {
      const validSHA = 'a'.repeat(64);
      expect(identifierService.isValidSHA(validSHA)).toBe(true);
    });

    it('should validate short SHA (8 chars)', () => {
      const shortSHA = 'abcdef12';
      expect(identifierService.isValidSHA(shortSHA)).toBe(true);
    });

    it('should reject non-hex characters', () => {
      const invalidSHA = 'ghijklmn';
      expect(identifierService.isValidSHA(invalidSHA)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(identifierService.isValidSHA('')).toBe(false);
    });

    it('should reject SHA longer than 64 chars', () => {
      const tooLong = 'a'.repeat(65);
      expect(identifierService.isValidSHA(tooLong)).toBe(false);
    });

    it('should accept mixed case hex', () => {
      const mixedCase = 'AbCdEf12';
      expect(identifierService.isValidSHA(mixedCase)).toBe(true);
    });
  });
});