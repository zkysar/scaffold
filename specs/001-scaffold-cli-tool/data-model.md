# Data Model: Scaffold CLI Tool

**Date**: 2025-09-18
**Feature**: Scaffold CLI Tool

## Entity Definitions

### 1. Template
**Purpose**: Defines reusable project structure patterns
**File Location**: `~/.scaffold/templates/{name}/template.json` or workspace/.scaffold/templates/{name}/template.json

```typescript
interface Template {
  id: string;                      // Unique identifier (UUID v4)
  name: string;                    // Template name (human-readable)
  version: string;                 // Semantic version (e.g., "1.0.0")
  description: string;             // Human-readable description
  author?: string;                 // Template creator
  created: string;                 // ISO 8601 date
  updated: string;                 // ISO 8601 date
  folders: FolderDefinition[];     // Directory structure
  files: FileDefinition[];         // File templates
  variables: TemplateVariable[];   // Replaceable variables
  rules: TemplateRules;           // Validation and behavior rules
  dependencies?: string[];         // Other required template IDs
}

interface FolderDefinition {
  path: string;                   // Relative path from project root
  description?: string;            // Purpose of this folder
  permissions?: string;            // Unix permissions (e.g., "755")
  gitkeep?: boolean;              // Add .gitkeep if empty
}

interface FileDefinition {
  path: string;                   // Relative path from project root
  sourcePath?: string;            // Path to template file
  content?: string;               // Inline content (if no sourcePath)
  permissions?: string;           // Unix permissions (e.g., "644")
  variables?: boolean;            // Process variables in this file
}

interface TemplateVariable {
  name: string;                   // Variable name (e.g., "PROJECT_NAME")
  description: string;            // What this variable represents
  required: boolean;              // Must be provided
  default?: string;               // Default value if not provided
  pattern?: string;               // Regex validation pattern
  transform?: "lower" | "upper" | "capitalize" | "kebab" | "snake" | "camel";
}

interface TemplateRules {
  strictMode: boolean;            // Enforce exact structure
  allowExtraFiles: boolean;       // Allow files not in template
  allowExtraFolders: boolean;     // Allow folders not in template
  conflictResolution: "skip" | "replace" | "prompt" | "merge";
  excludePatterns: string[];      // Glob patterns to ignore
  rules: Rule[];                  // Custom validation rules
}

interface Rule {
  id: string;                     // Unique rule identifier
  name: string;                   // Human-readable rule name (e.g., "Package.json must exist")
  description: string;            // What this rule checks
  type: "required_file" | "required_folder" | "forbidden_file" | "forbidden_folder" | "file_content" | "file_pattern" | "custom";
  target: string;                 // Path or pattern to check (e.g., "package.json", "src/**/*.test.ts")
  condition?: RuleCondition;      // When this rule applies
  fix: RuleFix;                   // How to fix violations
  severity: "error" | "warning";  // Rule importance
}

// Example rule:
// {
//   id: "pkg-json-required",
//   name: "Package.json required",
//   description: "Node.js projects must have a package.json file",
//   type: "required_file",
//   target: "package.json",
//   fix: {
//     action: "create",
//     template: "templates/default-package.json",
//     autoFix: true
//   },
//   severity: "error"
// }

interface RuleCondition {
  when: "always" | "if_exists" | "if_not_exists" | "if_matches";
  pattern?: string;               // Pattern for if_matches
  dependsOn?: string[];           // Other rule IDs that must pass
}

interface RuleFix {
  action: "create" | "delete" | "modify" | "rename" | "prompt";
  template?: string;              // Template file to use for create/modify
  content?: string;               // Direct content for create/modify
  newPath?: string;               // For rename action
  message?: string;               // User message for prompt action
  autoFix: boolean;               // Can be fixed automatically
}
```

### 2. Project
**Purpose**: Tracks scaffold-managed projects
**File Location**: `{project-root}/.scaffold/manifest.json`

