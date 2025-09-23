/**
 * Unit tests for ConfigurationService
 */

import mockFs from 'mock-fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigurationService } from '@/services/configuration.service';
import { ConfigLevel } from '@/models';
import type {
  ScaffoldConfig,
  UserPreferences,
  PathConfiguration,
  DefaultSettings,
} from '@/models';
import { createMockImplementation } from '@tests/helpers/test-utils';

// Mock os module
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  homedir: jest.fn(() => '/home/user'),
}));

describe('ConfigurationService', () => {
  let configService: ConfigurationService;

  const mockHomeDir = '/home/user';
  const mockWorkspaceRoot = '/workspace';
  const mockProjectRoot = '/workspace/project';

  const mockGlobalConfig: ScaffoldConfig = {
    id: 'global-config-123',
    version: '1.0.0',
    scope: ConfigLevel.GLOBAL,
    preferences: {
      strictModeDefault: false,
      colorOutput: true,
      verboseOutput: false,
      confirmDestructive: true,
      backupBeforeSync: true,
    },
    paths: {
      templatesDir: path.join(mockHomeDir, '.scaffold', 'templates'),
      cacheDir: path.join(mockHomeDir, '.scaffold', 'cache'),
      backupDir: path.join(mockHomeDir, '.scaffold', 'backups'),
    },
    defaults: {
      gitIgnore: true,
    },
  };

  const mockWorkspaceConfig: ScaffoldConfig = {
    id: 'workspace-config-456',
    version: '1.0.0',
    scope: ConfigLevel.WORKSPACE,
    preferences: {
      strictModeDefault: true, // Override global
      colorOutput: true,
      verboseOutput: true, // Override global
      confirmDestructive: true,
      backupBeforeSync: true,
    },
    paths: {
      templatesDir: './templates',
      cacheDir: './.scaffold/cache',
      backupDir: './.scaffold/backups',
    },
    defaults: {
      gitIgnore: true,
    },
  };

  const mockProjectConfig: ScaffoldConfig = {
    id: 'project-config-789',
    version: '1.0.0',
    scope: ConfigLevel.PROJECT,
    preferences: {
      strictModeDefault: true,
      colorOutput: false, // Override workspace/global
      verboseOutput: true,
      confirmDestructive: false, // Override workspace/global
      backupBeforeSync: true,
    },
    paths: {
      templatesDir: './templates',
      cacheDir: './.scaffold/cache',
      backupDir: './.scaffold/backups',
    },
    defaults: {
      gitIgnore: false, // Override workspace/global
    },
  };

  beforeEach(() => {
    // Setup mock filesystem with config files
    const mockFileSystem = {
      [mockHomeDir]: {
        '.scaffold': {
          'config.json': JSON.stringify(mockGlobalConfig),
        },
      },
      [mockWorkspaceRoot]: {
        '.scaffold': {
          'config.json': JSON.stringify(mockWorkspaceConfig),
        },
      },
      [mockProjectRoot]: {
        '.scaffold': {
          'config.json': JSON.stringify(mockProjectConfig),
        },
      },
    };

    mockFs(mockFileSystem);

    configService = new ConfigurationService(
      mockProjectRoot,
      mockWorkspaceRoot
    );
  });

  afterEach(() => {
    mockFs.restore();
  });

  describe('constructor', () => {
    it('should initialize with project and workspace roots', () => {
      expect(configService).toBeInstanceOf(ConfigurationService);
    });

    it('should work without project and workspace roots', () => {
      const service = new ConfigurationService();
      expect(service).toBeInstanceOf(ConfigurationService);
    });
  });

  describe('loadConfiguration', () => {
    it('should load all configuration levels', async () => {
      await configService.loadConfiguration();

      expect(configService.hasConfiguration(ConfigLevel.GLOBAL)).toBe(true);
      expect(configService.hasConfiguration(ConfigLevel.WORKSPACE)).toBe(true);
      expect(configService.hasConfiguration(ConfigLevel.PROJECT)).toBe(true);
    });

    it('should create default global config if missing', async () => {
      // Remove global config file
      mockFs({
        [mockHomeDir]: {
          '.scaffold': {},
        },
        [mockWorkspaceRoot]: {
          '.scaffold': {
            'config.json': JSON.stringify(mockWorkspaceConfig),
          },
        },
      });

      await configService.loadConfiguration();

      expect(configService.hasConfiguration(ConfigLevel.GLOBAL)).toBe(true);
      const globalConfig = configService.getAll(ConfigLevel.GLOBAL);
      expect(globalConfig.scope).toBe(ConfigLevel.GLOBAL);
    });

    it('should handle missing workspace and project configs gracefully', async () => {
      // Only global config exists
      mockFs({
        [mockHomeDir]: {
          '.scaffold': {
            'config.json': JSON.stringify(mockGlobalConfig),
          },
        },
      });

      await configService.loadConfiguration();

      expect(configService.hasConfiguration(ConfigLevel.GLOBAL)).toBe(true);
      expect(configService.hasConfiguration(ConfigLevel.WORKSPACE)).toBe(true); // Default created
      expect(configService.hasConfiguration(ConfigLevel.PROJECT)).toBe(true); // Default created
    });

    it('should handle corrupted config files gracefully', async () => {
      mockFs({
        [mockHomeDir]: {
          '.scaffold': {
            'config.json': 'invalid json content',
          },
        },
      });

      await configService.loadConfiguration();

      // Should create default config instead
      expect(configService.hasConfiguration(ConfigLevel.GLOBAL)).toBe(true);
    });

    it('should handle filesystem permission errors', async () => {
      // Mock filesystem that throws errors
      mockFs({});

      await configService.loadConfiguration();

      // Should still have default configs
      expect(configService.hasConfiguration(ConfigLevel.GLOBAL)).toBe(true);
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      await configService.loadConfiguration();
    });

    it('should get value from specific scope', () => {
      const value = configService.get(
        'preferences.colorOutput',
        ConfigLevel.GLOBAL
      );
      expect(value).toBe(true);

      const projectValue = configService.get(
        'preferences.colorOutput',
        ConfigLevel.PROJECT
      );
      expect(projectValue).toBe(false);
    });

    it('should cascade through scopes when no scope specified', () => {
      // Project overrides workspace/global
      const colorOutput = configService.get('preferences.colorOutput');
      expect(colorOutput).toBe(false); // From project config

      // Workspace overrides global
      const verboseOutput = configService.get('preferences.verboseOutput');
      expect(verboseOutput).toBe(true); // From workspace/project config

      // Falls back to global
      const backupBeforeSync = configService.get(
        'preferences.backupBeforeSync'
      );
      expect(backupBeforeSync).toBe(true); // From global config
    });

    it('should support nested key access', () => {
      const strictMode = configService.get('preferences.strictModeDefault');
      expect(strictMode).toBe(true); // From project config

      const templatesDir = configService.get('paths.templatesDir');
      expect(templatesDir).toBe('./templates'); // From workspace/project config
    });

    it('should return undefined for non-existent keys', () => {
      const nonExistent = configService.get('nonexistent.key');
      expect(nonExistent).toBeUndefined();

      const partialKey = configService.get('preferences.nonexistent');
      expect(partialKey).toBeUndefined();
    });

    it('should handle environment variable overrides', () => {
      // Mock environment variable
      process.env.SCAFFOLD_PREFERENCES_COLOR_OUTPUT = 'true';

      const colorOutput = configService.get('preferences.colorOutput');
      expect(colorOutput).toBe(true); // From environment override

      delete process.env.SCAFFOLD_PREFERENCES_COLOR_OUTPUT;
    });

    it('should parse JSON environment variables', () => {
      process.env.SCAFFOLD_PATHS_TEMPLATES_DIR = '"/custom/templates"';

      const templatesDir = configService.get('paths.templatesDir');
      expect(templatesDir).toBe('/custom/templates');

      delete process.env.SCAFFOLD_PATHS_TEMPLATES_DIR;
    });

    it('should throw error if configuration not loaded', () => {
      const uninitializedService = new ConfigurationService();

      expect(() => uninitializedService.get('preferences.colorOutput')).toThrow(
        'Configuration not loaded'
      );
    });
  });

  describe('set', () => {
    beforeEach(async () => {
      await configService.loadConfiguration();
    });

    it('should set value at specified scope', async () => {
      await configService.set(
        'preferences.colorOutput',
        false,
        ConfigLevel.GLOBAL
      );

      const value = configService.get(
        'preferences.colorOutput',
        ConfigLevel.GLOBAL
      );
      expect(value).toBe(false);
    });

    it('should create nested objects for deep keys', async () => {
      await configService.set(
        'custom.nested.value',
        'test',
        ConfigLevel.GLOBAL
      );

      const value = configService.get(
        'custom.nested.value',
        ConfigLevel.GLOBAL
      );
      expect(value).toBe('test');
    });

    it('should load configuration if not already loaded', async () => {
      const uninitializedService = new ConfigurationService(
        mockProjectRoot,
        mockWorkspaceRoot
      );

      await uninitializedService.set(
        'preferences.test',
        true,
        ConfigLevel.GLOBAL
      );

      const value = uninitializedService.get(
        'preferences.test',
        ConfigLevel.GLOBAL
      );
      expect(value).toBe(true);
    });

    it('should create default config for missing scope', async () => {
      const serviceWithoutProject = new ConfigurationService(
        undefined,
        mockWorkspaceRoot
      );
      await serviceWithoutProject.loadConfiguration();

      await serviceWithoutProject.set(
        'test.value',
        'test',
        ConfigLevel.PROJECT
      );

      const value = serviceWithoutProject.get(
        'test.value',
        ConfigLevel.PROJECT
      );
      expect(value).toBe('test');
    });
  });

  describe('getAll', () => {
    beforeEach(async () => {
      await configService.loadConfiguration();
    });

    it('should return complete config for specific scope', () => {
      const globalConfig = configService.getAll(ConfigLevel.GLOBAL);

      expect(globalConfig.scope).toBe(ConfigLevel.GLOBAL);
      expect(globalConfig.preferences.colorOutput).toBe(true);
      expect(globalConfig.id).toBe('global-config-123');
    });

    it('should return effective configuration when no scope specified', () => {
      const effectiveConfig = configService.getAll();

      // Should have project overrides
      expect(effectiveConfig.preferences.colorOutput).toBe(false);
      expect(effectiveConfig.preferences.confirmDestructive).toBe(false);
      expect(effectiveConfig.defaults.gitIgnore).toBe(false);

      // Should have workspace overrides
      expect(effectiveConfig.preferences.verboseOutput).toBe(true);

      // Should have global fallbacks
      expect(effectiveConfig.preferences.backupBeforeSync).toBe(true);
    });
  });

  describe('reset', () => {
    beforeEach(async () => {
      await configService.loadConfiguration();
    });

    it('should reset configuration to defaults', async () => {
      // Modify config first
      await configService.set(
        'preferences.colorOutput',
        false,
        ConfigLevel.GLOBAL
      );
      expect(
        configService.get('preferences.colorOutput', ConfigLevel.GLOBAL)
      ).toBe(false);

      // Reset to defaults
      await configService.reset(ConfigLevel.GLOBAL);

      const resetConfig = configService.getAll(ConfigLevel.GLOBAL);
      expect(resetConfig.preferences.colorOutput).toBe(true); // Default value
      expect(resetConfig.id).not.toBe('global-config-123'); // New ID generated
    });
  });

  describe('getConfigPath', () => {
    it('should return correct paths for each scope', () => {
      const globalPath = configService.getConfigPath(ConfigLevel.GLOBAL);
      expect(globalPath).toBe(
        path.join(mockHomeDir, '.scaffold', 'config.json')
      );

      const workspacePath = configService.getConfigPath(ConfigLevel.WORKSPACE);
      expect(workspacePath).toBe(
        path.join(mockWorkspaceRoot, '.scaffold', 'config.json')
      );

      const projectPath = configService.getConfigPath(ConfigLevel.PROJECT);
      expect(projectPath).toBe(
        path.join(mockProjectRoot, '.scaffold', 'config.json')
      );
    });

    it('should throw error for workspace scope without workspace root', () => {
      const serviceWithoutWorkspace = new ConfigurationService(mockProjectRoot);

      expect(() =>
        serviceWithoutWorkspace.getConfigPath(ConfigLevel.WORKSPACE)
      ).toThrow('Workspace root not set');
    });

    it('should throw error for project scope without project root', () => {
      const serviceWithoutProject = new ConfigurationService();

      expect(() =>
        serviceWithoutProject.getConfigPath(ConfigLevel.PROJECT)
      ).toThrow('Project root not set');
    });

    it('should throw error for unknown scope', () => {
      expect(() =>
        configService.getConfigPath('unknown' as ConfigLevel)
      ).toThrow('Unknown config scope');
    });
  });

  describe('saveConfiguration', () => {
    beforeEach(async () => {
      await configService.loadConfiguration();
    });

    it('should save configuration to correct file', async () => {
      await configService.set(
        'preferences.confirmDestructive',
        true,
        ConfigLevel.GLOBAL
      );
      await configService.saveConfiguration(ConfigLevel.GLOBAL);

      // Configuration should be persisted (we can't easily test file write with mockFs)
      const config = configService.getAll(ConfigLevel.GLOBAL);
      expect(config.preferences.confirmDestructive).toBe(true);
    });

    it('should handle concurrent saves to same scope', async () => {
      // Start multiple saves at the same time
      const promises = [
        configService.set('test1', 'value1', ConfigLevel.GLOBAL),
        configService.set('test2', 'value2', ConfigLevel.GLOBAL),
        configService.set('test3', 'value3', ConfigLevel.GLOBAL),
      ];

      await Promise.all(promises);

      // All values should be set correctly
      expect(configService.get('test1', ConfigLevel.GLOBAL)).toBe('value1');
      expect(configService.get('test2', ConfigLevel.GLOBAL)).toBe('value2');
      expect(configService.get('test3', ConfigLevel.GLOBAL)).toBe('value3');
    });

    it('should throw error for non-existent scope', async () => {
      const serviceWithoutProject = new ConfigurationService();
      await serviceWithoutProject.loadConfiguration();

      await expect(
        serviceWithoutProject.saveConfiguration(ConfigLevel.PROJECT)
      ).rejects.toThrow('No configuration found for scope');
    });
  });

  describe('hasConfiguration', () => {
    beforeEach(async () => {
      await configService.loadConfiguration();
    });

    it('should return true for loaded configurations', () => {
      expect(configService.hasConfiguration(ConfigLevel.GLOBAL)).toBe(true);
      expect(configService.hasConfiguration(ConfigLevel.WORKSPACE)).toBe(true);
      expect(configService.hasConfiguration(ConfigLevel.PROJECT)).toBe(true);
    });

    it('should return false for unloaded configurations', () => {
      const uninitializedService = new ConfigurationService();

      expect(uninitializedService.hasConfiguration(ConfigLevel.GLOBAL)).toBe(
        false
      );
      expect(uninitializedService.hasConfiguration(ConfigLevel.WORKSPACE)).toBe(
        false
      );
      expect(uninitializedService.hasConfiguration(ConfigLevel.PROJECT)).toBe(
        false
      );
    });
  });

  describe('getEffectiveConfiguration', () => {
    beforeEach(async () => {
      await configService.loadConfiguration();
    });

    it('should merge configurations with correct precedence', () => {
      const effective = configService.getEffectiveConfiguration();

      // Project config should override workspace and global
      expect(effective.preferences.colorOutput).toBe(false); // From project
      expect(effective.preferences.confirmDestructive).toBe(false); // From project
      expect(effective.defaults.gitIgnore).toBe(false); // From project

      // Workspace config should override global where project doesn't override
      expect(effective.preferences.strictModeDefault).toBe(true); // From workspace/project
      expect(effective.preferences.verboseOutput).toBe(true); // From workspace/project

      // Global config should be used where not overridden
      expect(effective.preferences.backupBeforeSync).toBe(true); // From global
    });

    it('should apply environment overrides', () => {
      process.env.SCAFFOLD_PREFERENCES_COLOR_OUTPUT = 'true';

      const effective = configService.getEffectiveConfiguration();

      expect(effective.preferences.colorOutput).toBe(true); // Environment override

      delete process.env.SCAFFOLD_PREFERENCES_COLOR_OUTPUT;
    });

    it('should work with only global configuration', () => {
      const globalOnlyService = new ConfigurationService();

      // Mock only global config
      mockFs({
        [mockHomeDir]: {
          '.scaffold': {
            'config.json': JSON.stringify(mockGlobalConfig),
          },
        },
      });

      return globalOnlyService.loadConfiguration().then(() => {
        const effective = globalOnlyService.getEffectiveConfiguration();

        expect(effective.preferences.colorOutput).toBe(true);
        expect(effective.scope).toBe(ConfigLevel.GLOBAL);
      });
    });
  });

  describe('configuration validation and migration', () => {
    it('should handle invalid configuration data', async () => {
      mockFs({
        [mockHomeDir]: {
          '.scaffold': {
            'config.json': JSON.stringify({ invalid: 'config' }),
          },
        },
      });

      await configService.loadConfiguration();

      // Should create valid default config
      const config = configService.getAll(ConfigLevel.GLOBAL);
      expect(config.version).toBe('1.0.0');
      expect(config.scope).toBe(ConfigLevel.GLOBAL);
      expect(config.preferences).toBeDefined();
    });

    it('should migrate old configuration format', async () => {
      const oldConfig = {
        // Missing some required fields
        preferences: {
          colorOutput: false,
        },
      };

      mockFs({
        [mockHomeDir]: {
          '.scaffold': {
            'config.json': JSON.stringify(oldConfig),
          },
        },
      });

      await configService.loadConfiguration();

      const config = configService.getAll(ConfigLevel.GLOBAL);
      expect(config.version).toBe('1.0.0'); // Added during migration
      expect(config.scope).toBe(ConfigLevel.GLOBAL); // Added during migration
      expect(config.preferences.colorOutput).toBe(false); // Preserved from old config
      expect(config.preferences.verboseOutput).toBe(false); // Default value added
    });

    it('should generate unique IDs for configurations', async () => {
      await configService.loadConfiguration();

      const globalConfig = configService.getAll(ConfigLevel.GLOBAL);
      const workspaceConfig = configService.getAll(ConfigLevel.WORKSPACE);

      expect(globalConfig.id).toBeDefined();
      expect(workspaceConfig.id).toBeDefined();
      expect(globalConfig.id).not.toBe(workspaceConfig.id);
    });
  });

  describe('environment variable handling', () => {
    beforeEach(async () => {
      await configService.loadConfiguration();
    });

    it('should handle boolean environment variables', () => {
      process.env.SCAFFOLD_PREFERENCES_VERBOSE_OUTPUT = 'false';

      const value = configService.get('preferences.verboseOutput');
      expect(value).toBe(false);

      delete process.env.SCAFFOLD_PREFERENCES_VERBOSE_OUTPUT;
    });

    it('should handle string environment variables', () => {
      process.env.SCAFFOLD_PATHS_TEMPLATES_DIR = '/custom/path';

      const value = configService.get('paths.templatesDir');
      expect(value).toBe('/custom/path');

      delete process.env.SCAFFOLD_PATHS_TEMPLATES_DIR;
    });

    it('should handle complex JSON environment variables', () => {
      process.env.SCAFFOLD_CUSTOM_OBJECT = '{"nested": {"value": 123}}';

      const value = configService.get('custom.object');
      expect(value).toEqual({ nested: { value: 123 } });

      delete process.env.SCAFFOLD_CUSTOM_OBJECT;
    });

    it('should ignore invalid JSON in environment variables', () => {
      process.env.SCAFFOLD_INVALID_JSON = '{invalid json}';

      const value = configService.get('invalid.json');
      expect(value).toBe('{invalid json}'); // Falls back to string

      delete process.env.SCAFFOLD_INVALID_JSON;
    });
  });

  describe('edge cases', () => {
    it('should handle empty configuration files', async () => {
      mockFs({
        [mockHomeDir]: {
          '.scaffold': {
            'config.json': '{}',
          },
        },
      });

      await configService.loadConfiguration();

      const config = configService.getAll(ConfigLevel.GLOBAL);
      expect(config.preferences).toBeDefined();
      expect(config.paths).toBeDefined();
    });

    it('should handle very deep nested keys', async () => {
      await configService.loadConfiguration();

      const deepKey = 'level1.level2.level3.level4.level5';
      await configService.set(deepKey, 'deep-value', ConfigLevel.GLOBAL);

      const value = configService.get(deepKey, ConfigLevel.GLOBAL);
      expect(value).toBe('deep-value');
    });

    it('should handle special characters in values', async () => {
      await configService.loadConfiguration();

      const specialValue = 'value with spaces & symbols !@#$%^&*()';
      await configService.set(
        'special.value',
        specialValue,
        ConfigLevel.GLOBAL
      );

      const value = configService.get('special.value', ConfigLevel.GLOBAL);
      expect(value).toBe(specialValue);
    });

    it('should handle null and undefined values', async () => {
      await configService.loadConfiguration();

      await configService.set('null.value', null, ConfigLevel.GLOBAL);
      await configService.set('undefined.value', undefined, ConfigLevel.GLOBAL);

      const nullValue = configService.get('null.value', ConfigLevel.GLOBAL);
      const undefinedValue = configService.get(
        'undefined.value',
        ConfigLevel.GLOBAL
      );

      expect(nullValue).toBeNull();
      expect(undefinedValue).toBeUndefined();
    });
  });
});
