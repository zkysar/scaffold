/**
 * CLI command: scaffold extend <project>
 * Add templates to existing project
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ProjectService, TemplateService, FileSystemService } from '../../services';

interface ExtendCommandOptions {
  template?: string;
  variables?: string;
  verbose?: boolean;
  dryRun?: boolean;
  force?: boolean;
}

export function createExtendCommand(): Command {
  const command = new Command('extend');

  command
    .description('Add templates to existing scaffold project')
    .argument('[project]', 'Project directory path (defaults to current directory)')
    .option('-t, --template <template>', 'Template ID or name to add')
    .option('-v, --variables <variables>', 'JSON string of template variables')
    .option('--verbose', 'Show detailed output')
    .option('--dry-run', 'Show what would be added without making changes')
    .option('--force', 'Apply template without confirmation prompts')
    .action(async (projectPath: string, options: ExtendCommandOptions) => {
      try {
        await handleExtendCommand(projectPath, options);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}

async function handleExtendCommand(projectPath: string, options: ExtendCommandOptions): Promise<void> {
  const verbose = options.verbose || false;
  const dryRun = options.dryRun || false;

  // Determine target path
  const targetPath = projectPath ? resolve(projectPath) : resolve(process.cwd());

  if (verbose) {
    console.log(chalk.blue('Extending project:'), targetPath);
    console.log(chalk.blue('Options:'), JSON.stringify(options, null, 2));
  }

  // Check if target directory exists
  if (!existsSync(targetPath)) {
    console.error(chalk.red('Error:'), `Directory "${targetPath}" does not exist`);
    process.exit(1);
  }

  // Initialize services
  const fileSystemService = new FileSystemService();
  const templateService = new TemplateService();
  const projectService = new ProjectService(templateService, fileSystemService);

  try {
    // Check if this is a scaffold-managed project
    const manifest = await projectService.loadProjectManifest(targetPath);

    if (!manifest) {
      console.error(chalk.red('Error:'), 'Not a scaffold-managed project');
      console.log(chalk.gray('No .scaffold/manifest.json file found.'));
      console.log(chalk.gray('Use "scaffold new" to create a new project first.'));
      process.exit(1);
    }

    if (!options.template) {
      console.error(chalk.red('Error:'), 'Template is required');
      console.log(chalk.gray('Usage: scaffold extend <project> --template <template-name>'));
      process.exit(1);
    }

    // Parse variables if provided
    let variables: Record<string, string> = {};
    if (options.variables) {
      try {
        variables = JSON.parse(options.variables);
      } catch (error) {
        throw new Error(`Invalid variables JSON: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (dryRun) {
      console.log(chalk.yellow('DRY RUN - Would extend project with:'));
      console.log(chalk.blue('Project:'), manifest.projectName);
      console.log(chalk.blue('Template:'), options.template);
      console.log(chalk.blue('Variables:'), variables);
      return;
    }

    console.log(chalk.yellow('✓ Command structure created (service implementation pending)'));
    console.log(chalk.blue('Would extend project:'), targetPath);
    console.log(chalk.blue('With template:'), options.template);

  } catch (error) {
    if (error instanceof Error && error.message === 'Not implemented') {
      console.log(chalk.yellow('✓ Command structure created (service implementation pending)'));
      console.log(chalk.blue('Would extend project:'), targetPath);
      console.log(chalk.blue('With template:'), options.template);
      return;
    }
    throw error;
  }
}