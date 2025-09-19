/**
 * Project-related data models and interfaces
 */

export interface ChangeRecord {
  id: string;                     // Unique identifier (UUID v4)
  type: "added" | "modified" | "removed";
  path: string;                   // File/folder path
  reason?: string;                // Why this change
}

export interface HistoryEntry {
  id: string;                     // Unique identifier (UUID v4)
  timestamp: string;              // ISO 8601 date
  action: "create" | "extend" | "sync" | "check" | "clean";
  templates?: string[];           // Templates involved
  user?: string;                  // User who performed action
  changes: ChangeRecord[];        // What changed
}

export interface ConflictRecord {
  id: string;                     // Unique identifier (UUID v4)
  path: string;                   // Conflicting file/folder
  templateVersion: string;        // What template wants
  localVersion: string;           // What exists locally
  resolution: "kept_local" | "used_template" | "merged" | "skipped";
  resolvedAt: string;            // ISO 8601 date
  resolvedBy?: string;           // User who resolved conflict
}

export interface AppliedTemplate {
  templateId: string;             // Reference to Template.id
  name: string;                   // Template name (for display)
  version: string;                // Version applied
  rootFolder: string;             // Root folder where template was applied
  appliedBy?: string;             // User who applied the template
  appliedAt: string;              // ISO 8601 date
  status: "active" | "removed";   // Current status
  conflicts: ConflictRecord[];    // Recorded conflicts
}

export interface ProjectManifest {
  id: string;                     // Unique project identifier (UUID v4)
  version: string;                 // Manifest schema version
  projectName: string;            // Project name (human-readable)
  created: string;                // ISO 8601 date
  updated: string;                // ISO 8601 date
  templates: AppliedTemplate[];   // Templates used in this project
  variables: Record<string, string>; // Variable values used
  history: HistoryEntry[];        // Change history
}