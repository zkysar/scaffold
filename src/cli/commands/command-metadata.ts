/**
 * Centralized command metadata for CLI commands
 * Single source of truth for command names and descriptions
 */

export const COMMAND_METADATA = {
  check: {
    name: 'check',
    description: 'Validate project structure against applied templates',
  },
  clean: {
    name: 'clean',
    description: 'Cleanup temporary files and cache',
  },
  config: {
    name: 'config',
    description: 'Manage configuration settings (get/set/list/reset)',
  },
  extend: {
    name: 'extend',
    description: 'Add templates to existing project',
  },
  fix: {
    name: 'fix',
    description: 'Fix project structure issues automatically',
  },
  new: {
    name: 'new',
    description: 'Create new project from template',
  },
  show: {
    name: 'show',
    description:
      'Display information about templates, projects, or configuration',
  },
  template: {
    name: 'template',
    description: 'Manage templates (create/list/delete/export/import/alias)',
  },
} as const;

export type CommandName = keyof typeof COMMAND_METADATA;
export type CommandMetadata = (typeof COMMAND_METADATA)[CommandName];
