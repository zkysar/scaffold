/**
 * CLI command: scaffold completion status
 * Check the current status of shell completion
 */

import { existsSync, statSync } from 'fs';

import chalk from 'chalk';
import { Command } from 'commander';
import { DependencyContainer } from 'tsyringe';

import { createLogger, logger } from '../../lib/logger';
import type { CompletionConfig } from '../../models';
import { CompletionService } from '../../services';

interface StatusCommandOptions {
  verbose?: boolean;
  format?: 'table' | 'json';
}

export function createStatusCommand(container: DependencyContainer): Command {
  const command = new Command('status');

  command
    .description('Check shell completion status')
    .option('--verbose', 'Show detailed status information')
    .option('-f, --format <format>', 'Output format (table|json)', 'table')
    .action(async (options: StatusCommandOptions, command: Command) => {
      try {
        // Check for global verbose flag from root command
        let rootCommand = command;
        while (rootCommand.parent) {
          rootCommand = rootCommand.parent;
        }
        const rootOptions = rootCommand.opts() || {};
        const verbose = options.verbose || rootOptions.verbose || false;
        await handleStatusCommand({ ...options, verbose }, container);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}

async function handleStatusCommand(
  options: StatusCommandOptions,
  container: DependencyContainer
): Promise<void> {
  const verbose = options.verbose || false;
  const format = options.format || 'table';

  // Create logger with command options
  const cmdLogger = createLogger({ verbose });

  const completionService = container.resolve(CompletionService);

  try {
    const shellType = await completionService.detectShell();

    // Get completion status
    const status = await completionService.getCompletionStatus(shellType);

    // Output based on format
    switch (format) {
      case 'json':
        cmdLogger.raw(JSON.stringify(status, null, 2));
        break;
      case 'table':
      default:
        await displayStatusTable(status, verbose, completionService);
        break;
    }

    // Set exit code based on status
    if (!status.isInstalled || !status.isEnabled) {
      process.exit(1);
    }

  } catch (error) {
    cmdLogger.error(`Failed to check completion status: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

async function displayStatusTable(
  status: CompletionConfig,
  verbose: boolean,
  completionService: CompletionService
): Promise<void> {
  logger.info(chalk.bold('Shell Completion Status'));
  logger.info('─'.repeat(50));

  // Overall status
  if (status.isInstalled && status.isEnabled) {
    logger.info(chalk.green('✓ Shell completion is installed and enabled'));
  } else if (status.isInstalled && !status.isEnabled) {
    logger.info(chalk.yellow('⚠ Shell completion is installed but not enabled'));
  } else {
    logger.info(chalk.red('✗ Shell completion is not installed'));
  }

  logger.info('');

  // Detailed information
  logger.info(chalk.blue('Details:'));
  logger.info(chalk.gray(`  Installed: ${status.isInstalled ? 'Yes' : 'No'}`));
  logger.info(chalk.gray(`  Enabled: ${status.isEnabled ? 'Yes' : 'No'}`));

  if (status.isInstalled && status.shellType) {
    logger.info(chalk.gray(`  Shell: ${status.shellType}`));
  } else {
    const detectedShell = await completionService.detectShell();
    logger.info(chalk.gray(`  Detected shell: ${detectedShell || 'Unknown'}`));
  }

  if (status.installPath) {
    logger.info(chalk.gray(`  Install path: ${status.installPath}`));
  }

  if (status.installDate) {
    const date = new Date(status.installDate);
    logger.info(chalk.gray(`  Install date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`));
  }

  if (status.installedVersion) {
    logger.info(chalk.gray(`  Version: ${status.installedVersion}`));
  }

  logger.info('');

  // Show next steps
  if (!status.isInstalled) {
    logger.info(chalk.blue('Next steps:'));
    logger.info(chalk.gray('  • Run "scaffold completion install" to install shell completion'));

    const detectedShell = await completionService.detectShell();
    if (detectedShell) {
      logger.info(chalk.gray(`  • For ${detectedShell}: scaffold completion install --shell ${detectedShell}`));
    }
  } else if (!status.isEnabled) {
    logger.info(chalk.blue('Next steps:'));
    logger.info(chalk.gray('  • Follow the shell-specific setup instructions shown during installation'));
    logger.info(chalk.gray('  • Restart your shell or reload your profile'));
  }

  if (verbose) {
    logger.info('');
    logger.info(chalk.blue('Verbose information:'));

    // Check if completion script file exists (show even if not fully installed)
    if (status.installPath) {
      const exists = existsSync(status.installPath);
      logger.info(chalk.gray(`  Script file exists: ${exists ? 'Yes' : 'No'}`));

      if (exists) {
        try {
          const stats = statSync(status.installPath);
          logger.info(chalk.gray(`  Script file size: ${stats.size} bytes`));
          logger.info(chalk.gray(`  Script modified: ${stats.mtime.toLocaleString()}`));
        } catch (error) {
          logger.info(chalk.gray('  Script file info: Unable to read'));
        }
      }
    }

    // Show available shells
    const availableShells = ['bash', 'zsh', 'fish'];
    logger.info(chalk.gray(`  Supported shells: ${availableShells.join(', ')}`));
  }
}