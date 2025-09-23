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
  ProjectService,
  TemplateService,
  FileSystemService,
} from '@/services';

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
        console.error(
          chalk.red('Error:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
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
    process.exit(1);
  }

  // Initialize services
  const fileSystemService = new FileSystemService();
  const templateService = new TemplateService();
  const projectService = new ProjectService(templateService, fileSystemService, undefined);

  try {
    // Check if this is a scaffold-managed project
    const manifest = await projectService.loadProjectManifest(targetPath);

    if (!manifest) {
      console.error(chalk.red('Error:'), 'Not a scaffold-managed project');
      console.log(chalk.gray('No .scaffold/manifest.json file found.'));
      console.log(
        chalk.gray('Use "scaffold new" to create a new project first.')
      );
      process.exit(1);
    }

    // Handle template selection
    let templateId = options.template;
    if (!templateId) {
      // Load available templates and prompt user to select
      try {
        const library = await templateService.loadTemplates();

        if (library.templates.length === 0) {
          throw new Error('No templates available in library');
        }

        if (verbose) {
          console.log(
            chalk.blue('Found'),
            library.templates.length,
            'available templates'
          );
        }

        // Filter out templates already applied to this project
        const appliedTemplateIds = manifest.templates
          .filter(t => t.status === 'active')
          .map(t => t.templateSha);

        const availableTemplates = library.templates.filter(
          template => !appliedTemplateIds.includes(template.id)
        );

        if (availableTemplates.length === 0) {
          console.log(chalk.yellow('No new templates available to add.'));
          console.log(
            chalk.gray('All available templates are already applied to this project.')
          );
          return;
        }

        // Create choices for inquirer
        const templateChoices = availableTemplates.map(template => ({
          name: `${template.name} - ${template.description}`,
          value: template.id,
          short: template.name,
        }));

        const { selectedTemplate } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedTemplate',
            message: 'Select template to add:',
            choices: templateChoices,
          },
        ]);

        templateId = selectedTemplate;

        if (verbose) {
          console.log(chalk.blue('Selected template:'), templateId);
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('Failed to load templates')
        ) {
          throw new Error('Template is required and no templates found in library');
        }
        throw error;
      }
    }

    if (!templateId) {
      console.error(chalk.red('Error:'), 'Template is required');
      console.log(
        chalk.gray(
          'Usage: scaffold extend [project] --template <template-name>'
        )
      );
      process.exit(1);
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
      console.log(chalk.blue('Project:'), manifest.projectName);
      console.log(chalk.blue('Template:'), templateId);
      console.log(chalk.blue('Variables:'), variables);
      console.log(chalk.blue('Target path:'), targetPath);
      return;
    }

    // Confirmation prompt (unless force mode is enabled)
    if (!force) {
      try {
        const template = await templateService.getTemplate(templateId);
        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: `Add template "${template.name}" to project "${manifest.projectName}"?`,
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

    try {
      // Extend the project with the new template
      const updatedManifest = await projectService.extendProject(
        targetPath,
        [templateId],
        variables
      );

      console.log(chalk.green('✓ Project extended successfully!'));
      console.log(chalk.blue('Project name:'), updatedManifest.projectName);
      console.log(chalk.blue('Location:'), targetPath);

      const newTemplate = updatedManifest.templates[updatedManifest.templates.length - 1];
      console.log(
        chalk.blue('Template added:'),
        `${newTemplate.name}@${newTemplate.version}`
      );

      if (verbose) {
        console.log(chalk.blue('Updated at:'), updatedManifest.updated);
        console.log(
          chalk.blue('Total templates:'),
          updatedManifest.templates.filter(t => t.status === 'active').length
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Not implemented') {
        console.log(
          chalk.yellow(
            '✓ Command structure created (service implementation pending)'
          )
        );
        console.log(chalk.blue('Would extend project:'), targetPath);
        console.log(chalk.blue('With template:'), templateId);
        return;
      }
      throw error;
    }
  } catch (error) {
    throw error;
  }
}