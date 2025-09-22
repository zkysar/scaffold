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
  const aliasFilePath = '/home/user/.scaffold/template-aliases.json';

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
      const mockAliases = {
        'alias1': 'a'.repeat(64),
        'my-template': 'b'.repeat(64),
        'test': 'c'.repeat(64)
      };

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue(mockAliases);

      const aliases = await service['loadAliases']();

      expect(fs.pathExists).toHaveBeenCalledWith(aliasFilePath);
      expect(fs.readJson).toHaveBeenCalledWith(aliasFilePath);
      expect(aliases).toEqual(mockAliases);
    });

    it('should return empty object if file does not exist', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      const aliases = await service['loadAliases']();

      expect(aliases).toEqual({});
      expect(fs.readJson).not.toHaveBeenCalled();
    });

    it('should handle read errors gracefully', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockRejectedValue(new Error('Read error'));

      const aliases = await service['loadAliases']();

      expect(aliases).toEqual({});
    });
  });

  describe('saveAliases', () => {
    it('should save aliases to file', async () => {
      const mockAliases = {
        'alias1': 'a'.repeat(64),
        'alias2': 'b'.repeat(64)
      };

      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeJson as jest.Mock).mockResolvedValue(undefined);

      await service['saveAliases'](mockAliases);

      expect(fs.ensureDir).toHaveBeenCalledWith(path.dirname(aliasFilePath));
      expect(fs.writeJson).toHaveBeenCalledWith(aliasFilePath, mockAliases, { spaces: 2 });
    });

    it('should handle write errors', async () => {
      const mockAliases = { 'alias1': 'a'.repeat(64) };

      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeJson as jest.Mock).mockRejectedValue(new Error('Write error'));

      await expect(service['saveAliases'](mockAliases)).rejects.toThrow('Write error');
    });
  });

  describe('registerAlias', () => {
    it('should register new alias', async () => {
      const sha = 'a'.repeat(64);
      const alias = 'my-template';

      (fs.pathExists as jest.Mock).mockResolvedValue(false);
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeJson as jest.Mock).mockResolvedValue(undefined);

      await service.registerAlias(sha, alias);

      expect(fs.writeJson).toHaveBeenCalledWith(
        aliasFilePath,
        { [alias]: sha },
        { spaces: 2 }
      );
    });

    it('should throw error if alias already exists for different SHA', async () => {
      const existingSHA = 'a'.repeat(64);
      const newSHA = 'b'.repeat(64);
      const alias = 'existing-alias';

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue({
        [alias]: existingSHA
      });

      await expect(service.registerAlias(newSHA, alias)).rejects.toThrow(
        `Alias '${alias}' is already registered to a different template`
      );
    });

    it('should not throw if alias already points to same SHA', async () => {
      const sha = 'a'.repeat(64);
      const alias = 'my-alias';

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue({
        [alias]: sha
      });
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeJson as jest.Mock).mockResolvedValue(undefined);

      await expect(service.registerAlias(sha, alias)).resolves.not.toThrow();
    });

    it('should validate SHA format', async () => {
      const invalidSHA = 'not-a-valid-sha';
      const alias = 'my-alias';

      await expect(service.registerAlias(invalidSHA, alias)).rejects.toThrow(
        'Invalid SHA format'
      );
    });

    it('should validate alias format', async () => {
      const sha = 'a'.repeat(64);
      const invalidAlias = '../invalid/alias';

      await expect(service.registerAlias(sha, invalidAlias)).rejects.toThrow(
        'Invalid alias format'
      );
    });
  });

  describe('unregisterAlias', () => {
    it('should remove alias', async () => {
      const alias = 'my-alias';
      const sha = 'a'.repeat(64);

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue({
        [alias]: sha,
        'other-alias': 'b'.repeat(64)
      });
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeJson as jest.Mock).mockResolvedValue(undefined);

      await service.unregisterAlias(alias);

      expect(fs.writeJson).toHaveBeenCalledWith(
        aliasFilePath,
        { 'other-alias': 'b'.repeat(64) },
        { spaces: 2 }
      );
    });

    it('should not throw if alias does not exist', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue({});

      await expect(service.unregisterAlias('non-existent')).resolves.not.toThrow();
    });
  });

  describe('resolveIdentifier', () => {
    it('should resolve alias to SHA', async () => {
      const alias = 'my-template';
      const sha = 'a'.repeat(64);

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue({
        [alias]: sha
      });

      const result = await service.resolveIdentifier(alias, []);

      expect(result).toBe(sha);
    });

    it('should return SHA if already a valid SHA', async () => {
      const sha = 'a'.repeat(64);

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

      expect(result).toBe(name);
    });

    it('should prioritize alias over SHA pattern', async () => {
      // Even if it looks like a SHA, if it's registered as an alias, use the alias mapping
      const aliasLookingLikeSHA = 'abcd1234';
      const targetSHA = 'z'.repeat(64);

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue({
        [aliasLookingLikeSHA]: targetSHA
      });

      const result = await service.resolveIdentifier(aliasLookingLikeSHA, ['abcd1234' + 'x'.repeat(56)]);

      expect(result).toBe(targetSHA);
    });
  });

  describe('getAliases', () => {
    it('should return all aliases for a SHA', async () => {
      const sha = 'a'.repeat(64);
      const mockAliases = {
        'alias1': sha,
        'alias2': sha,
        'other-alias': 'b'.repeat(64),
        'alias3': sha
      };

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue(mockAliases);

      const aliases = await service.getAliases(sha, [sha]);

      expect(aliases).toEqual(['alias1', 'alias2', 'alias3']);
    });

    it('should handle short SHA', async () => {
      const fullSHA = 'abcdef12' + 'a'.repeat(56);
      const shortSHA = 'abcdef12';
      const mockAliases = {
        'alias1': fullSHA,
        'alias2': 'b'.repeat(64)
      };

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue(mockAliases);

      const aliases = await service.getAliases(shortSHA, [fullSHA]);

      expect(aliases).toEqual(['alias1']);
    });

    it('should return empty array if no aliases found', async () => {
      const sha = 'a'.repeat(64);

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue({
        'other-alias': 'b'.repeat(64)
      });

      const aliases = await service.getAliases(sha, [sha]);

      expect(aliases).toEqual([]);
    });

    it('should return empty array if alias file does not exist', async () => {
      const sha = 'a'.repeat(64);

      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      const aliases = await service.getAliases(sha, [sha]);

      expect(aliases).toEqual([]);
    });
  });

  describe('getAllAliases', () => {
    it('should return all alias mappings', async () => {
      const mockAliases = {
        'alias1': 'a'.repeat(64),
        'alias2': 'b'.repeat(64),
        'alias3': 'c'.repeat(64)
      };

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue(mockAliases);

      const aliases = await service.getAllAliases();

      expect(aliases).toEqual(mockAliases);
    });

    it('should return empty object if file does not exist', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      const aliases = await service.getAllAliases();

      expect(aliases).toEqual({});
    });
  });

  describe('isValidAlias', () => {
    it('should accept valid aliases', () => {
      expect(service['isValidAlias']('my-template')).toBe(true);
      expect(service['isValidAlias']('template_v2')).toBe(true);
      expect(service['isValidAlias']('Template123')).toBe(true);
      expect(service['isValidAlias']('a')).toBe(true);
      expect(service['isValidAlias']('test.template')).toBe(true);
    });

    it('should reject invalid aliases', () => {
      expect(service['isValidAlias']('')).toBe(false);
      expect(service['isValidAlias']('../etc/passwd')).toBe(false);
      expect(service['isValidAlias']('alias/with/slash')).toBe(false);
      expect(service['isValidAlias']('alias\\with\\backslash')).toBe(false);
      expect(service['isValidAlias']('alias with spaces')).toBe(false);
      expect(service['isValidAlias']('alias\ttab')).toBe(false);
      expect(service['isValidAlias']('alias\nnewline')).toBe(false);
    });
  });
});