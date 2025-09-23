/**
 * CLI command: scaffold show [item]
 * Display information about templates, projects, or configuration
 */

import { Command } from 'commander';
import chalk from 'chalk';
import {
  ProjectManifestService,
  TemplateService,
  ConfigurationService,
  FileSystemService,
} from '@/services';

interface ShowCommandOptions {
  verbose?: boolean;
  format?: 'table' | 'json' | 'summary';
}

export function createShowCommand(): Command {
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
        await handleShowCommand(item, options);
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

async function handleShowCommand(
  item: string,
  options: ShowCommandOptions
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
        await showProjectInfo(options);
        break;
      case 'template':
      case 'templates':
        await showTemplateInfo(options);
        break;
      case 'config':
      case 'configuration':
        await showConfigurationInfo(options);
        break;
      case 'all':
        await showAllInfo(options);
        break;
      default:
        console.error(chalk.red('Error:'), `Unknown item: ${item}`);
        console.log(
          chalk.gray('Available items: project, template, config, all')
        );
        process.exit(1);
    }
  } catch (error) {
    throw error;
  }
}

async function showProjectInfo(options: ShowCommandOptions): Promise<void> {
  const verbose = options.verbose || false;
  const format = options.format || 'table';

  console.log(chalk.green('Project Information:'));
  console.log('');

  try {
    const fileSystemService = new FileSystemService();
    const manifestService = new ProjectManifestService(fileSystemService);

    const manifest = await manifestService.loadProjectManifest(process.cwd());

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
    if (error instanceof Error && error.message.includes('No manifest found')) {
      console.log(
        chalk.yellow('This directory is not a scaffold-managed project.')
      );
      console.log(
        chalk.gray(
          'Use "scaffold new" to create a new project or "scaffold check" to validate.'
        )
      );
    } else {
      throw error;
    }
  }
}

async function showTemplateInfo(options: ShowCommandOptions): Promise<void> {
  const format = options.format || 'table';

  console.log(chalk.green('Template Information:'));
  console.log('');

  const templateService = new TemplateService();
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

  for (const template of library.templates) {
    console.log(chalk.bold(template.name), chalk.gray(`(${template.id})`));
    console.log(chalk.gray('  Version:'), template.version);
    console.log(chalk.gray('  Description:'), template.description);
    console.log('');
  }

  console.log(chalk.blue('Total:'), library.templates.length, 'templates');
}

async function showConfigurationInfo(
  options: ShowCommandOptions
): Promise<void> {
  const format = options.format || 'table';

  console.log(chalk.green('Configuration Information:'));
  console.log('');

  try {
    const configService = new ConfigurationService();
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
    throw error;
  }
}

async function showAllInfo(options: ShowCommandOptions): Promise<void> {
  console.log(chalk.green('=== Scaffold Information ==='));
  console.log('');

  await showProjectInfo(options);
  console.log('');

  await showTemplateInfo(options);
  console.log('');

  await showConfigurationInfo(options);
}
