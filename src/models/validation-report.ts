/**
 * Validation report data models and interfaces
 */

import { RuleFix } from './template';

export interface ValidationError {
  id: string;                    // Unique error identifier (UUID v4)
  severity: "error" | "critical";
  templateId: string;            // Which template was violated
  ruleId: string;                // Which specific rule was violated
  path: string;                  // Problem file/folder
  expected: string;              // What should be there
  actual: string;                // What is there
  fix?: RuleFix;                 // How to fix this error (from rule)
  fixApplied?: boolean;          // Was auto-fix attempted
  message: string;               // Error message
  file?: string;                 // File path for display
  rule?: string;                 // Rule name for display
  suggestion?: string;           // Suggestion for fixing
}

export interface ValidationWarning {
  id: string;                    // Unique warning identifier (UUID v4)
  template: string;
  path: string;
  message: string;
  suggestion?: string;
  file?: string;                 // File path for display
  rule?: string;                 // Rule name for display
}

export interface ValidationStats {
  filesChecked: number;
  foldersChecked: number;
  templatesChecked: number;
  errorsFound: number;
  warningsFound: number;
  executionTime: number;         // Milliseconds
  rulesEvaluated: number;
  errorCount: number;
  warningCount: number;
  duration: number;              // Milliseconds (alias for executionTime)
}

export interface ValidationReport {
  id: string;                     // Unique report identifier (UUID v4)
  timestamp: string;              // ISO 8601 date
  projectId?: string;             // Reference to ProjectManifest.id
  projectName?: string;           // Project name for display
  projectPath?: string;           // Project path
  templates?: string[];           // Templates being checked
  valid?: boolean;                // Overall validation result
  errors: ValidationError[];     // Problems found
  warnings: ValidationWarning[]; // Non-critical issues
  suggestions?: string[];         // Improvement suggestions
  stats: ValidationStats;        // Summary numbers
  passedRules?: string[];        // Rules that passed
  skippedRules?: string[];       // Rules that were skipped
}