import type {
  IConfigurationService,
  ConfigScope,
} from '@/services/configuration.service';
import type {
  ScaffoldConfig,
} from '@/models';
import { ConfigLevel } from '@/models';

export class FakeConfigurationService implements IConfigurationService {
  private configurations: Map<ConfigScope, ScaffoldConfig> = new Map();
  private shouldThrowError: string | null = null;
  private nextReturnValue: any = null;

  // Test helper methods
  resetTestState(): void {
    this.configurations.clear();
    this.shouldThrowError = null;
    this.nextReturnValue = null;
  }

  setError(message: string): void {
    this.shouldThrowError = message;
  }

  setReturnValue(value: any): void {
    this.nextReturnValue = value;
  }

  setConfiguration(scope: ConfigScope, config: ScaffoldConfig): void {
    this.configurations.set(scope, config);
  }

  getStoredConfigurations(): Map<ConfigScope, ScaffoldConfig> {
    return new Map(this.configurations);
  }

  private checkError(): void {
    if (this.shouldThrowError) {
      const error = this.shouldThrowError;
      this.shouldThrowError = null;
      throw new Error(error);
    }
  }

  private checkReturnValue<T>(): T | null {
    if (this.nextReturnValue !== null) {
      const value = this.nextReturnValue;
      this.nextReturnValue = null;
      return value;
    }
    return null;
  }

  private createDefaultConfig(scope: ConfigScope): ScaffoldConfig {
    return {
      id: 'test-config-id',
      version: '1.0.0',
      scope,
      preferences: {
        strictModeDefault: false,
        colorOutput: true,
        verboseOutput: false,
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

  // IConfigurationService implementation
  get<T = any>(key: string, scope?: ConfigScope): T | undefined {
    this.checkError();
    const returnValue = this.checkReturnValue<T>();
    if (returnValue !== null) return returnValue;

    // Check environment override first
    const envValue = this.getEnvironmentOverride(key);
    if (envValue !== undefined) {
      return envValue as T;
    }

    if (scope) {
      const config = this.configurations.get(scope);
      return this.getNestedValue(config, key) as T;
    }

    // Check cascade: project → workspace → global
    const project = this.configurations.get(ConfigLevel.PROJECT);
    if (project) {
      const projectValue = this.getNestedValue(project, key);
      if (projectValue !== undefined) return projectValue as T;
    }

    const workspace = this.configurations.get(ConfigLevel.WORKSPACE);
    if (workspace) {
      const workspaceValue = this.getNestedValue(workspace, key);
      if (workspaceValue !== undefined) return workspaceValue as T;
    }

    const global = this.configurations.get(ConfigLevel.GLOBAL);
    const globalValue = this.getNestedValue(global, key);
    return globalValue as T;
  }

  async set(key: string, value: any, scope: ConfigScope): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    let config = this.configurations.get(scope);
    if (!config) {
      config = this.createDefaultConfig(scope);
      this.configurations.set(scope, config);
    }

    this.setNestedValue(config, key, value);
  }

  getAll(scope?: ConfigScope): ScaffoldConfig {
    this.checkError();
    const returnValue = this.checkReturnValue<ScaffoldConfig>();
    if (returnValue !== null) return returnValue;

    if (scope) {
      return this.configurations.get(scope) || this.createDefaultConfig(scope);
    }

    return this.getEffectiveConfiguration();
  }

  async reset(scope: ConfigScope): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    const defaultConfig = this.createDefaultConfig(scope);
    this.configurations.set(scope, defaultConfig);
  }

  getConfigPath(scope: ConfigScope): string {
    this.checkError();
    const returnValue = this.checkReturnValue<string>();
    if (returnValue !== null) return returnValue;

    switch (scope) {
      case ConfigLevel.GLOBAL:
        return '/home/user/.scaffold/config.json';
      case ConfigLevel.WORKSPACE:
        return '/workspace/.scaffold/config.json';
      case ConfigLevel.PROJECT:
        return '/project/.scaffold/config.json';
      default:
        throw new Error(`Unknown config scope: ${scope}`);
    }
  }

  async loadConfiguration(): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    // In the fake, we just ensure default configs exist
    const scopes = [ConfigLevel.GLOBAL, ConfigLevel.WORKSPACE, ConfigLevel.PROJECT];
    for (const scope of scopes) {
      if (!this.configurations.has(scope)) {
        this.configurations.set(scope, this.createDefaultConfig(scope));
      }
    }
  }

  async saveConfiguration(scope: ConfigScope): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    // In the fake, we just verify the configuration exists
    if (!this.configurations.has(scope)) {
      throw new Error('No configuration found for scope');
    }
  }

  hasConfiguration(scope: ConfigScope): boolean {
    this.checkError();
    const returnValue = this.checkReturnValue<boolean>();
    if (returnValue !== null) return returnValue;

    return this.configurations.has(scope);
  }

  getEffectiveConfiguration(): ScaffoldConfig {
    this.checkError();
    const returnValue = this.checkReturnValue<ScaffoldConfig>();
    if (returnValue !== null) return returnValue;

    const global =
      this.configurations.get(ConfigLevel.GLOBAL) ||
      this.createDefaultConfig(ConfigLevel.GLOBAL);
    const workspace = this.configurations.get(ConfigLevel.WORKSPACE);
    const project = this.configurations.get(ConfigLevel.PROJECT);

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

  private applyEnvironmentOverrides(config: ScaffoldConfig): void {
    // Apply common environment overrides
    const overrides = [
      'preferences.colorOutput',
      'preferences.verboseOutput',
      'preferences.strictModeDefault',
      'preferences.confirmDestructive',
      'preferences.backupBeforeSync',
      'paths.templatesDir',
      'paths.cacheDir',
      'paths.backupDir',
      'defaults.gitIgnore',
    ];

    // Also check for any SCAFFOLD_* environment variables
    Object.keys(process.env).forEach(envKey => {
      if (envKey.startsWith('SCAFFOLD_')) {
        // Convert environment key back to nested key
        const configKey = envKey
          .replace('SCAFFOLD_', '')
          .toLowerCase()
          .replace(/_/g, '.');

        if (!overrides.includes(configKey)) {
          overrides.push(configKey);
        }
      }
    });

    for (const key of overrides) {
      const envValue = this.getEnvironmentOverride(key);
      if (envValue !== undefined) {
        this.setNestedValue(config, key, envValue);
      }
    }
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
}