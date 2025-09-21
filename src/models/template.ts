/**
 * Template-related data models and interfaces
 */

export interface FolderDefinition {
  path: string;                   // Relative path from project root
  description?: string;            // Purpose of this folder
  permissions?: string;            // Unix permissions (e.g., "755")
  gitkeep?: boolean;              // Add .gitkeep if empty
}

export interface FileDefinition {
  path: string;                   // Relative path from project root
  sourcePath?: string;            // Path to template file
  content?: string;               // Inline content (if no sourcePath)
  permissions?: string;           // Unix permissions (e.g., "644")
  variables?: boolean;            // Process variables in this file
}

export interface TemplateVariable {
  name: string;                   // Variable name (e.g., "PROJECT_NAME")
  description: string;            // What this variable represents
  required: boolean;              // Must be provided
  default?: string;               // Default value if not provided
  pattern?: string;               // Regex validation pattern
  transform?: "lower" | "upper" | "capitalize" | "kebab" | "snake" | "camel";
}

export interface RuleCondition {
  when: "always" | "if_exists" | "if_not_exists" | "if_matches";
  pattern?: string;               // Pattern for if_matches
  dependsOn?: string[];           // Other rule IDs that must pass
}

export interface RuleFix {
  action: "create" | "delete" | "modify" | "rename" | "prompt";
  template?: string;              // Template file to use for create/modify
  content?: string;               // Direct content for create/modify
  newPath?: string;               // For rename action
  message?: string;               // User message for prompt action
  autoFix: boolean;               // Can be fixed automatically
}

export interface Rule {
  id: string;                     // Unique rule identifier
  name: string;                   // Human-readable rule name (e.g., "Package.json must exist")
  description: string;            // What this rule checks
  type: "required_file" | "required_folder" | "forbidden_file" | "forbidden_folder" | "file_content" | "file_pattern" | "custom";
  target: string;                 // Path or pattern to check (e.g., "package.json", "src/**/*.test.ts")
  condition?: RuleCondition;      // When this rule applies
  fix: RuleFix;                   // How to fix violations
  severity: "error" | "warning";  // Rule importance
}

export interface TemplateRules {
  strictMode: boolean;            // Enforce exact structure
  allowExtraFiles: boolean;       // Allow files not in template
  allowExtraFolders: boolean;     // Allow folders not in template
  conflictResolution: "skip" | "replace" | "prompt" | "merge";
  excludePatterns: string[];      // Glob patterns to ignore
  rules: Rule[];                  // Custom validation rules
}

export interface Template {
  id: string;                      // SHA-256 hash of template content (64 characters)
  name: string;                    // Template name (human-readable)
  version: string;                 // Semantic version (e.g., "1.0.0")
  description: string;             // Human-readable description
  rootFolder: string;              // Root directory for template isolation (required)
  author?: string;                 // Template creator
  created: string;                 // ISO 8601 date
  updated: string;                 // ISO 8601 date
  folders: FolderDefinition[];     // Directory structure
  files: FileDefinition[];         // File templates
  variables: TemplateVariable[];   // Replaceable variables
  rules: TemplateRules;           // Validation and behavior rules
  dependencies?: string[];         // Other required template SHAs
  aliases?: string[];              // Human-readable aliases (stored separately, included for display)
}

export interface TemplateSource {
  type: "global" | "workspace" | "registry" | "git";
  path?: string;                 // File system path (for global/workspace)
  url?: string;                  // Remote URL (for registry/git)
  priority: number;              // Resolution order (higher wins)
  enabled: boolean;              // Is this source active
}

export interface TemplateSummary {
  id: string;                    // SHA-256 hash (same as Template.id)
  name: string;
  version: string;
  description: string;
  source: string;                // Which source provides this
  installed: boolean;            // Is it available locally
  lastUpdated: string;          // ISO 8601 date
  aliases?: string[];           // Human-readable aliases for this template
}

export interface TemplateLibrary {
  sources: TemplateSource[];     // Where templates come from
  templates: TemplateSummary[];  // Available templates
  lastUpdated: string;           // ISO 8601 date
}