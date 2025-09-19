/**
 * Configuration service for managing scaffold configuration across scopes
 */
import type { ScaffoldConfig } from '../models';
import { ConfigLevel } from '../models';
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
export declare class ConfigurationService implements IConfigurationService {
    private readonly projectRoot?;
    private readonly workspaceRoot?;
    private readonly configCache;
    private readonly lockCache;
    private loaded;
    constructor(projectRoot?: string | undefined, workspaceRoot?: string | undefined);
    get<T = any>(key: string, scope?: ConfigScope): T | undefined;
    set(key: string, value: any, scope: ConfigScope): Promise<void>;
    getAll(scope?: ConfigScope): ScaffoldConfig;
    reset(scope: ConfigScope): Promise<void>;
    getConfigPath(scope: ConfigScope): string;
    loadConfiguration(): Promise<void>;
    saveConfiguration(scope: ConfigScope): Promise<void>;
    hasConfiguration(scope: ConfigScope): boolean;
    getEffectiveConfiguration(): ScaffoldConfig;
    private performSave;
    private ensureConfigDirectory;
    private createDefaultConfig;
    private validateAndMigrateConfig;
    private generateConfigId;
    private getNestedValue;
    private setNestedValue;
    private getEnvironmentOverride;
    private applyEnvironmentOverrides;
    private mergeConfigs;
    private deepClone;
}
//# sourceMappingURL=configuration.service.d.ts.map