```typescript
interface ProjectManifest {
  id: string;                     // Unique project identifier (UUID v4)
  version: string;                 // Manifest schema version
  projectName: string;            // Project name (human-readable)
  created: string;                // ISO 8601 date
  updated: string;                // ISO 8601 date
  templates: AppliedTemplate[];   // Templates used in this project
  variables: Record<string, string>; // Variable values used
  history: HistoryEntry[];        // Change history
  // Note: Project path is determined by manifest file location (.scaffold/manifest.json)
  // This ensures portability across different machines and users
}

interface AppliedTemplate {
  templateId: string;             // Reference to Template.id
  name: string;                   // Template name (for display)
  version: string;                // Version applied
  appliedBy?: string;             // User who applied the template
  appliedAt: string;              // ISO 8601 date
  status: "active" | "removed";   // Current status
  conflicts: ConflictRecord[];    // Recorded conflicts
}

interface HistoryEntry {
  id: string;                     // Unique identifier (UUID v4)
  timestamp: string;              // ISO 8601 date
  action: "create" | "extend" | "sync" | "check" | "clean";
  templates?: string[];           // Templates involved
  user?: string;                  // User who performed action
  changes: ChangeRecord[];        // What changed
}

interface ChangeRecord {
  id: string;                     // Unique identifier (UUID v4)
  type: "added" | "modified" | "removed";
  path: string;                   // File/folder path
  reason?: string;                // Why this change
}

interface ConflictRecord {
  id: string;                     // Unique identifier (UUID v4)
  path: string;                   // Conflicting file/folder
  templateVersion: string;        // What template wants
  localVersion: string;           // What exists locally
  resolution: "kept_local" | "used_template" | "merged" | "skipped";
  resolvedAt: string;            // ISO 8601 date
  resolvedBy?: string;           // User who resolved conflict
}
```

### 3. Configuration
**Purpose**: Settings controlling scaffold behavior
**File Locations**:
- Global: `~/.scaffold/config.json`
- Workspace: `{workspace}/.scaffold/config.json`
- Project: `{project}/.scaffold/config.json`

```typescript
interface ScaffoldConfig {
  id: string;                     // Unique config identifier (UUID v4)
  version: string;                // Config schema version
  scope: "global" | "workspace" | "project"; // Config scope
  preferences: UserPreferences;   // User settings
  paths: PathConfiguration;       // Where to find things
  defaults: DefaultSettings;      // Default values
}

interface UserPreferences {
  defaultTemplate?: string;       // Auto-select this template
  strictModeDefault: boolean;     // Default strict mode setting
  colorOutput: boolean;          // Use colored terminal output
  verboseOutput: boolean;        // Show detailed information
  confirmDestructive: boolean;   // Require confirmation
  backupBeforeSync: boolean;     // Auto-backup before sync
  editor?: string;               // Preferred editor command
}

interface PathConfiguration {
  templatesDir: string;          // Where to look for templates
  cacheDir: string;              // Temporary file storage
  backupDir: string;             // Where to store backups
}

interface DefaultSettings {
  author?: string;               // Default author for templates
  gitIgnore: boolean;            // Auto-create .gitignore
}
```

### 4. ValidationReport
**Purpose**: Results of structure validation
**Runtime Only**: Not persisted to disk

```typescript
interface ValidationReport {
  id: string;                     // Unique report identifier (UUID v4)
  timestamp: string;              // ISO 8601 date
  projectId: string;             // Reference to ProjectManifest.id
  projectName: string;           // Project name for display
  templates: string[];           // Templates being checked
  valid: boolean;                // Overall validation result
  errors: ValidationError[];     // Problems found
  warnings: ValidationWarning[]; // Non-critical issues
  suggestions: string[];         // Improvement suggestions
  statistics: ValidationStats;   // Summary numbers
  // Note: Project location determined at runtime from context
}

interface ValidationError {
  id: string;                    // Unique error identifier (UUID v4)
  severity: "error" | "critical";
  templateId: string;            // Which template was violated
  ruleId: string;                // Which specific rule was violated
  path: string;                  // Problem file/folder
  expected: string;              // What should be there
  actual: string;                // What is there
  fix?: RuleFix;                 // How to fix this error (from rule)
  fixApplied?: boolean;          // Was auto-fix attempted
}

interface ValidationWarning {
  id: string;                    // Unique warning identifier (UUID v4)
  template: string;
  path: string;
  message: string;
  suggestion?: string;
}

interface ValidationStats {
  filesChecked: number;
  foldersChecked: number;
  templatesChecked: number;
  errorsFound: number;
  warningsFound: number;
  executionTime: number;         // Milliseconds
}
```

