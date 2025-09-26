/**
 * Unit tests for ConfigurationService
 */

import 'reflect-metadata';
import { DependencyContainer } from 'tsyringe';
import { ConfigurationService } from '@/services/configuration.service';
import { ConfigLevel } from '@/models';
import { createTestContainer } from '@tests/helpers/test-container';

describe('ConfigurationService', () => {
  let container: DependencyContainer;
  let service: ConfigurationService;

  beforeEach(() => {
    container = createTestContainer();
    service = container.resolve(ConfigurationService);
  });

  afterEach(() => {
    container.reset();
  });

  describe('method implementations', () => {
    it('should throw not implemented error for loadConfiguration', async () => {
      await expect(service.loadConfiguration()).rejects.toThrow(
        'Method not implemented'
      );
    });

    it('should throw not implemented error for get', () => {
      expect(() => service.get('test.key')).toThrow('Method not implemented');
    });

    it('should throw not implemented error for set', async () => {
      await expect(
        service.set('test.key', 'value', ConfigLevel.GLOBAL)
      ).rejects.toThrow('Method not implemented');
    });

    it('should throw not implemented error for getAll', () => {
      expect(() => service.getAll()).toThrow('Method not implemented');
    });

    it('should throw not implemented error for reset', async () => {
      await expect(service.reset(ConfigLevel.GLOBAL)).rejects.toThrow(
        'Method not implemented'
      );
    });

    it('should throw not implemented error for getConfigPath', () => {
      expect(() => service.getConfigPath(ConfigLevel.GLOBAL)).toThrow(
        'Method not implemented'
      );
    });

    it('should throw not implemented error for saveConfiguration', async () => {
      await expect(
        service.saveConfiguration(ConfigLevel.GLOBAL)
      ).rejects.toThrow('Method not implemented');
    });

    it('should throw not implemented error for hasConfiguration', () => {
      expect(() => service.hasConfiguration(ConfigLevel.GLOBAL)).toThrow(
        'Method not implemented'
      );
    });

    it('should throw not implemented error for getEffectiveConfiguration', () => {
      expect(() => service.getEffectiveConfiguration()).toThrow(
        'Method not implemented'
      );
    });
  });
});
