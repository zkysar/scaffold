/**
 * Barrel export for data models and interfaces
 */

// Template models
export type {
  FolderDefinition,
  FileDefinition,
  TemplateVariable,
  RuleCondition,
  RuleFix,
  Rule,
  TemplateRules,
  Template,
  TemplateSource,
  TemplateSummary,
  TemplateLibrary,
} from './template';

// Project models
export type {
  ChangeRecord,
  HistoryEntry,
  ConflictRecord,
  AppliedTemplate,
  ProjectManifest,
} from './project';

// Configuration models
export type {
  UserPreferences,
  PathConfiguration,
  DefaultSettings,
  ScaffoldConfig,
} from './scaffold-config';
export { ConfigLevel } from './scaffold-config';

// Validation report models
export type {
  ValidationError,
  ValidationWarning,
  ValidationStats,
  ValidationReport,
} from './validation-report';

// Validation result models
export type {
  ValidationResult,
  ValidationContext,
  ValidationOptions,
} from './validation-result';

// Completion models
export type {
  CompletionConfig,
  CompletionContext,
  CompletionProvider,
  CommandMetadata,
  SubcommandMetadata,
  OptionMetadata,
  ArgumentMetadata,
} from './completion-config';

export type {
  CompletionItem,
  CompletionResult,
  CompletionOptions,
  CompletionCacheEntry,
  ShellCompletionConfig,
  CompletionInstallStatus,
  ShellCompletionScript,
} from './completion-types';

export { ShellType } from './completion-types';