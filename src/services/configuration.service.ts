/**
 * Configuration service for managing scaffold configuration across scopes
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import type {
  ScaffoldConfig,
  UserPreferences,
  PathConfiguration,
  DefaultSettings,
} from '@/models';
import { ConfigLevel } from '@/models';

export type ConfigScope = ConfigLevel;

export interface IConfigurationService {
  /**
   * Get a configuration value by key, considering cascade
   */
  get<T = any>(key: string, scope?: ConfigScope): T | undefined;

  /**
   * Set a configuration value at the specified scope
   */
  set(key: string, value: any, scope: ConfigScope): Promise<void>;

  /**
   * Get all configuration for a specific scope or merged cascade
   */
  getAll(scope?: ConfigScope): ScaffoldConfig;

  /**
   * Reset configuration at the specified scope to defaults
   */
  reset(scope: ConfigScope): Promise<void>;

  /**
   * Get the file path for configuration at the specified scope
   */
  getConfigPath(scope: ConfigScope): string;

  /**
   * Load all configurations from disk
   */
  loadConfiguration(): Promise<void>;

  /**
   * Save configuration at the specified scope to disk
   */
  saveConfiguration(scope: ConfigScope): Promise<void>;

  /**
   * Check if configuration exists at the specified scope
   */
  hasConfiguration(scope: ConfigScope): boolean;

  /**
   * Get the effective configuration (merged cascade + env overrides)
   */
  getEffectiveConfiguration(): ScaffoldConfig;
}

export class ConfigurationService implements IConfigurationService {
  private readonly configCache = new Map<ConfigScope, ScaffoldConfig>();
  private readonly lockCache = new Map<ConfigScope, Promise<void>>();
  private loaded = false;

  constructor(
    private readonly projectRoot?: string,
    private readonly workspaceRoot?: string
  ) {}

  get<T = any>(key: string, scope?: ConfigScope): T | undefined {
    // Ensure configurations are loaded (sync operation)
    if (!this.loaded) {
      throw new Error(
        'Configuration not loaded. Call loadConfiguration() first.'
      );
    }

    if (scope) {
      const config = this.configCache.get(scope);
      return this.getNestedValue(config, key) as T;
    }

    // Check environment variables first
    const envValue = this.getEnvironmentOverride(key);
    if (envValue !== undefined) {
      return envValue as T;
    }

    // Check cascade: project → workspace → global
    if (this.projectRoot) {
      const projectValue = this.getNestedValue(
        this.configCache.get(ConfigLevel.PROJECT),
        key
      );
      if (projectValue !== undefined) return projectValue as T;
    }

    if (this.workspaceRoot) {
      const workspaceValue = this.getNestedValue(
        this.configCache.get(ConfigLevel.WORKSPACE),
        key
      );
      if (workspaceValue !== undefined) return workspaceValue as T;
    }

    const globalValue = this.getNestedValue(
      this.configCache.get(ConfigLevel.GLOBAL),
      key
    );
    return globalValue as T;
  }

  async set(key: string, value: any, scope: ConfigScope): Promise<void> {
    if (!this.loaded) {
      await this.loadConfiguration();
    }

    let config = this.configCache.get(scope);
    if (!config) {
      config = this.createDefaultConfig(scope);
      this.configCache.set(scope, config);
    }

    this.setNestedValue(config, key, value);
    await this.saveConfiguration(scope);
  }

  getAll(scope?: ConfigScope): ScaffoldConfig {
    if (scope) {
      return this.configCache.get(scope) || this.createDefaultConfig(scope);
    }

    return this.getEffectiveConfiguration();
  }

  async reset(scope: ConfigScope): Promise<void> {
    const defaultConfig = this.createDefaultConfig(scope);
    this.configCache.set(scope, defaultConfig);
    await this.saveConfiguration(scope);
  }

  getConfigPath(scope: ConfigScope): string {
    switch (scope) {
      case ConfigLevel.GLOBAL:
        return path.join(os.homedir(), '.scaffold', 'config.json');
      case ConfigLevel.WORKSPACE:
        if (!this.workspaceRoot) {
          throw new Error('Workspace root not set');
        }
        return path.join(this.workspaceRoot, '.scaffold', 'config.json');
      case ConfigLevel.PROJECT:
        if (!this.projectRoot) {
          throw new Error('Project root not set');
        }
        return path.join(this.projectRoot, '.scaffold', 'config.json');
      default:
        throw new Error(`Unknown config scope: ${scope}`);
    }
  }

  async loadConfiguration(): Promise<void> {
    const scopes = [
      ConfigLevel.GLOBAL,
      ConfigLevel.WORKSPACE,
      ConfigLevel.PROJECT,
    ];

    for (const scope of scopes) {
      try {
        const configPath = this.getConfigPath(scope);

        if (await fs.pathExists(configPath)) {
          const configData = await fs.readJson(configPath);
          const config = this.validateAndMigrateConfig(configData, scope);
          this.configCache.set(scope, config);
        } else {
          // Create default config for missing files
          const defaultConfig = this.createDefaultConfig(scope);
          this.configCache.set(scope, defaultConfig);

          // Only auto-create global config
          if (scope === ConfigLevel.GLOBAL) {
            await this.ensureConfigDirectory(scope);
            await fs.writeJson(configPath, defaultConfig, { spaces: 2 });
          }
        }
      } catch (error) {
        if (scope === ConfigLevel.WORKSPACE && !this.workspaceRoot) continue;
        if (scope === ConfigLevel.PROJECT && !this.projectRoot) continue;

        // For any other errors, create default config
        const defaultConfig = this.createDefaultConfig(scope);
        this.configCache.set(scope, defaultConfig);
      }
    }

    this.loaded = true;
  }

