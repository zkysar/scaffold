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

    // Create a mock instance instead of using the singleton
    service = new TemplateIdentifierService(aliasFilePath);
  });

  describe('getInstance', () => {
    it('should throw not implemented error for getInstance', () => {
      expect(() => TemplateIdentifierService.getInstance()).toThrow(
        'Method not implemented'
      );
    });
  });

  describe('loadAliases', () => {
    it('should throw not implemented error for loadAliases', async () => {
      await expect(service['loadAliases']()).rejects.toThrow(
        'Method not implemented'
      );
    });
  });

  describe('saveAliases', () => {
    it('should throw not implemented error for saveAliases', async () => {
      await expect(service['saveAliases']()).rejects.toThrow(
        'Method not implemented'
      );
    });
  });

  describe('registerAlias', () => {
    it('should throw not implemented error for registerAlias', async () => {
      await expect(
        service.registerAlias('a'.repeat(64), 'my-template')
      ).rejects.toThrow('Method not implemented');
    });
  });

  describe('resolveIdentifier', () => {
    it('should throw not implemented error for resolveIdentifier', async () => {
      await expect(
        service.resolveIdentifier('my-template', [])
      ).rejects.toThrow('Method not implemented');
    });
  });

  describe('getAliases', () => {
    it('should throw not implemented error for getAliases', async () => {
      await expect(
        service.getAliases('a'.repeat(64), ['a'.repeat(64)])
      ).rejects.toThrow('Method not implemented');
    });
  });
});
