/**
 * Unit tests for TemplateIdentifierService
 */

import { TemplateIdentifierService } from '@/services';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';

jest.mock('fs-extra');
jest.mock('os');

describe('TemplateIdentifierService', () => {
  let service: TemplateIdentifierService;
  const mockHomeDir = '/home/user';
  const aliasFilePath = '/home/user/.scaffold/templates/aliases.json';

  beforeEach(() => {
    jest.clearAllMocks();
    (os.homedir as jest.Mock).mockReturnValue(mockHomeDir);

    // Reset singleton instance
    (TemplateIdentifierService as any).instance = undefined;
    service = TemplateIdentifierService.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = TemplateIdentifierService.getInstance();
      const instance2 = TemplateIdentifierService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('loadAliases', () => {
    it('should load aliases from file if exists', async () => {
      const mockAliasData = {
        aliases: {
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa': ['alias1'],
          'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb': ['my-template'],
          'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc': ['test']
        },
        updated: '2023-01-01T00:00:00.000Z'
      };

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue(mockAliasData);

      await service['loadAliases']();

      expect(fs.pathExists).toHaveBeenCalledWith(aliasFilePath);
      expect(fs.readJson).toHaveBeenCalledWith(aliasFilePath);

      // Test that aliases were loaded into internal state by checking getAllMappings
      const mappings = await service.getAllMappings();
      expect(mappings.get('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toEqual(['alias1']);
    });

    it('should return empty object if file does not exist', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      await service['loadAliases']();

      const mappings = await service.getAllMappings();
      expect(mappings.size).toBe(0);
      expect(fs.readJson).not.toHaveBeenCalled();
    });

    it('should handle read errors gracefully', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockRejectedValue(new Error('Read error'));

      await service['loadAliases']();

      const mappings = await service.getAllMappings();
      expect(mappings.size).toBe(0);
    });
  });

  describe('saveAliases', () => {
    it('should save aliases to file', async () => {
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeJson as jest.Mock).mockResolvedValue(undefined);

      await service['saveAliases']();

      expect(fs.ensureDir).toHaveBeenCalledWith(path.dirname(aliasFilePath));
      expect(fs.writeJson).toHaveBeenCalledWith(
        aliasFilePath,
        expect.objectContaining({
          aliases: expect.any(Object),
          updated: expect.any(String)
        }),
        { spaces: 2 }
      );
    });

    it('should handle write errors', async () => {
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeJson as jest.Mock).mockRejectedValue(new Error('Write error'));

      await expect(service['saveAliases']()).rejects.toThrow('Failed to save aliases: Write error');
    });
  });

  describe('registerAlias', () => {
    it('should register new alias', async () => {
      const sha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const alias = 'my-template';

      (fs.pathExists as jest.Mock).mockResolvedValue(false);
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeJson as jest.Mock).mockResolvedValue(undefined);

      await service.registerAlias(sha, alias);

      expect(fs.writeJson).toHaveBeenCalledWith(
        aliasFilePath,
        expect.objectContaining({
          aliases: expect.objectContaining({
            [sha]: [alias]
          }),
          updated: expect.any(String)
        }),
        { spaces: 2 }
      );
    });

    it('should throw error if alias already exists for different SHA', async () => {
      const existingSHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const newSHA = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const alias = 'existing-alias';

      // Set up the service with existing alias data
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue({
        aliases: {
          [existingSHA]: [alias]
        }
      });

      // Load aliases into the service first
      await service['loadAliases']();

      // Now try to register the alias for a different SHA
      await expect(service.registerAlias(newSHA, alias)).rejects.toThrow(
        `Alias '${alias}' is already registered to`
      );
    });

    it('should not throw if alias already points to same SHA', async () => {
      const sha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const alias = 'my-alias';

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue({
        aliases: {
          [sha]: [alias]
        }
      });
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeJson as jest.Mock).mockResolvedValue(undefined);

      await expect(service.registerAlias(sha, alias)).resolves.not.toThrow();
    });

    it('should validate SHA format', async () => {
      const invalidSHA = 'not-a-valid-sha';
      const alias = 'my-alias';

      await expect(service.registerAlias(invalidSHA, alias)).rejects.toThrow(
        'SHA must be a valid 64-character SHA-256 hash'
      );
    });

    it('should validate alias format', async () => {
      const sha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const invalidAlias = '../invalid/alias';

      await expect(service.registerAlias(sha, invalidAlias)).rejects.toThrow(
        'Alias must contain only letters, numbers, dashes, and underscores'
      );
    });
  });

  describe('unregisterAlias', () => {
    it('should remove alias', async () => {
      const alias = 'my-alias';
      const sha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const otherSha = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue({
        aliases: {
          [sha]: [alias],
          [otherSha]: ['other-alias']
        }
      });
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeJson as jest.Mock).mockResolvedValue(undefined);

      await service.removeAlias(alias);

      expect(fs.writeJson).toHaveBeenCalledWith(
        aliasFilePath,
        expect.objectContaining({
          aliases: expect.objectContaining({
            [otherSha]: ['other-alias']
          }),
          updated: expect.any(String)
        }),
        { spaces: 2 }
      );
    });

    it('should not throw if alias does not exist', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue({
        aliases: {}
      });

      await expect(service.removeAlias('non-existent')).rejects.toThrow('Alias \'non-existent\' not found');
    });
  });

  describe('resolveIdentifier', () => {
    it('should resolve alias to SHA', async () => {
      const alias = 'my-template';
      const sha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue({
        aliases: {
          [sha]: [alias]
        }
      });

      const result = await service.resolveIdentifier(alias, [sha]);

      expect(result).toBe(sha);
    });

    it('should return SHA if already a valid SHA', async () => {
      const sha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      const result = await service.resolveIdentifier(sha, [sha]);

      expect(result).toBe(sha);
    });

    it('should resolve short SHA to full SHA', async () => {
      const fullSHA = 'abcdef12' + 'a'.repeat(56);
      const shortSHA = 'abcdef12';

      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      const result = await service.resolveIdentifier(shortSHA, [fullSHA]);

      expect(result).toBe(fullSHA);
    });

    it('should handle name as fallback when not alias or SHA', async () => {
      const name = 'template-name';

      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      const result = await service.resolveIdentifier(name, []);

      expect(result).toBe(null);
    });

    it('should prioritize alias over SHA pattern', async () => {
      // Even if it looks like a SHA, if it's registered as an alias, use the alias mapping
      const aliasLookingLikeSHA = 'abcd1234';
      const targetSHA = 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz';

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue({
        aliases: {
          [targetSHA]: [aliasLookingLikeSHA]
        }
      });

      const result = await service.resolveIdentifier(aliasLookingLikeSHA, ['abcd1234' + 'x'.repeat(56), targetSHA]);

      expect(result).toBe(targetSHA);
    });
  });

  describe('getAliases', () => {
    it('should return all aliases for a SHA', async () => {
      const sha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const otherSha = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const mockAliasData = {
        aliases: {
          [sha]: ['alias1', 'alias2', 'alias3'],
          [otherSha]: ['other-alias']
        }
      };

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue(mockAliasData);

      const aliases = await service.getAliases(sha, [sha]);

      expect(aliases).toEqual(['alias1', 'alias2', 'alias3']);
    });

    it('should handle short SHA', async () => {
      const fullSHA = 'abcdef12' + 'a'.repeat(56);
      const shortSHA = 'abcdef12';
      const otherSha = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const mockAliasData = {
        aliases: {
          [fullSHA]: ['alias1'],
          [otherSha]: ['alias2']
        }
      };

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue(mockAliasData);

      const aliases = await service.getAliases(shortSHA, [fullSHA]);

      expect(aliases).toEqual(['alias1']);
    });

    it('should return empty array if no aliases found', async () => {
      const sha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const otherSha = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue({
        aliases: {
          [otherSha]: ['other-alias']
        }
      });

      const aliases = await service.getAliases(sha, [sha]);

      expect(aliases).toEqual([]);
    });

    it('should return empty array if alias file does not exist', async () => {
      const sha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      const aliases = await service.getAliases(sha, [sha]);

      expect(aliases).toEqual([]);
    });
  });

  describe('getAllAliases', () => {
    it('should return all alias mappings', async () => {
      const sha1 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const sha2 = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const sha3 = 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';

      const mockAliasData = {
        aliases: {
          [sha1]: ['alias1'],
          [sha2]: ['alias2'],
          [sha3]: ['alias3']
        }
      };

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue(mockAliasData);

      const aliases = await service.getAllMappings();

      expect(aliases).toEqual(new Map([
        [sha1, ['alias1']],
        [sha2, ['alias2']],
        [sha3, ['alias3']]
      ]));
    });

    it('should return empty object if file does not exist', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      const aliases = await service.getAllMappings();

      expect(aliases).toEqual(new Map());
    });
  });
});