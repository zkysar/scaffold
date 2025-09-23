/**
 * CLI command: scaffold extend <project>
 * Add templates to existing project
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';
import {
  ProjectExtensionService,
  ProjectManifestService,
  TemplateService,
  FileSystemService,
} from '../../services';
import { ExitCode } from '../../constants/exit-codes';

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
    .argument(
      '[project]',
      'Project directory path (defaults to current directory)'
    )
    .option('-t, --template <template>', 'Template ID or name to add')
    .option('-v, --variables <variables>', 'JSON string of template variables')
    .option('--verbose', 'Show detailed output')
    .option('--dry-run', 'Show what would be added without making changes')
    .option('--force', 'Apply template without confirmation prompts')
    .action(async (projectPath: string, options: ExtendCommandOptions) => {
      try {
        await handleExtendCommand(projectPath, options);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check for permission-related errors (system errors)
        if (errorMessage.includes('EACCES') ||
            errorMessage.includes('EPERM') ||
            errorMessage.includes('permission denied')) {
          console.error(chalk.red('Error:'), errorMessage);
          process.exit(ExitCode.SYSTEM_ERROR);
        }

        // Check for file system errors that are system-level issues
        if (errorMessage.includes('ENOENT') ||
            errorMessage.includes('EISDIR') ||
            errorMessage.includes('EMFILE') ||
            errorMessage.includes('ENOSPC')) {
          console.error(chalk.red('Error:'), errorMessage);
          process.exit(ExitCode.SYSTEM_ERROR);
        }

        // All other errors are considered user errors (invalid input, etc.)
        console.error(chalk.red('Error:'), errorMessage);
        process.exit(ExitCode.USER_ERROR);
      }
    });

  return command;
}

async function handleExtendCommand(
  projectPath: string,
  options: ExtendCommandOptions
): Promise<void> {
  const verbose = options.verbose || false;
  const dryRun = options.dryRun || false;

  // Determine target path
  const targetPath = projectPath
    ? resolve(projectPath)
    : resolve(process.cwd());

  if (verbose) {
    console.log(chalk.blue('Extending project:'), targetPath);
    console.log(chalk.blue('Options:'), JSON.stringify(options, null, 2));
  }

  // Check if template is specified - this is a user error
  if (!options.template) {
    console.error(chalk.red('Error:'), 'Template is required');
    console.log(
      chalk.gray(
        'Usage: scaffold extend <project> --template <template-name>'
      )
    );
    process.exit(ExitCode.USER_ERROR);
  }

  // Check if target directory exists - this is a user error
  if (!existsSync(targetPath)) {
    console.error(
      chalk.red('Error:'),
      `Directory "${targetPath}" does not exist`
    );
    process.exit(ExitCode.USER_ERROR);
  }

  // Parse variables if provided - JSON parsing errors are user errors
  let variables: Record<string, string> = {};
  if (options.variables) {
    try {
      variables = JSON.parse(options.variables);
    } catch (error) {
      console.error(
        chalk.red('Error:'),
        `Invalid variables JSON: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(ExitCode.USER_ERROR);
    }
  }

  // Initialize services
  const fileSystemService = new FileSystemService();
  const templateService = new TemplateService();
  const manifestService = new ProjectManifestService(fileSystemService);
  const extensionService = new ProjectExtensionService(
    templateService,
    fileSystemService,
    manifestService.getProjectManifest.bind(manifestService),
    manifestService.updateProjectManifest.bind(manifestService),
    manifestService.findNearestManifest.bind(manifestService)
  );

  let manifest: any = null;

  try {
    // Check if this is a scaffold-managed project
    manifest = await manifestService.loadProjectManifest(targetPath);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check if it's a missing manifest (not a scaffold project)
    if (errorMessage.includes('manifest.json') &&
        (errorMessage.includes('does not exist') || errorMessage.includes('Ensure the file exists'))) {
      console.error(chalk.red('Error:'), 'Not a scaffold-managed project');
      console.log(chalk.gray('No .scaffold/manifest.json file found.'));
      console.log(
        chalk.gray('Use "scaffold new" to create a new project first.')
      );
      process.exit(ExitCode.USER_ERROR);
    }

    // For any other manifest loading error (corrupted JSON, etc.)
    console.error(chalk.red('Error:'), errorMessage);
    process.exit(ExitCode.USER_ERROR);
  }

  if (!manifest) {
    console.error(chalk.red('Error:'), 'Not a scaffold-managed project');
    console.log(chalk.gray('No .scaffold/manifest.json file found.'));
    console.log(
      chalk.gray('Use "scaffold new" to create a new project first.')
    );
    process.exit(ExitCode.USER_ERROR);
  }

  try {

    if (dryRun) {
      console.log(chalk.yellow('DRY RUN'));
      console.log('Would extend project with');
      console.log(chalk.blue('Project:'), manifest.projectName);
      console.log(chalk.blue('Template:'), options.template);
      console.log(chalk.blue('Variables:'), variables);
      return; // Success - just return normally
    }

    // Extend the project with the new template
    const updatedManifest = await extensionService.extendProject(
      targetPath,
      [options.template],
      variables
    );

    console.log(chalk.green('Command structure created'));
    console.log(chalk.blue('Project name:'), updatedManifest.projectName);
    console.log(chalk.blue('Template added:'), options.template);
    console.log(
      chalk.blue('Total templates:'),
      updatedManifest.templates.map(t => `${t.name}@${t.version}`).join(', ')
    );
    // Success - just return normally, don't call exitWithCode for success

  } catch (error) {
    // Re-throw the error so it can be caught by the action handler
    throw error;
  }
}
