/**
 * CLI command: scaffold new <project>
 * Create new project from template
 */

import { Command } from 'commander';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ProjectService, TemplateService, FileSystemService } from '../../services';

interface NewCommandOptions {
  template?: string;
  path?: string;
  variables?: string;
  verbose?: boolean;
  dryRun?: boolean;
}

export function createNewCommand(): Command {
  const command = new Command('new');

  command
    .description('Create new project from template')
    .argument('<project>', 'Project name')
    .option('-t, --template <template>', 'Template ID or name to use')
    .option('-p, --path <path>', 'Target directory path (defaults to current directory)')
    .option('-v, --variables <variables>', 'JSON string of template variables')
    .option('--verbose', 'Show detailed output')
    .option('--dry-run', 'Show what would be created without creating anything')
    .action(async (projectName: string, options: NewCommandOptions) => {
      try {
        await handleNewCommand(projectName, options);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}

async function handleNewCommand(projectName: string, options: NewCommandOptions): Promise<void> {
  const verbose = options.verbose || false;
  const dryRun = options.dryRun || false;

  if (verbose) {
    console.log(chalk.blue('Creating new project:'), projectName);
    console.log(chalk.blue('Options:'), JSON.stringify(options, null, 2));
  }

  // Determine target path
  const targetPath = options.path
    ? resolve(options.path, projectName)
    : resolve(process.cwd(), projectName);

  if (verbose) {
    console.log(chalk.blue('Target path:'), targetPath);
  }

  // Check if target directory already exists
  if (existsSync(targetPath)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Directory "${targetPath}" already exists. Continue?`,
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('Operation cancelled.'));
      return;
    }
  }

  // Initialize services
  const fileSystemService = new FileSystemService();
  const templateService = new TemplateService();
  const projectService = new ProjectService(templateService, fileSystemService);

  let templateIds: string[] = [];

  if (options.template) {
    templateIds = [options.template];
    if (verbose) {
      console.log(chalk.blue('Using template:'), options.template);
    }
  } else {
    // TODO: Prompt user to select from available templates
    console.log(chalk.yellow('No template specified. Use --template option.'));
    console.log(chalk.gray('Example: scaffold new my-project --template node-typescript'));
    return;
  }

  // Parse variables if provided
  let variables: Record<string, string> = {};
  if (options.variables) {
    try {
      variables = JSON.parse(options.variables);
      if (verbose) {
        console.log(chalk.blue('Variables:'), variables);
      }
    } catch (error) {
      throw new Error(`Invalid variables JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (dryRun) {
    console.log(chalk.yellow('DRY RUN - No files will be created'));
    console.log(chalk.blue('Would create project:'), projectName);
    console.log(chalk.blue('Target path:'), targetPath);
    console.log(chalk.blue('Templates:'), templateIds);
    console.log(chalk.blue('Variables:'), variables);
    return;
  }

  try {
    // Create the project
    const manifest = await projectService.createProject(projectName, templateIds, targetPath, variables);

    console.log(chalk.green('✓ Project created successfully!'));
    console.log(chalk.blue('Project name:'), manifest.projectName);
    console.log(chalk.blue('Location:'), targetPath);
    console.log(chalk.blue('Templates applied:'), manifest.templates.map(t => `${t.name}@${t.version}`).join(', '));

    if (verbose) {
      console.log(chalk.blue('Manifest ID:'), manifest.id);
      console.log(chalk.blue('Created at:'), manifest.created);
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Not implemented') {
      console.log(chalk.yellow('✓ Command structure created (service implementation pending)'));
      console.log(chalk.blue('Would create project:'), projectName);
      console.log(chalk.blue('Target path:'), targetPath);
      console.log(chalk.blue('Templates:'), templateIds);
      return;
    }
    throw error;
  }
}