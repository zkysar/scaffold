/**
 * CLI command: scaffold config <action>
 * Configuration management operations
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { DependencyContainer } from 'tsyringe';

import { logger } from '@/lib/logger';

import { ConfigurationService } from '../../services';


interface ConfigCommandOptions {
  verbose?: boolean;
  dryRun?: boolean;
  global?: boolean;
  workspace?: boolean;
  project?: boolean;
}

export function createConfigCommand(container: DependencyContainer): Command {
  const command = new Command('config');

  command
    .description('Manage configuration settings (get/set/list/reset)')
    .argument('<action>', 'Action to perform (get|set|list|reset)')
    .argument('[key]', 'Configuration key (required for get/set)')
    .argument('[value]', 'Configuration value (required for set)')
    .option('--verbose', 'Show detailed output')
    .option('--dry-run', 'Show what would be done without making changes')
    .option('--global', 'Use global configuration')
    .option('--workspace', 'Use workspace configuration')
    .option('--project', 'Use project configuration')
    .action(
      async (
        action: string,
        key: string,
        value: string,
        options: ConfigCommandOptions
      ) => {
        try {
          await handleConfigCommand(action, key, value, options, container);
        } catch (error) {
          logger.error(
            chalk.red('Error:'),
            error instanceof Error ? error.message : String(error)
          );
          process.exit(1);
        }
      }
    );

  return command;
}

async function handleConfigCommand(
  action: string,
  key: string,
  value: string,
  options: ConfigCommandOptions,
  container: DependencyContainer
): Promise<void> {
  const verbose = options.verbose || false;

  if (verbose) {
    logger.info(chalk.blue('Config action:'), action);
    if (key) logger.info(chalk.blue('Key:'), key);
    if (value) logger.info(chalk.blue('Value:'), value);
    logger.info(chalk.blue('Options:'), JSON.stringify(options, null, 2));
  }

  const configService = container.resolve(ConfigurationService);

  try {
    switch (action.toLowerCase()) {
      case 'list':
        await handleListConfig(configService, options);
        break;
      case 'get':
        await handleGetConfig(configService, key, options);
        break;
      case 'set':
        await handleSetConfig(configService, key, value, options);
        break;
      case 'reset':
        await handleResetConfig(configService, key, options);
        break;
      default:
        logger.error(chalk.red('Error:'), `Unknown action: ${action}`);
        logger.info(chalk.gray('Available actions: list, get, set, reset'));
        process.exit(1);
    }
  } catch (error) {
    throw error;
  }
}

async function handleListConfig(_configService: ConfigurationService, _options: ConfigCommandOptions): Promise<void> {
  logger.info(chalk.green('Configuration Settings:'));
  logger.info(
    chalk.gray(
      '(Implementation pending - would list all configuration settings)'
    )
  );
}

async function handleGetConfig(_configService: ConfigurationService, key: string, _options: ConfigCommandOptions): Promise<void> {
  if (!key) {
    logger.error(
      chalk.red('Error:'),
      'Configuration key is required for get action'
    );
    logger.info(chalk.gray('Usage: scaffold config get <key>'));
    process.exit(1);
  }

  logger.info(chalk.blue('Key:'), key);
  logger.info(
    chalk.gray('(Implementation pending - would get configuration value)')
  );
}

async function handleSetConfig(
  configService: ConfigurationService,
  key: string,
  value: string,
  options: ConfigCommandOptions
): Promise<void> {
  if (!key || !value) {
    logger.error(
      chalk.red('Error:'),
      'Both key and value are required for set action'
    );
    logger.info(chalk.gray('Usage: scaffold config set <key> <value>'));
    process.exit(1);
  }

  if (options.dryRun) {
    logger.info(chalk.yellow('DRY RUN - Would set configuration:'));
    logger.info(chalk.blue('Key:'), key);
    logger.info(chalk.blue('Value:'), value);
    return;
  }

  logger.info(chalk.green('✓ Configuration updated (implementation pending)'));
  logger.info(chalk.blue('Key:'), key);
  logger.info(chalk.blue('Value:'), value);
}

async function handleResetConfig(
  configService: ConfigurationService,
  key: string,
  options: ConfigCommandOptions
): Promise<void> {
  if (options.dryRun) {
    logger.info(chalk.yellow('DRY RUN - Would reset configuration'));
    if (key) logger.info(chalk.blue('Key:'), key);
    return;
  }

  logger.info(chalk.green('✓ Configuration reset (implementation pending)'));
  if (key) {
    logger.info(chalk.blue('Reset key:'), key);
  } else {
    logger.info(chalk.blue('Reset all configuration'));
  }
}
