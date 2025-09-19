"use strict";
/**
 * Configuration service for managing scaffold configuration across scopes
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationService = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const models_1 = require("../models");
class ConfigurationService {
    projectRoot;
    workspaceRoot;
    configCache = new Map();
    lockCache = new Map();
    loaded = false;
    constructor(projectRoot, workspaceRoot) {
        this.projectRoot = projectRoot;
        this.workspaceRoot = workspaceRoot;
    }
    get(key, scope) {
        // Ensure configurations are loaded (sync operation)
        if (!this.loaded) {
            throw new Error('Configuration not loaded. Call loadConfiguration() first.');
        }
        if (scope) {
            const config = this.configCache.get(scope);
            return this.getNestedValue(config, key);
        }
        // Check environment variables first
        const envValue = this.getEnvironmentOverride(key);
        if (envValue !== undefined) {
            return envValue;
        }
        // Check cascade: project → workspace → global
        if (this.projectRoot) {
            const projectValue = this.getNestedValue(this.configCache.get(models_1.ConfigLevel.PROJECT), key);
            if (projectValue !== undefined)
                return projectValue;
        }
        if (this.workspaceRoot) {
            const workspaceValue = this.getNestedValue(this.configCache.get(models_1.ConfigLevel.WORKSPACE), key);
            if (workspaceValue !== undefined)
                return workspaceValue;
        }
        const globalValue = this.getNestedValue(this.configCache.get(models_1.ConfigLevel.GLOBAL), key);
        return globalValue;
    }
    async set(key, value, scope) {
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
    getAll(scope) {
        if (scope) {
            return this.configCache.get(scope) || this.createDefaultConfig(scope);
        }
        return this.getEffectiveConfiguration();
    }
    async reset(scope) {
        const defaultConfig = this.createDefaultConfig(scope);
        this.configCache.set(scope, defaultConfig);
        await this.saveConfiguration(scope);
    }
    getConfigPath(scope) {
        switch (scope) {
            case models_1.ConfigLevel.GLOBAL:
                return path.join(os.homedir(), '.scaffold', 'config.json');
            case models_1.ConfigLevel.WORKSPACE:
                if (!this.workspaceRoot) {
                    throw new Error('Workspace root not set');
                }
                return path.join(this.workspaceRoot, '.scaffold', 'config.json');
            case models_1.ConfigLevel.PROJECT:
                if (!this.projectRoot) {
                    throw new Error('Project root not set');
                }
                return path.join(this.projectRoot, '.scaffold', 'config.json');
            default:
                throw new Error(`Unknown config scope: ${scope}`);
        }
    }
    async loadConfiguration() {
        const scopes = [models_1.ConfigLevel.GLOBAL, models_1.ConfigLevel.WORKSPACE, models_1.ConfigLevel.PROJECT];
        for (const scope of scopes) {
            try {
                const configPath = this.getConfigPath(scope);
                if (await fs.pathExists(configPath)) {
                    const configData = await fs.readJson(configPath);
                    const config = this.validateAndMigrateConfig(configData, scope);
                    this.configCache.set(scope, config);
                }
                else {
                    // Create default config for missing files
                    const defaultConfig = this.createDefaultConfig(scope);
                    this.configCache.set(scope, defaultConfig);
                    // Only auto-create global config
                    if (scope === models_1.ConfigLevel.GLOBAL) {
                        await this.ensureConfigDirectory(scope);
                        await fs.writeJson(configPath, defaultConfig, { spaces: 2 });
                    }
                }
            }
            catch (error) {
                if (scope === models_1.ConfigLevel.WORKSPACE && !this.workspaceRoot)
                    continue;
                if (scope === models_1.ConfigLevel.PROJECT && !this.projectRoot)
                    continue;
                // For any other errors, create default config
                const defaultConfig = this.createDefaultConfig(scope);
                this.configCache.set(scope, defaultConfig);
            }
        }
        this.loaded = true;
    }
    async saveConfiguration(scope) {
        // Prevent concurrent saves to the same scope
        if (this.lockCache.has(scope)) {
            await this.lockCache.get(scope);
        }
        const savePromise = this.performSave(scope);
        this.lockCache.set(scope, savePromise);
        try {
            await savePromise;
        }
        finally {
            this.lockCache.delete(scope);
        }
    }
    hasConfiguration(scope) {
        return this.configCache.has(scope);
    }
    getEffectiveConfiguration() {
        const global = this.configCache.get(models_1.ConfigLevel.GLOBAL) || this.createDefaultConfig(models_1.ConfigLevel.GLOBAL);
        const workspace = this.configCache.get(models_1.ConfigLevel.WORKSPACE);
        const project = this.configCache.get(models_1.ConfigLevel.PROJECT);
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
    async performSave(scope) {
        const config = this.configCache.get(scope);
        if (!config) {
            throw new Error(`No configuration found for scope: ${scope}`);
        }
        const configPath = this.getConfigPath(scope);
        await this.ensureConfigDirectory(scope);
        await fs.writeJson(configPath, config, { spaces: 2 });
    }
    async ensureConfigDirectory(scope) {
        const configPath = this.getConfigPath(scope);
        const configDir = path.dirname(configPath);
        await fs.ensureDir(configDir);
    }
    createDefaultConfig(scope) {
        const basePreferences = {
            strictModeDefault: false,
            colorOutput: true,
            verboseOutput: false,
            confirmDestructive: true,
            backupBeforeSync: true,
        };
        const basePaths = {
            templatesDir: scope === models_1.ConfigLevel.GLOBAL
                ? path.join(os.homedir(), '.scaffold', 'templates')
                : './templates',
            cacheDir: scope === models_1.ConfigLevel.GLOBAL
                ? path.join(os.homedir(), '.scaffold', 'cache')
                : './.scaffold/cache',
            backupDir: scope === models_1.ConfigLevel.GLOBAL
                ? path.join(os.homedir(), '.scaffold', 'backups')
                : './.scaffold/backups',
        };
        const baseDefaults = {
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
    validateAndMigrateConfig(data, scope) {
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
    generateConfigId() {
        // Simple UUID v4 generation
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    getNestedValue(obj, key) {
        if (!obj)
            return undefined;
        const keys = key.split('.');
        let current = obj;
        for (const k of keys) {
            if (current && typeof current === 'object' && k in current) {
                current = current[k];
            }
            else {
                return undefined;
            }
        }
        return current;
    }
    setNestedValue(obj, key, value) {
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
    getEnvironmentOverride(key) {
        // Convert nested keys to environment variable format
        // e.g., "preferences.colorOutput" → "SCAFFOLD_PREFERENCES_COLOR_OUTPUT"
        const envKey = 'SCAFFOLD_' + key.toUpperCase().replace(/\./g, '_');
        const envValue = process.env[envKey];
        if (envValue === undefined)
            return undefined;
        // Try to parse as JSON for complex values
        try {
            return JSON.parse(envValue);
        }
        catch {
            // Return as string for simple values
            return envValue;
        }
    }
    applyEnvironmentOverrides(config) {
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
    mergeConfigs(base, override) {
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
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object')
            return obj;
        if (obj instanceof Date)
            return new Date(obj.getTime());
        if (Array.isArray(obj))
            return obj.map(item => this.deepClone(item));
        const cloned = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    }
}
exports.ConfigurationService = ConfigurationService;
//# sourceMappingURL=configuration.service.js.map