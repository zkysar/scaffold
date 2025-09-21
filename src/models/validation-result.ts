/**
 * Validation result data models and interfaces
 */

export interface ValidationResult {
  valid: boolean;
  path: string;
  type: 'file' | 'folder' | 'content' | 'permission' | 'pattern' | 'rule';
  severity: 'error' | 'warning' | 'info';
  message: string;
  expected?: string;
  actual?: string;
  ruleId?: string;
  templateId?: string;
  suggestion?: string;
  fixable?: boolean;
}

export interface ValidationContext {
  projectPath: string;
  ignoredPatterns: string[];
  variables: Record<string, string>;
  strictMode: boolean;
  dryRun: boolean;
}

export interface ValidationOptions {
  includeWarnings?: boolean;
  includeInfo?: boolean;
  templateIds?: string[];
  paths?: string[];
  skipContent?: boolean;
  skipPermissions?: boolean;
}
