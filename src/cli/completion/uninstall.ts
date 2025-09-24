/**
 * CLI command: scaffold completion uninstall
 * Remove shell completion for the scaffold CLI
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { DependencyContainer } from 'tsyringe';

import { logger } from '@/lib/logger';

import { CompletionService } from '../../services';

interface UninstallCommandOptions {
  verbose?: boolean;
}

export function createUninstallCommand(container: DependencyContainer): Command {
  const command = new Command('uninstall');

  command
    .description('Remove shell completion for scaffold CLI')
    .option('--verbose', 'Show detailed output')
    .action(async (options: UninstallCommandOptions, command: Command) => {
      try {
        // Check for global verbose flag from root command
        let rootCommand = command;
        while (rootCommand.parent) {
          rootCommand = rootCommand.parent;
        }
        const rootOptions = rootCommand.opts() || {};
        const verbose = options.verbose || rootOptions.verbose || false;
        await handleUninstallCommand({ ...options, verbose }, container);
      } catch (error) {
        logger.error(chalk.red('Error: ') + (error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }
    });

  return command;
}

async function handleUninstallCommand(
  options: UninstallCommandOptions,
  container: DependencyContainer
): Promise<void> {
  const verbose = options.verbose || false;

  const completionService = container.resolve(CompletionService);

  if (verbose) {
    logger.info(chalk.blue('Checking completion status...'));
  }

  const shellType = await completionService.detectShell();

  // Check current status
  const status = await completionService.getCompletionStatus(shellType);

  if (!status.isInstalled) {
    logger.info(chalk.yellow('Shell completion is not installed.'));
    logger.info(chalk.gray('Nothing to remove.'));
    return;
  }

  if (verbose) {
    logger.info(chalk.blue('Current status:'));
    logger.info(chalk.gray(`  Installed: ${status.isInstalled}`));
    logger.info(chalk.gray(`  Enabled: ${status.isEnabled}`));
    logger.info(chalk.gray(`  Shell: ${status.shellType}`));
    logger.info(chalk.gray(`  Install path: ${status.installPath}`));
  }

  try {
    // Uninstall completion
    await completionService.uninstallCompletion(shellType);

    logger.info(chalk.green('✓ Shell completion removed successfully'));

    if (status.installPath) {
      logger.info(chalk.gray(`Removed from: ${status.installPath}`));

      // Show manual cleanup instructions if needed
      logger.info('');
      logger.info(chalk.blue('Manual cleanup (if needed):'));

      switch (status.shellType) {
        case 'bash':
          logger.info(chalk.gray('Remove any references to the completion script from ~/.bashrc'));
          break;
        case 'zsh':
          logger.info(chalk.gray('Remove any references to the completion script from ~/.zshrc'));
          logger.info(chalk.gray('You may need to rebuild completion cache: rm -f ~/.zcompdump*'));
          break;
        case 'fish':
          logger.info(chalk.gray('Fish completion will be automatically disabled in new sessions'));
          break;
      }
    }

  } catch (error) {
    logger.error(chalk.red('Failed to remove completion: ') + (error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}
