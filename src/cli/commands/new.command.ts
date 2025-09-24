/**
 * CLI command: scaffold new <project>
 * Create new project from template
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

import chalk from 'chalk';
import { Command } from 'commander';
import { prompt } from 'inquirer';
import { DependencyContainer } from 'tsyringe';

import { selectTemplates } from '@/cli/utils/template-selector';
import { ExitCode, exitWithCode } from '@/constants/exit-codes';
import { logger } from '@/lib/logger';
import {
  ProjectCreationService,
  ProjectManifestService,
  TemplateService,
} from '@/services';

interface NewCommandOptions {
  template?: string;
  path?: string;
  variables?: string;
  verbose?: boolean;
  dryRun?: boolean;
}

export function createNewCommand(container: DependencyContainer): Command {
  const command = new Command('new');

  command
    .description('Create new project from template')
    .argument('[project]', 'Project name')
    .option('-t, --template <template>', 'Template ID or name to use')
    .option(
      '-p, --path <path>',
      'Target directory path (defaults to current directory)'
    )
    .option('-v, --variables <variables>', 'JSON string of template variables')
    .option('--verbose', 'Show detailed output')
    .option('--dry-run', 'Show what would be created without creating anything')
    .action(
      async (projectName: string | undefined, options: NewCommandOptions) => {
        try {
          await handleNewCommand(projectName, options, container);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          // Check if it's a system/permission error
          if (errorMessage.includes('permission denied') ||
              errorMessage.includes('EACCES') ||
              errorMessage.includes('EPERM') ||
              errorMessage.includes('ENOENT') ||
              errorMessage.includes('no such file or directory')) {
            exitWithCode(ExitCode.SYSTEM_ERROR, `System error: ${errorMessage}`);
          } else {
            // Default to user error for other cases
            exitWithCode(ExitCode.USER_ERROR, `Error: ${errorMessage}`);
          }
        }
      }
    );

  return command;
}

async function handleNewCommand(
  projectName: string | undefined,
  options: NewCommandOptions,
  container: DependencyContainer
): Promise<void> {
  const verbose = options.verbose || false;
  const dryRun = options.dryRun || false;

  // Resolve services from DI container to check for templates
  const templateService = container.resolve(TemplateService);

  let templateToUse = options.template;

  // If no template specified, try to use default template
  if (!templateToUse) {
    try {
      const library = await templateService.loadTemplates();
      const defaultTemplate = library.templates.find(t => t.name === 'default');
      if (defaultTemplate) {
        templateToUse = 'default';
        if (verbose) {
          logger.info('No template specified, using default template');
        }
      } else {
        logger.info('No template specified. Use --template option to specify a template.');
        exitWithCode(ExitCode.USER_ERROR);
      }
    } catch (error) {
      logger.info('No template specified. Use --template option to specify a template.');
      exitWithCode(ExitCode.USER_ERROR);
    }
  }

  // Second check: Validate project name if provided as argument
  if (projectName !== undefined) {
    if (!projectName || projectName.trim().length === 0) {
      logger.info('Project name cannot be empty');
      exitWithCode(ExitCode.USER_ERROR);
    }
    // Validate project name (no special characters except dash and underscore)
    if (!/^[a-zA-Z0-9_-]+$/.test(projectName.trim())) {
      logger.info('Project name can only contain letters, numbers, dashes, and underscores');
      exitWithCode(ExitCode.USER_ERROR);
    }
  }

  // If project name was provided as an empty string, it should be treated as not provided
  const hasValidProjectName = projectName !== undefined && projectName.trim().length > 0;

  // Prompt for project name if not provided
  let finalProjectName: string;
  if (!hasValidProjectName) {
    const { name } = await prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Enter project name:',
        validate: (input: string): string | boolean => {
          if (!input || input.trim().length === 0) {
            return 'Project name is required';
          }
          // Validate project name (no special characters except dash and underscore)
          if (!/^[a-zA-Z0-9_-]+$/.test(input.trim())) {
            return 'Project name can only contain letters, numbers, dashes, and underscores';
          }
          return true;
        },
      },
    ]);
    finalProjectName = name.trim();
  } else {
    finalProjectName = projectName.trim();
  }

  if (verbose) {
    logger.raw(chalk.blue('Creating new project:'), finalProjectName);
    logger.raw(chalk.blue('Options:'), JSON.stringify(options, null, 2));
  }

  // Prompt for path if not provided
  let basePath: string;
  if (!options.path) {
    const { useCurrentDir } = await prompt([
      {
        type: 'confirm',
        name: 'useCurrentDir',
        message: 'Create project in current directory?',
        default: true,
      },
    ]);

    if (!useCurrentDir) {
      const { customPath } = await prompt([
        {
          type: 'input',
          name: 'customPath',
          message: 'Enter target directory path:',
          default: process.cwd(),
          validate: (input: string): string | boolean => {
            if (!input || input.trim().length === 0) {
              return 'Path is required';
            }
            return true;
          },
        },
      ]);
      basePath = customPath.trim();
    } else {
      basePath = process.cwd();
    }
  } else {
    basePath = options.path;
  }

  // Determine target path
  const targetPath = resolve(basePath, finalProjectName);

  if (verbose) {
    logger.raw(chalk.blue('Target path:'), targetPath);
  }

  // Check if target directory already exists
  if (existsSync(targetPath)) {
    const { overwrite } = await prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Directory "${targetPath}" already exists. Continue?`,
        default: false,
      },
    ]);

    if (!overwrite) {
      exitWithCode(ExitCode.SUCCESS, 'Operation cancelled.');
    }
  }

  // Resolve services from DI container
  const manifestService = container.resolve(ProjectManifestService);
  const projectCreationService = container.resolve(ProjectCreationService);

  // Handle template selection
  let templateIds: string[] = [];

  if (options.template) {
    templateIds = [options.template];
    if (verbose) {
      logger.raw(chalk.blue('Using template:'), options.template);
    }
  } else {
    // Use the new template selector utility
    try {
      templateIds = await selectTemplates(templateService, { verbose });

      if (verbose) {
        logger.raw(chalk.blue('Selected templates:'), templateIds);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Failed to load templates')
      ) {
        logger.info(chalk.yellow('No template specified and no templates found in library.'));
        logger.info(
          chalk.gray(
            'Use "scaffold template create" to create your first template.'
          )
        );
        logger.info(
          chalk.gray(
            'Or specify a template with: scaffold new my-project --template <template-name>'
          )
        );
        exitWithCode(ExitCode.USER_ERROR);
      }
      throw error;
    }
  }

  // Parse variables if provided
  let variables: Record<string, string> = {};
  if (options.variables) {
    try {
      variables = JSON.parse(options.variables);
      if (verbose) {
        logger.raw(chalk.blue('Variables:'), variables);
      }
    } catch (error) {
      throw new Error(
        `Invalid variables JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  if (dryRun) {
    logger.info(chalk.yellow('DRY RUN - Showing what would be created'));
    logger.raw(chalk.blue('Project name:'), finalProjectName);
    logger.raw(chalk.blue('Target path:'), targetPath);
    logger.raw(chalk.blue('Templates:'), templateIds);
    logger.raw(chalk.blue('Variables:'), variables);
    logger.info('');
  }

  // Create the project
  const manifest = await projectCreationService.createProject(
    finalProjectName,
    templateIds,
    targetPath,
    variables,
    dryRun
  );

  // Save the manifest using the manifest service (skip in dry-run mode)
  if (!dryRun) {
    await manifestService.updateProjectManifest(targetPath, manifest);
  }

  if (dryRun) {
    logger.info(chalk.green('✓ Dry run completed successfully!'));
    logger.info(chalk.gray('No files were actually created.'));
  } else {
    logger.info(chalk.green('✓ Project created successfully!'));
  }

  logger.raw(chalk.blue('Project name:'), manifest.projectName);
  logger.raw(chalk.blue('Location:'), targetPath);
  logger.raw(
    chalk.blue('Templates applied:'),
    manifest.templates.map(t => `${t.name}@${t.version}`).join(', ')
  );

  if (verbose) {
    logger.raw(chalk.blue('Manifest ID:'), manifest.id);
    logger.raw(chalk.blue('Created at:'), manifest.created);
  }

  exitWithCode(ExitCode.SUCCESS);
}