  async saveConfiguration(scope: ConfigScope): Promise<void> {
    // Prevent concurrent saves to the same scope
    if (this.lockCache.has(scope)) {
      await this.lockCache.get(scope);
    }

    const savePromise = this.performSave(scope);
    this.lockCache.set(scope, savePromise);

    try {
      await savePromise;
    } finally {
      this.lockCache.delete(scope);
    }
  }

  hasConfiguration(scope: ConfigScope): boolean {
    return this.configCache.has(scope);
  }

  getEffectiveConfiguration(): ScaffoldConfig {
    const global =
      this.configCache.get(ConfigLevel.GLOBAL) ||
      this.createDefaultConfig(ConfigLevel.GLOBAL);
    const workspace = this.configCache.get(ConfigLevel.WORKSPACE);
    const project = this.configCache.get(ConfigLevel.PROJECT);

    // Start with global config
    let effective = this.deepClone(global);

    // Merge workspace config
    if (workspace) {
      effective = this.mergeConfigs(effective, workspace);
    }

    // Merge project config
    if (project) {
      effective = this.mergeConfigs(effective, project);
    }

    // Apply environment overrides
    this.applyEnvironmentOverrides(effective);

    return effective;
  }

  private async performSave(scope: ConfigScope): Promise<void> {
    const config = this.configCache.get(scope);
    if (!config) {
      throw new Error(`No configuration found for scope: ${scope}`);
    }

    const configPath = this.getConfigPath(scope);
    await this.ensureConfigDirectory(scope);
    await fs.writeJson(configPath, config, { spaces: 2 });
  }

  private async ensureConfigDirectory(scope: ConfigScope): Promise<void> {
    const configPath = this.getConfigPath(scope);
    const configDir = path.dirname(configPath);
    await fs.ensureDir(configDir);
  }

  private createDefaultConfig(scope: ConfigScope): ScaffoldConfig {
    const basePreferences: UserPreferences = {
      strictModeDefault: false,
      colorOutput: true,
      verboseOutput: false,
      confirmDestructive: true,
      backupBeforeSync: true,
    };

    const basePaths: PathConfiguration = {
      templatesDir:
        scope === ConfigLevel.GLOBAL
          ? path.join(os.homedir(), '.scaffold', 'templates')
          : './templates',
      cacheDir:
        scope === ConfigLevel.GLOBAL
          ? path.join(os.homedir(), '.scaffold', 'cache')
          : './.scaffold/cache',
      backupDir:
        scope === ConfigLevel.GLOBAL
          ? path.join(os.homedir(), '.scaffold', 'backups')
          : './.scaffold/backups',
    };

    const baseDefaults: DefaultSettings = {
      gitIgnore: true,
    };

    return {
      id: this.generateConfigId(),
      version: '1.0.0',
      scope,
      preferences: basePreferences,
      paths: basePaths,
      defaults: baseDefaults,
    };
  }

  private validateAndMigrateConfig(
    data: any,
    scope: ConfigScope
  ): ScaffoldConfig {
    // Basic validation and migration logic
    if (!data || typeof data !== 'object') {
      return this.createDefaultConfig(scope);
    }

    const defaultConfig = this.createDefaultConfig(scope);

    return {
      id: data.id || this.generateConfigId(),
      version: data.version || '1.0.0',
      scope: data.scope || scope,
      preferences: { ...defaultConfig.preferences, ...data.preferences },
      paths: { ...defaultConfig.paths, ...data.paths },
      defaults: { ...defaultConfig.defaults, ...data.defaults },
    };
  }

  private generateConfigId(): string {
    // Simple UUID v4 generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c == 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private getNestedValue(obj: any, key: string): any {
    if (!obj) return undefined;

    const keys = key.split('.');
    let current = obj;

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private setNestedValue(obj: any, key: string, value: any): void {
    const keys = key.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }

    current[keys[keys.length - 1]] = value;
  }

  private getEnvironmentOverride(key: string): any {
    // Convert nested keys to environment variable format
    // e.g., "preferences.colorOutput" → "SCAFFOLD_PREFERENCES_COLOR_OUTPUT"
    const envKey = 'SCAFFOLD_' + key.toUpperCase().replace(/\./g, '_');
    const envValue = process.env[envKey];

    if (envValue === undefined) return undefined;

    // Try to parse as JSON for complex values
    try {
      return JSON.parse(envValue);
    } catch {
      // Return as string for simple values
      return envValue;
    }
  }

  private applyEnvironmentOverrides(config: ScaffoldConfig): void {
    // Apply common environment overrides
    const overrides = [
      'preferences.colorOutput',
      'preferences.verboseOutput',
      'preferences.strictModeDefault',
      'preferences.confirmDestructive',
      'preferences.backupBeforeSync',
      'preferences.defaultTemplate',
      'preferences.editor',
      'paths.templatesDir',
      'paths.cacheDir',
      'paths.backupDir',
      'defaults.author',
      'defaults.gitIgnore',
    ];

    for (const key of overrides) {
      const envValue = this.getEnvironmentOverride(key);
      if (envValue !== undefined) {
        this.setNestedValue(config, key, envValue);
      }
    }
  }

  private mergeConfigs(
    base: ScaffoldConfig,
    override: ScaffoldConfig
  ): ScaffoldConfig {
    return {
      ...base,
      id: override.id || base.id,
      version: override.version || base.version,
      scope: override.scope || base.scope,
      preferences: { ...base.preferences, ...override.preferences },
      paths: { ...base.paths, ...override.paths },
      defaults: { ...base.defaults, ...override.defaults },
    };
  }

  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
    if (Array.isArray(obj))
      return obj.map(item => this.deepClone(item)) as unknown as T;

    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }
}
