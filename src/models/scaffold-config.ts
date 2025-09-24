/**
 * Configuration-related data models and interfaces
 */

export interface UserPreferences {
  defaultTemplate?: string; // Auto-select this template
  strictModeDefault: boolean; // Default strict mode setting
  colorOutput: boolean; // Use colored terminal output
  verboseOutput: boolean; // Show detailed information
  confirmDestructive: boolean; // Require confirmation
  backupBeforeSync: boolean; // Auto-backup before sync
  editor?: string; // Preferred editor command
}

export interface PathConfiguration {
  templatesDir: string; // Where to look for templates
  cacheDir: string; // Temporary file storage
  backupDir: string; // Where to store backups
}

export interface DefaultSettings {
  author?: string; // Default author for templates
  gitIgnore: boolean; // Auto-create .gitignore
}

export interface ScaffoldConfig {
  id: string; // Unique config identifier (UUID v4)
  version: string; // Config schema version
  scope: 'global' | 'workspace' | 'project'; // Config scope
  preferences: UserPreferences; // User settings
  paths: PathConfiguration; // Where to find things
  defaults: DefaultSettings; // Default values
}

export enum ConfigLevel {
  GLOBAL = 'global',
  WORKSPACE = 'workspace',
  PROJECT = 'project',
}