### 5. TemplateLibrary
**Purpose**: Collection of available templates
**Runtime Only**: Aggregated from multiple sources

```typescript
interface TemplateLibrary {
  sources: TemplateSource[];     // Where templates come from
  templates: TemplateSummary[];  // Available templates
  lastUpdated: string;           // ISO 8601 date
}

interface TemplateSource {
  type: "global" | "workspace" | "registry" | "git";
  path?: string;                 // File system path (for global/workspace)
  url?: string;                  // Remote URL (for registry/git)
  priority: number;              // Resolution order (higher wins)
  enabled: boolean;              // Is this source active
}

interface TemplateSummary {
  id: string;                    // Reference to Template.id
  name: string;
  version: string;
  description: string;
  source: string;                // Which source provides this
  installed: boolean;            // Is it available locally
  lastUpdated: string;          // ISO 8601 date
}
```

## Rule-Based Self-Healing

The rule system enables automatic fixing of structure violations:

1. **Detection**: Rules define what to check (type, target)
2. **Diagnosis**: Rules explain what's wrong (name, description)
3. **Resolution**: Rules specify how to fix (fix.action, fix.template)
4. **Execution**: System applies fixes automatically or with user approval

### Example Self-Healing Flow
```typescript
// Rule detects missing tsconfig.json
{
  violation: {
    ruleId: "ts-config-required",
    path: "tsconfig.json",
    expected: "TypeScript configuration file",
    actual: "File not found"
  },
  fix: {
    action: "create",
    template: "templates/tsconfig.template.json",
    autoFix: true
  }
}
// System automatically creates tsconfig.json from template
```

## State Transitions

### Template Lifecycle
```
Created → Published → Installed → Applied → Updated → Deprecated → Archived → Deleted
```

### Project Lifecycle
```
New → Configured → Extended → Validated → Synced → Maintained
```

### Conflict Resolution Flow
```
Detected → Presented → Resolved → Recorded → Applied
```

## Relationships

```
Template (1) ←→ (N) Project
  - A template can be used by many projects
  - A project can use multiple templates

Configuration (1) ←→ (1) Project
  - Each project has one active configuration
  - Configuration cascades: Project > Workspace > Global

ValidationReport (N) ←→ (1) Project
  - A project can have many validation reports over time
  - Each report belongs to one project

TemplateLibrary (1) ←→ (N) Template
  - Library aggregates many templates
  - Each template can appear in multiple sources
```

## Data Validation Rules

### ID Validation
- All `id` fields: UUID v4 format (e.g., "550e8400-e29b-41d4-a716-446655440000")
- IDs are immutable once created
- IDs must be unique within their entity type

### Template Validation
- `id`: Required, UUID v4 format
- `name`: Required, alphanumeric with hyphens, max 50 chars
- `version`: Required, semantic versioning format
- `folders.path`: No absolute paths, no path traversal (..)
- `files.path`: Must not conflict with folder paths
- `variables.name`: Uppercase with underscores only
- `rules.excludePatterns`: Valid glob patterns
- `dependencies`: Array of valid template IDs

### Project Validation
- `id`: Required, UUID v4 format
- `projectName`: Required, valid directory name
- `templates`: At least one template required
- `templates.templateId`: Must reference existing template ID
- `variables`: All required template variables must be set
- `history`: Append-only, never modified retroactively
- `history.id`: Required UUID v4 for each entry
- Project location: Inferred from .scaffold/manifest.json location

### Configuration Validation
- `id`: Required, UUID v4 format
- `scope`: Required, must be one of "global", "workspace", "project"
- `paths`: Must be valid absolute or relative paths
- `paths.templatesDir`: Must exist and be readable
- `preferences.editor`: Must be executable command
- Config merge order: Project overrides Workspace overrides Global

## Indexing Strategy

### Primary Indexes
- Templates indexed by `id` (primary key) and `name` (secondary index)
- Projects indexed by `id` (primary key), discovered by finding .scaffold/manifest.json files
- Configurations indexed by `id` (primary key) and `scope` (secondary index)
- History entries indexed by `id` and `timestamp` for chronological queries

## Migration Strategy

### Schema Versioning
- All JSON files include version field
- Backward compatibility for 2 major versions
- Automatic migration on first use of new version
- Migration creates backup before changes