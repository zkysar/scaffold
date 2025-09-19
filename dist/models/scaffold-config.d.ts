/**
 * Configuration-related data models and interfaces
 */
export interface UserPreferences {
    defaultTemplate?: string;
    strictModeDefault: boolean;
    colorOutput: boolean;
    verboseOutput: boolean;
    confirmDestructive: boolean;
    backupBeforeSync: boolean;
    editor?: string;
}
export interface PathConfiguration {
    templatesDir: string;
    cacheDir: string;
    backupDir: string;
}
export interface DefaultSettings {
    author?: string;
    gitIgnore: boolean;
}
export interface ScaffoldConfig {
    id: string;
    version: string;
    scope: "global" | "workspace" | "project";
    preferences: UserPreferences;
    paths: PathConfiguration;
    defaults: DefaultSettings;
}
export declare enum ConfigLevel {
    GLOBAL = "global",
    WORKSPACE = "workspace",
    PROJECT = "project"
}
//# sourceMappingURL=scaffold-config.d.ts.map