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
    return generateSHAFromObject(contentForSHA, [
      'id',
      'aliases',
      'created',
      'updated',
    ]);
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
      if (
        cloned.rules.excludePatterns &&
        Array.isArray(cloned.rules.excludePatterns)
      ) {
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
      throw new Error(
        `Ambiguous SHA prefix '${identifier}' matches multiple templates`
      );
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

  describe('loadAliases', () => {
    it('should throw not implemented error for loadAliases', async () => {
      await expect(identifierService.loadAliases()).rejects.toThrow(
        'Method not implemented'
      );
    });
  });

  describe('saveAliases', () => {
    it('should throw not implemented error for saveAliases', async () => {
      await expect(identifierService.saveAliases()).rejects.toThrow(
        'Method not implemented'
      );
    });
  });

  describe('resolveIdentifier', () => {
    it('should throw not implemented error for resolveIdentifier', async () => {
      await expect(
        identifierService.resolveIdentifier('test', [])
      ).rejects.toThrow('Method not implemented');
    });
  });

  describe('registerAlias', () => {
    it('should throw not implemented error for registerAlias', async () => {
      await expect(
        identifierService.registerAlias('a'.repeat(64), 'alias')
      ).rejects.toThrow('Method not implemented');
    });
  });
});
