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
          console.error(
            chalk.red('Error:'),
            error instanceof Error ? error.message : String(error)
          );
          process.exit(1);
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

  // Prompt for project name if not provided
  let finalProjectName: string;
  if (!projectName) {
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
    finalProjectName = projectName;
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
      console.log(chalk.yellow('Operation cancelled.'));
      return;
    }
  }

  // Initialize services
  const fileSystemService = new FileSystemService();
  const templateService = new TemplateService();
  const manifestService = new ProjectManifestService(fileSystemService);
  const projectCreationService = new ProjectCreationService(
    templateService,
    fileSystemService
  );

  let templateIds: string[] = [];

  if (options.template) {
    templateIds = [options.template];
    if (verbose) {
      console.log(chalk.blue('Using template:'), options.template);
    }
  } else {
    // Load available templates and prompt user to select
    try {
      const library = await templateService.loadTemplates();

      if (library.templates.length === 0) {
        console.log(chalk.yellow('No templates found.'));
        console.log(
          chalk.gray(
            'Use "scaffold template create" to create your first template.'
          )
        );
        console.log(
          chalk.gray(
            'Or specify a template with: scaffold new my-project --template <template-name>'
          )
        );
        return;
      }

      if (verbose) {
        console.log(
          chalk.blue('Found'),
          library.templates.length,
          'available templates'
        );
      }

      // Create choices for inquirer
      const templateChoices = library.templates.map(template => ({
        name: `${template.name} - ${template.description}`,
        value: template.id,
        short: template.name,
      }));

      const { selectedTemplates } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selectedTemplates',
          message:
            'Select templates to apply (use spacebar to select, enter to confirm):',
          choices: templateChoices,
          validate: (input: string[]): string | boolean => {
            if (input.length === 0) {
              return 'You must select at least one template';
            }
            return true;
          },
        },
      ]);

      templateIds = selectedTemplates;

      if (verbose) {
        console.log(chalk.blue('Selected templates:'), templateIds);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Failed to load templates')
      ) {
        console.log(chalk.yellow('No templates found.'));
        console.log(
          chalk.gray(
            'Use "scaffold template create" to create your first template.'
          )
        );
        console.log(
          chalk.gray(
            'Or specify a template with: scaffold new my-project --template <template-name>'
          )
        );
        return;
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
    return;
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
  } catch (error) {
    throw error;
  }
}
