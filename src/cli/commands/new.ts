/**
 * CLI command: scaffold new <project>
 * Create new project from template
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  ProjectCreationService,
  ProjectManifestService,
  TemplateService,
  FileSystemService,
} from '../../services';
import { ExitCode, exitWithCode } from '../../constants/exit-codes';

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
          await handleNewCommand(projectName, options);
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
  options: NewCommandOptions
): Promise<void> {
  const verbose = options.verbose || false;
  const dryRun = options.dryRun || false;

  // Initialize services to check for templates
  const fileSystemService = new FileSystemService();
  const templateService = new TemplateService();

  let templateToUse = options.template;

  // If no template specified, try to use default template
  if (!templateToUse) {
    try {
      const library = await templateService.loadTemplates();
      const defaultTemplate = library.templates.find(t => t.name === 'default');
      if (defaultTemplate) {
        templateToUse = 'default';
        if (verbose) {
          console.log('No template specified, using default template');
        }
      } else {
        console.log('No template specified. Use --template option to specify a template.');
        process.exit(ExitCode.USER_ERROR);
      }
    } catch (error) {
      console.log('No template specified. Use --template option to specify a template.');
      process.exit(ExitCode.USER_ERROR);
    }
  }

  // Second check: Validate project name if provided as argument
  if (projectName !== undefined) {
    if (!projectName || projectName.trim().length === 0) {
      console.log('Project name cannot be empty');
      process.exit(ExitCode.USER_ERROR);
    }
    // Validate project name (no special characters except dash and underscore)
    if (!/^[a-zA-Z0-9_-]+$/.test(projectName.trim())) {
      console.log('Project name can only contain letters, numbers, dashes, and underscores');
      process.exit(ExitCode.USER_ERROR);
    }
  }

  // If project name was provided as an empty string, it should be treated as not provided
  const hasValidProjectName = projectName !== undefined && projectName.trim().length > 0;

  // Prompt for project name if not provided
  let finalProjectName: string;
  if (!hasValidProjectName) {
    const { name } = await inquirer.prompt([
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
    console.log(chalk.blue('Creating new project:'), finalProjectName);
    console.log(chalk.blue('Options:'), JSON.stringify(options, null, 2));
  }

  // Prompt for path if not provided
  let basePath: string;
  if (!options.path) {
    const { useCurrentDir } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useCurrentDir',
        message: 'Create project in current directory?',
        default: true,
      },
    ]);

    if (!useCurrentDir) {
      const { customPath } = await inquirer.prompt([
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
      exitWithCode(ExitCode.SUCCESS, 'Operation cancelled.');
    }
  }

  // Initialize remaining services (file system and template service already initialized above)
  const manifestService = new ProjectManifestService(fileSystemService);
  const projectCreationService = new ProjectCreationService(
    templateService,
    fileSystemService
  );

  // At this point we know template is specified (either directly or default)
  let templateIds: string[] = [templateToUse];

  if (verbose) {
    console.log(chalk.blue('Using template:'), templateToUse);
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
      throw new Error(
        `Invalid variables JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  if (dryRun) {
    console.log(chalk.yellow('DRY RUN - No files will be created'));
    console.log(chalk.blue('Would create project:'), finalProjectName);
    console.log(chalk.blue('Target path:'), targetPath);
    console.log(chalk.blue('Templates:'), templateIds);
    console.log(chalk.blue('Variables:'), variables);
    exitWithCode(ExitCode.SUCCESS);
  }

  try {
    // Create the project
    const manifest = await projectCreationService.createProject(
      finalProjectName,
      templateIds,
      targetPath,
      variables
    );

    // Save the manifest using the manifest service
    await manifestService.updateProjectManifest(targetPath, manifest);

    console.log(chalk.green('✓ Project created successfully!'));
    console.log(chalk.blue('Project name:'), manifest.projectName);
    console.log(chalk.blue('Location:'), targetPath);
    console.log(
      chalk.blue('Templates applied:'),
      manifest.templates.map(t => `${t.name}@${t.version}`).join(', ')
    );

    if (verbose) {
      console.log(chalk.blue('Manifest ID:'), manifest.id);
      console.log(chalk.blue('Created at:'), manifest.created);
    }

    exitWithCode(ExitCode.SUCCESS);
  } catch (error) {
    throw error;
  }
}
