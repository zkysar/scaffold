/**
 * CLI command: scaffold extend <project>
 * Add templates to existing project
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  ProjectExtensionService,
  ProjectManifestService,
  TemplateService,
  FileSystemService,
} from '../../services';
import { ExitCode, exitWithCode } from '../../constants/exit-codes';
import { selectTemplates } from '../utils/template-selector';

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
    .description('Add templates to existing project')
    .argument(
      '[project]',
      'Project directory path (defaults to current directory)'
    )
    .option('--template <name>', 'Template name or ID to add')
    .option('--variables <json>', 'Variables as JSON string')
    .option('--verbose', 'Show detailed extend output')
    .option('--dry-run', 'Show what would be extended without making changes')
    .option('--force', 'Add template without confirmation prompts')
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
  const force = options.force || false;

  // Determine target path
  const targetPath = projectPath
    ? resolve(projectPath)
    : resolve(process.cwd());

  if (verbose) {
    console.log(chalk.blue('Extending project:'), targetPath);
  }

  // Check if directory exists
  if (!existsSync(targetPath)) {
    console.error(
      chalk.red('Error:'),
      `Directory "${targetPath}" does not exist`
    );
    process.exit(ExitCode.USER_ERROR);
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

  let templateIds: string[] = [];
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
    exitWithCode(ExitCode.USER_ERROR);
  }

  if (!manifest) {
    console.error(chalk.red('Error:'), 'Not a scaffold-managed project');
    console.log(chalk.gray('No .scaffold/manifest.json file found.'));
    console.log(
      chalk.gray('Use "scaffold new" to create a new project first.')
    );
    exitWithCode(ExitCode.USER_ERROR);
  }

  // Handle template selection
  if (options.template) {
    templateIds = [options.template];
    if (verbose) {
      console.log(chalk.blue('Using template:'), options.template);
    }
  } else {
    // Get already applied template SHAs to exclude them from selection
    const excludeTemplateIds = manifest.templates
      .filter((template: any) => template.status === 'active')
      .map((template: any) => template.templateSha);

    if (verbose && excludeTemplateIds.length > 0) {
      console.log(
        chalk.blue('Excluding already applied templates:'),
        excludeTemplateIds
      );
    }

    // Use shared template selection utility - single template only for extend
    try {
      templateIds = await selectTemplates(templateService, {
        verbose,
        excludeTemplateIds,
        allowMultiple: false, // Extend command should use single template
        required: false,
      });

      // Handle case where no templates are available or user cancels
      if (templateIds.length === 0) {
        console.log(chalk.yellow('No additional templates available to apply.'));
        console.log(
          chalk.gray(
            'All available templates are already applied to this project.'
          )
        );
        console.log(
          chalk.gray(
            'Or specify a specific template with: scaffold extend [project] --template <template-name>'
          )
        );
        return;
      }
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('Failed to load templates') ||
         error.message.includes('No templates available'))
      ) {
        console.log(chalk.yellow('No templates found.'));
        console.log(
          chalk.gray(
            'Use "scaffold template create" to create your first template.'
          )
        );
        console.log(
          chalk.gray(
            'Or specify a template with: scaffold extend [project] --template <template-name>'
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
    console.log(chalk.yellow('DRY RUN - Would extend project with:'));
    console.log(chalk.blue('Project:'), (manifest as any).projectName);
    console.log(chalk.blue('Templates:'), templateIds);
    console.log(chalk.blue('Variables:'), variables);
    console.log(chalk.blue('Target path:'), targetPath);
    return;
  }

  // Confirmation prompt (unless force mode is enabled)
  if (!force) {
    try {
      const templateId = templateIds[0]; // Since we're only using single template for extend
      const template = await templateService.getTemplate(templateId);
      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: `Add template "${template.name}" to project "${(manifest as any).projectName}"?`,
          default: true,
        },
      ]);

      if (!proceed) {
        console.log(chalk.yellow('Operation cancelled.'));
        return;
      }
    } catch (error) {
      // If template can't be loaded, we'll let the extendProject method handle the error
    }
  }

  if (verbose) {
    console.log(chalk.blue('Extending project with template:'), templateIds[0]);
  }

  // Extend the project with the new template
  const updatedManifest = await extensionService.extendProject(
    targetPath,
    templateIds,
    variables
  );

  console.log(chalk.green('✓ Project extended successfully!'));
  console.log(chalk.blue('Project name:'), updatedManifest.projectName);
  console.log(chalk.blue('Location:'), targetPath);

  // Find the newly added template
  const newTemplate = updatedManifest.templates[updatedManifest.templates.length - 1];
  console.log(chalk.blue('Template added:'), `${newTemplate.name}@${newTemplate.version}`);

  if (verbose) {
    console.log(chalk.blue('Updated at:'), updatedManifest.updated);
    console.log(
      chalk.blue('Total templates:'),
      updatedManifest.templates.filter(t => t.status === 'active').length
    );
  }
}
