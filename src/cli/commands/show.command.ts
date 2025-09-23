/**
 * CLI command: scaffold show [item]
 * Display information about templates, projects, or configuration
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DependencyContainer } from 'tsyringe';
import {
  ProjectManifestService,
  TemplateService,
  ConfigurationService,
  FileSystemService,
} from '../../services';
import { ExitCode } from '../../constants/exit-codes';
import type { ProjectManifest } from '../../models';

interface ShowCommandOptions {
  verbose?: boolean;
  format?: 'table' | 'json' | 'summary';
}

export function createShowCommand(container: DependencyContainer): Command {
  const command = new Command('show');

  command
    .description(
      'Display information about templates, projects, or configuration'
    )
    .argument('[item]', 'Item to show (template|project|config|all)', 'project')
    .option('--verbose', 'Show detailed information')
    .option(
      '-f, --format <format>',
      'Output format (table|json|summary)',
      'table'
    )
    .addHelpText(
      'after',
      `
Examples:
  scaffold show                    # Show current project info
  scaffold show project            # Show current project info
  scaffold show template           # Show available templates
  scaffold show config             # Show configuration cascade
  scaffold show all                # Show all information
`
    )
    .action(async (item: string, options: ShowCommandOptions) => {
      try {
        await handleShowCommand(item, options, container);
      } catch (error) {
        console.error(
          chalk.red('Error:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(ExitCode.SYSTEM_ERROR);
      }
    });

  return command;
}

async function handleShowCommand(
  item: string,
  options: ShowCommandOptions,
  container: DependencyContainer
): Promise<void> {
  const verbose = options.verbose || false;
  const format = options.format || 'table';

  if (verbose) {
    console.log(chalk.blue('Show item:'), item);
    console.log(chalk.blue('Format:'), format);
  }

  try {
    switch (item.toLowerCase()) {
      case 'project':
        await showProjectInfo(options, container);
        break;
      case 'template':
      case 'templates':
        await showTemplateInfo(options, container);
        break;
      case 'config':
      case 'configuration':
        await showConfigurationInfo(options, container);
        break;
      case 'all':
        await showAllInfo(options, container);
        break;
      default:
        console.error(chalk.red('Error:'), `Unknown item: ${item}`);
        console.log(
          chalk.gray('Available items: project, template, config, all')
        );
        process.exit(ExitCode.USER_ERROR);
    }
  } catch (error) {
    throw error;
  }
}

async function showProjectInfo(
  options: ShowCommandOptions,
  container: DependencyContainer
): Promise<void> {
  const verbose = options.verbose || false;
  const format = options.format || 'table';

  console.log(chalk.green('Project Information:'));
  console.log('');

  try {
    const fileSystemService = container.resolve(FileSystemService);
    const manifestService = container.resolve(ProjectManifestService);

    // Try to load manifest
    const manifestPath = path.join(process.cwd(), '.scaffold', 'manifest.json');
    let manifest: ProjectManifest | null = null;

    try {
      if (fs.existsSync(manifestPath)) {
        const manifestContent = fs.readFileSync(manifestPath, 'utf8');
        manifest = JSON.parse(manifestContent);
      }
    } catch (parseError) {
      // Handle JSON parsing errors
      console.error(chalk.red('Error:'), 'Malformed project manifest file.');
      console.log(
        chalk.gray('The .scaffold/manifest.json file contains invalid JSON.')
      );
      process.exit(ExitCode.USER_ERROR);
    }

    if (!manifest) {
      console.log(
        chalk.yellow('This directory is not a scaffold-managed project.')
      );
      console.log(
        chalk.gray(
          'Use "scaffold new" to create a new project or "scaffold check" to validate.'
        )
      );
      return;
    }

    if (format === 'json') {
      console.log(JSON.stringify(manifest, null, 2));
      return;
    }

    console.log(chalk.blue('Project Name:'), manifest.projectName);
    console.log(chalk.blue('Version:'), manifest.version);
    console.log(chalk.blue('Created:'), manifest.created);
    console.log(chalk.blue('Last Updated:'), manifest.updated);

    if (manifest.templates.length > 0) {
      console.log(chalk.blue('Applied Templates:'));
      for (const template of manifest.templates) {
        console.log(chalk.gray('  -'), `${template.name}@${template.version}`);
        if (verbose) {
          console.log(chalk.gray('    Applied:'), template.appliedAt);
        }
      }
    } else {
      console.log(chalk.yellow('No templates applied'));
    }

    if (Object.keys(manifest.variables).length > 0) {
      console.log(chalk.blue('Variables:'));
      for (const [key, value] of Object.entries(manifest.variables)) {
        console.log(chalk.gray('  -'), `${key}: ${value}`);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('No manifest found')) {
        console.log(
          chalk.yellow('This directory is not a scaffold-managed project.')
        );
        console.log(
          chalk.gray(
            'Use "scaffold new" to create a new project or "scaffold check" to validate.'
          )
        );
        return;
      } else if (error.message.includes('Failed to read JSON file') ||
                 error.message.includes('Unexpected token') ||
                 error.message.includes('JSON') ||
                 error.message.includes('invalid json')) {
        // Handle malformed manifest
        console.error(chalk.red('Error:'), 'Malformed project manifest file.');
        console.log(
          chalk.gray('The .scaffold/manifest.json file contains invalid JSON.')
        );
        process.exit(ExitCode.USER_ERROR);
      }
    }
    throw error;
  }
}

async function showTemplateInfo(
  options: ShowCommandOptions,
  container: DependencyContainer
): Promise<void> {
  const format = options.format || 'table';

  console.log(chalk.green('Template Information:'));
  console.log('');

  const templateService = container.resolve(TemplateService);
  const library = await templateService.loadTemplates();

  if (format === 'json') {
    console.log(JSON.stringify(library.templates, null, 2));
    return;
  }

  if (library.templates.length === 0) {
    console.log(chalk.yellow('No templates available.'));
    console.log(
      chalk.gray(
        'Use "scaffold template create" to create your first template.'
      )
    );
    return;
  }

  console.log(chalk.blue(`Found ${library.templates.length} template(s):`))
  console.log('');

  for (const template of library.templates) {
      console.log(chalk.bold(template.name), chalk.gray(`(${template.id})`));
      console.log(chalk.gray('  Version:'), template.version);
      console.log(chalk.gray('  Description:'), template.description);
      console.log('');
    }

  console.log(chalk.blue('Total:'), library.templates.length, 'templates');
}

async function showConfigurationInfo(
  options: ShowCommandOptions,
  container: DependencyContainer
): Promise<void> {
  const format = options.format || 'table';

  console.log(chalk.green('Configuration Information:'));
  console.log('');

  try {
    const configService = container.resolve(ConfigurationService);
    await configService.loadConfiguration();
    const config = configService.getEffectiveConfiguration();

    if (format === 'json') {
      console.log(JSON.stringify(config, null, 2));
      return;
    }

    console.log(
      chalk.blue('Templates Directory:'),
      config.paths?.templatesDir || 'Not configured'
    );
    console.log(
      chalk.blue('Cache Directory:'),
      config.paths?.cacheDir || 'Not configured'
    );
    console.log(
      chalk.blue('Backup Directory:'),
      config.paths?.backupDir || 'Not configured'
    );
    console.log(
      chalk.blue('Strict Mode Default:'),
      config.preferences?.strictModeDefault ? 'Enabled' : 'Disabled'
    );
    console.log(
      chalk.blue('Color Output:'),
      config.preferences?.colorOutput ? 'Yes' : 'No'
    );
    console.log(
      chalk.blue('Verbose Output:'),
      config.preferences?.verboseOutput ? 'Yes' : 'No'
    );
    console.log(
      chalk.blue('Confirm Destructive:'),
      config.preferences?.confirmDestructive ? 'Yes' : 'No'
    );
    console.log(
      chalk.blue('Backup Before Sync:'),
      config.preferences?.backupBeforeSync ? 'Yes' : 'No'
    );
  } catch (error) {
    // If anything fails, show basic default information
    console.log(chalk.blue('Templates Directory:'), 'Not configured');
    console.log(chalk.blue('Cache Directory:'), 'Not configured');
    console.log(chalk.blue('Backup Directory:'), 'Not configured');
    console.log(chalk.blue('Strict Mode Default:'), 'Disabled');
    console.log(chalk.blue('Color Output:'), 'Yes');
    console.log(chalk.blue('Verbose Output:'), 'No');
    console.log(chalk.blue('Confirm Destructive:'), 'Yes');
    console.log(chalk.blue('Backup Before Sync:'), 'Yes');
  }
}

async function showAllInfo(
  options: ShowCommandOptions,
  container: DependencyContainer
): Promise<void> {
  console.log(chalk.green('=== Scaffold Information ==='));
  console.log('');

  await showProjectInfo(options, container);
  console.log('');

  await showTemplateInfo(options, container);
  console.log('');

  await showConfigurationInfo(options, container);
}
