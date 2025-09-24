/**
 * CLI command: scaffold show [item]
 * Display information about templates, projects, or configuration
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { DependencyContainer } from 'tsyringe';
import { logger } from '@/lib/logger';
import {
  ProjectManifestService,
  TemplateService,
  ConfigurationService,
  FileSystemService,
} from '../../services';

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
        logger.error(
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
  options: ShowCommandOptions,
  container: DependencyContainer
): Promise<void> {
  const verbose = options.verbose || false;
  const format = options.format || 'table';

  if (verbose) {
    logger.info(chalk.blue('Show item:') + " " +  item);
    logger.info(chalk.blue('Format:') + " " +  format);
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
        logger.error(chalk.red('Error:') + " " +  `Unknown item: ${item}`);
        logger.info(
          chalk.gray('Available items: project, template, config, all')
        );
        process.exit(1);
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

  logger.info(chalk.green('Project Information:'));
  logger.info('');

  try {
    const fileSystemService = container.resolve(FileSystemService);
    const manifestService = container.resolve(ProjectManifestService);

    const manifest = await manifestService.loadProjectManifest(process.cwd());

    if (!manifest) {
      logger.info(
        chalk.yellow('This directory is not a scaffold-managed project.')
      );
      logger.info(
        chalk.gray(
          'Use "scaffold new" to create a new project or "scaffold check" to validate.'
        )
      );
      return;
    }

    if (format === 'json') {
      logger.info(JSON.stringify(manifest + " " + null + " " + 2));
      return;
    }

    logger.info(chalk.blue('Project Name:') + " " +  manifest.projectName);
    logger.info(chalk.blue('Version:') + " " +  manifest.version);
    logger.info(chalk.blue('Created:') + " " +  manifest.created);
    logger.info(chalk.blue('Last Updated:') + " " +  manifest.updated);

    if (manifest.templates.length > 0) {
      logger.info(chalk.blue('Applied Templates:'));
      for (const template of manifest.templates) {
        logger.info(chalk.gray('  -') + " " +  `${template.name}@${template.version}`);
        if (verbose) {
          logger.info(chalk.gray('    Applied:') + " " +  template.appliedAt);
        }
      }
    } else {
      logger.info(chalk.yellow('No templates applied'));
    }

    if (Object.keys(manifest.variables).length > 0) {
      logger.info(chalk.blue('Variables:'));
      for (const [key, value] of Object.entries(manifest.variables)) {
        logger.info(chalk.gray('  -') + " " +  `${key}: ${value}`);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('No manifest found')) {
      logger.info(
        chalk.yellow('This directory is not a scaffold-managed project.')
      );
      logger.info(
        chalk.gray(
          'Use "scaffold new" to create a new project or "scaffold check" to validate.'
        )
      );
    } else {
      throw error;
    }
  }
}

async function showTemplateInfo(
  options: ShowCommandOptions,
  container: DependencyContainer
): Promise<void> {
  const format = options.format || 'table';

  logger.info(chalk.green('Template Information:'));
  logger.info('');

  const templateService = container.resolve(TemplateService);
  const library = await templateService.loadTemplates();

  if (format === 'json') {
    logger.info(JSON.stringify(library.templates + " " + null + " " + 2));
    return;
  }

  if (library.templates.length === 0) {
    logger.info(chalk.yellow('No templates available.'));
    logger.info(
      chalk.gray(
        'Use "scaffold template create" to create your first template.'
      )
    );
    return;
  }

  for (const template of library.templates) {
    logger.info(chalk.bold(template.name) + " " +  chalk.gray(`(${template.id})`));
    logger.info(chalk.gray('  Version:') + " " +  template.version);
    logger.info(chalk.gray('  Description:') + " " +  template.description);
    logger.info('');
  }

  logger.info(chalk.blue('Total: ') + library.templates.length + ' templates');
}

async function showConfigurationInfo(
  options: ShowCommandOptions,
  container: DependencyContainer
): Promise<void> {
  const format = options.format || 'table';

  logger.info(chalk.green('Configuration Information:'));
  logger.info('');

  try {
    const configService = container.resolve(ConfigurationService);
    await configService.loadConfiguration();
    const config = configService.getEffectiveConfiguration();

    if (format === 'json') {
      logger.info(JSON.stringify(config + " " + null + " " + 2));
      return;
    }

    logger.info(
      chalk.blue('Templates Directory: ') + (config.paths?.templatesDir || 'Not configured')
    );
    logger.info(
      chalk.blue('Cache Directory: ') + (config.paths?.cacheDir || 'Not configured')
    );
    logger.info(
      chalk.blue('Backup Directory: ') + (config.paths?.backupDir || 'Not configured')
    );
    logger.info(
      chalk.blue('Strict Mode Default: ') + (config.preferences?.strictModeDefault ? 'Enabled' : 'Disabled')
    );
    logger.info(
      chalk.blue('Color Output: ') + (config.preferences?.colorOutput ? 'Yes' : 'No')
    );
    logger.info(
      chalk.blue('Verbose Output: ') + (config.preferences?.verboseOutput ? 'Yes' : 'No')
    );
    logger.info(
      chalk.blue('Confirm Destructive: ') + (config.preferences?.confirmDestructive ? 'Yes' : 'No')
    );
    logger.info(
      chalk.blue('Backup Before Sync: ') + (config.preferences?.backupBeforeSync ? 'Yes' : 'No')
    );
  } catch (error) {
    throw error;
  }
}

async function showAllInfo(
  options: ShowCommandOptions,
  container: DependencyContainer
): Promise<void> {
  logger.info(chalk.green('=== Scaffold Information ==='));
  logger.info('');

  await showProjectInfo(options, container);
  logger.info('');

  await showTemplateInfo(options, container);
  logger.info('');

  await showConfigurationInfo(options, container);
}
