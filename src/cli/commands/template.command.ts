/**
 * CLI command: scaffold template <action>
 * Template management operations
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { TemplateService } from '../../services';
import type { Template } from '../../models';

interface TemplateCommandOptions {
  verbose?: boolean;
  dryRun?: boolean;
  force?: boolean;
  output?: string;
}

export function createTemplateCommand(): Command {
  const command = new Command('template');

  command
    .description('Manage templates (create/list/delete/export/import)')
    .argument('<action>', 'Action to perform (create|list|delete|export|import)')
    .argument('[name]', 'Template name or file path (required for some actions)')
    .option('--verbose', 'Show detailed output')
    .option('--dry-run', 'Show what would be done without making changes')
    .option('--force', 'Force operation without confirmation')
    .option('-o, --output <path>', 'Output path for export operations')
    .action(async (action: string, name: string, options: TemplateCommandOptions) => {
      try {
        await handleTemplateCommand(action, name, options);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}

async function handleTemplateCommand(action: string, name: string, options: TemplateCommandOptions): Promise<void> {
  const verbose = options.verbose || false;

  if (verbose) {
    console.log(chalk.blue('Template action:'), action);
    if (name) console.log(chalk.blue('Template name:'), name);
    console.log(chalk.blue('Options:'), JSON.stringify(options, null, 2));
  }

  const templateService = new TemplateService();

  switch (action.toLowerCase()) {
    case 'list':
      await handleListTemplates(templateService, options);
      break;
    case 'create':
      await handleCreateTemplate(templateService, name, options);
      break;
    case 'delete':
      await handleDeleteTemplate(templateService, name, options);
      break;
    case 'export':
      await handleExportTemplate(templateService, name, options);
      break;
    case 'import':
      await handleImportTemplate(templateService, name, options);
      break;
    default:
      console.error(chalk.red('Error:'), `Unknown action: ${action}`);
      console.log(chalk.gray('Available actions: list, create, delete, export, import'));
      process.exit(1);
  }
}

async function handleListTemplates(templateService: TemplateService, options: TemplateCommandOptions): Promise<void> {
  const verbose = options.verbose || false;

  try {
    const library = await templateService.loadTemplates();

    if (library.templates.length === 0) {
      console.log(chalk.yellow('No templates found.'));
      console.log(chalk.gray('Use "scaffold template create" to create your first template.'));
      return;
    }

    console.log(chalk.green('Available Templates:'));
    console.log('');

    for (const template of library.templates) {
      console.log(chalk.bold(template.name), chalk.gray(`(${template.id})`));
      console.log(chalk.gray('  Version:'), template.version);
      console.log(chalk.gray('  Description:'), template.description);
      console.log(chalk.gray('  Location:'), `~/.scaffold/templates/${template.id}/template.json`);

      if (verbose) {
        console.log(chalk.gray('  Source:'), template.source);
        console.log(chalk.gray('  Installed:'), template.installed ? 'Yes' : 'No');
        console.log(chalk.gray('  Last Updated:'), template.lastUpdated);
      }

      console.log('');
    }

    console.log(chalk.blue('Total:'), library.templates.length, 'templates');
  } catch (error) {
    if (error instanceof Error && error.message.includes('No templates found')) {
      console.log(chalk.yellow('No templates found.'));
      console.log(chalk.gray('Use "scaffold template create" to create your first template.'));
    } else {
      throw error;
    }
  }
}

async function handleCreateTemplate(templateService: TemplateService, name: string, options: TemplateCommandOptions): Promise<void> {
  const verbose = options.verbose || false;
  const dryRun = options.dryRun || false;

  if (!name) {
    console.error(chalk.red('Error:'), 'Template name is required for create action');
    console.log(chalk.gray('Usage: scaffold template create <name>'));
    process.exit(1);
  }

  if (verbose) {
    console.log(chalk.blue('Creating template:'), name);
  }

  // Interactive template creation
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'description',
      message: 'Template description:',
      validate: (input: string) => input.trim().length > 0 || 'Description is required',
    },
    {
      type: 'input',
      name: 'rootFolder',
      message: 'Root folder for template isolation:',
      default: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      validate: (input: string): string | boolean => {
        if (!input.trim()) return 'Root folder is required';
        if (!/^[a-zA-Z0-9_-]+$/.test(input)) return 'Root folder must contain only alphanumeric characters, underscores, and hyphens';
        if (input.startsWith('.') || input.startsWith('-')) return 'Root folder cannot start with a dot or hyphen';
        return true;
      },
    },
    {
      type: 'input',
      name: 'version',
      message: 'Initial version:',
      default: '1.0.0',
      validate: (input: string): string | boolean => {
        const semverRegex = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
        return semverRegex.test(input) || 'Invalid semantic version (e.g., 1.0.0)';
      },
    },
    {
      type: 'confirm',
      name: 'strictMode',
      message: 'Enable strict mode validation?',
      default: false,
    },
    {
      type: 'confirm',
      name: 'allowExtraFiles',
      message: 'Allow extra files in projects?',
      default: true,
    },
  ]);

  const template: Template = {
    id: generateTemplateId(name),
    name,
    version: answers.version,
    description: answers.description,
    rootFolder: answers.rootFolder,
    folders: [],
    files: [],
    variables: [],
    rules: {
      strictMode: answers.strictMode,
      allowExtraFiles: answers.allowExtraFiles,
      allowExtraFolders: true,
      conflictResolution: 'prompt',
      excludePatterns: ['node_modules', '.git', '*.log'],
      rules: [],
    },
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };

  if (dryRun) {
    console.log(chalk.yellow('DRY RUN - Template would be created with:'));
    console.log(JSON.stringify(template, null, 2));
    return;
  }

  try {
    await templateService.createTemplate(template);
    console.log(chalk.green('✓ Template created successfully!'));
    console.log(chalk.blue('Template ID:'), template.id);
    console.log(chalk.blue('Template Name:'), template.name);
    console.log(chalk.blue('Version:'), template.version);

    if (verbose) {
      console.log(chalk.gray('Location:'), `~/.scaffold/templates/${template.id}/template.json`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      console.error(chalk.red('Error:'), `Template '${name}' already exists`);
      console.log(chalk.gray('Use a different name or delete the existing template first.'));
    } else {
      throw error;
    }
  }
}

async function handleDeleteTemplate(templateService: TemplateService, name: string, options: TemplateCommandOptions): Promise<void> {
  const verbose = options.verbose || false;
  const dryRun = options.dryRun || false;
  const force = options.force || false;

  if (!name) {
    console.error(chalk.red('Error:'), 'Template name or ID is required for delete action');
    console.log(chalk.gray('Usage: scaffold template delete <name>'));
    process.exit(1);
  }

  if (verbose) {
    console.log(chalk.blue('Deleting template:'), name);
  }

  try {
    // Find template by name or ID
    const library = await templateService.loadTemplates();
    const template = library.templates.find(t => t.name === name || t.id === name);

    if (!template) {
      console.error(chalk.red('Error:'), `Template '${name}' not found`);
      process.exit(1);
    }

    if (!force && !dryRun) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to delete template '${template.name}' (${template.id})?`,
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.yellow('Operation cancelled.'));
        return;
      }
    }

    if (dryRun) {
      console.log(chalk.yellow('DRY RUN - Would delete template:'));
      console.log(chalk.blue('  ID:'), template.id);
      console.log(chalk.blue('  Name:'), template.name);
      console.log(chalk.blue('  Version:'), template.version);
      return;
    }

    await templateService.deleteTemplate(template.id);
    console.log(chalk.green('✓ Template deleted successfully!'));
    console.log(chalk.blue('Deleted:'), `${template.name} (${template.id})`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      console.error(chalk.red('Error:'), `Template '${name}' not found`);
    } else {
      throw error;
    }
  }
}

async function handleExportTemplate(templateService: TemplateService, name: string, options: TemplateCommandOptions): Promise<void> {
  const verbose = options.verbose || false;
  const dryRun = options.dryRun || false;

  if (!name) {
    console.error(chalk.red('Error:'), 'Template name or ID is required for export action');
    console.log(chalk.gray('Usage: scaffold template export <name> [-o output.json]'));
    process.exit(1);
  }

  const outputPath = options.output || `./${name}-template.json`;

  if (verbose) {
    console.log(chalk.blue('Exporting template:'), name);
    console.log(chalk.blue('Output path:'), outputPath);
  }

  try {
    // Find template by name or ID
    const library = await templateService.loadTemplates();
    const template = library.templates.find(t => t.name === name || t.id === name);

    if (!template) {
      console.error(chalk.red('Error:'), `Template '${name}' not found`);
      process.exit(1);
    }

    if (dryRun) {
      console.log(chalk.yellow('DRY RUN - Would export template to:'), outputPath);
      console.log(chalk.blue('  Template:'), `${template.name} (${template.id})`);
      return;
    }

    await templateService.exportTemplate(template.id, outputPath);
    console.log(chalk.green('✓ Template exported successfully!'));
    console.log(chalk.blue('Template:'), `${template.name} (${template.id})`);
    console.log(chalk.blue('Output:'), outputPath);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      console.error(chalk.red('Error:'), `Template '${name}' not found`);
    } else {
      throw error;
    }
  }
}

async function handleImportTemplate(templateService: TemplateService, archivePath: string, options: TemplateCommandOptions): Promise<void> {
  const verbose = options.verbose || false;
  const dryRun = options.dryRun || false;

  if (!archivePath) {
    console.error(chalk.red('Error:'), 'Archive path is required for import action');
    console.log(chalk.gray('Usage: scaffold template import <archive-path>'));
    process.exit(1);
  }

  if (verbose) {
    console.log(chalk.blue('Importing template from:'), archivePath);
  }

  if (dryRun) {
    console.log(chalk.yellow('DRY RUN - Would import template from:'), archivePath);
    return;
  }

  try {
    const template = await templateService.importTemplate(archivePath);
    console.log(chalk.green('✓ Template imported successfully!'));
    console.log(chalk.blue('Template ID:'), template.id);
    console.log(chalk.blue('Template Name:'), template.name);
    console.log(chalk.blue('Version:'), template.version);
    console.log(chalk.blue('Description:'), template.description);

    if (verbose) {
      console.log(chalk.gray('Location:'), `~/.scaffold/templates/${template.id}/template.json`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      console.error(chalk.red('Error:'), 'Template with the same ID already exists');
      console.log(chalk.gray('Delete the existing template first or modify the import.'));
    } else if (error instanceof Error && error.message.includes('does not exist')) {
      console.error(chalk.red('Error:'), `Archive file '${archivePath}' not found`);
    } else {
      throw error;
    }
  }
}

function generateTemplateId(name: string): string {
  // Generate template ID from name (kebab-case)
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}