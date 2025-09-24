/**
 * CLI command: scaffold completion install
 * Install shell completion for the scaffold CLI
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { DependencyContainer } from 'tsyringe';

import { logger } from '@/lib/logger';
import { ShellType } from '@/models';
import { CompletionService } from '@/services';

interface InstallCommandOptions {
  shell?: ShellType;
  force?: boolean;
  verbose?: boolean;
}

export function createInstallCommand(container: DependencyContainer): Command {
  const command = new Command('install');

  command
    .description('Install shell completion for scaffold CLI')
    .option('-s, --shell <shell>', 'Shell type (bash|zsh|fish)', validateShellType)
    .option('-f, --force', 'Force reinstall if already installed')
    .option('--verbose', 'Show detailed output')
    .action(async (options: InstallCommandOptions, command: Command) => {
      try {
        // Check for global verbose flag from root command
        let rootCommand = command;
        while (rootCommand.parent) {
          rootCommand = rootCommand.parent;
        }
        const rootOptions = rootCommand.opts() || {};
        const verbose = options.verbose || rootOptions.verbose || false;
        await handleInstallCommand({ ...options, verbose }, container);
      } catch (error) {
        logger.error(chalk.red('Error: ') + (error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }
    });

  return command;
}

async function handleInstallCommand(
  options: InstallCommandOptions,
  container: DependencyContainer
): Promise<void> {
  const verbose = options.verbose || false;
  const force = options.force || false;

  const completionService = container.resolve(CompletionService);

  // Determine shell type
  let shellType = options.shell;
  if (!shellType) {
    shellType = await completionService.detectShell();
    if (verbose) {
      logger.info(chalk.blue('Detected shell:') + " " +  shellType);
    }
  }

  if (verbose) {
    logger.info(chalk.blue('Installing completion for:') + " " +  shellType);
    logger.info(chalk.blue('Force reinstall:') + " " +  force);
  }

  try {
    // Check current status
    const status = await completionService.getCompletionStatus(shellType);

    if (status.isInstalled && status.isEnabled && !force) {
      logger.info(chalk.yellow('Shell completion is already installed and enabled.'));
      logger.info(chalk.gray(`Shell: ${status.shellType}`));
      logger.info(chalk.gray(`Install path: ${status.installPath}`));
      logger.info(chalk.gray('Use --force to reinstall'));
      return;
    }

    // Install completion
    const config = await completionService.installCompletion(shellType, force);

    logger.info(chalk.green('✓ Shell completion installed successfully'));
    logger.info(chalk.gray(`Shell: ${shellType}`));
    logger.info(chalk.gray(`Install path: ${config.installPath}`));

    // Show installation instructions
    const script = await completionService.generateCompletionScript(shellType);
    logger.info('');
    logger.info(chalk.blue('To enable completion:'));
    logger.info(chalk.gray('Restart your shell or source your shell configuration file'));

    if (verbose) {
      logger.info('');
      logger.info(chalk.blue('Completion script preview:'));
      logger.info(chalk.gray(script.content.slice(0, 200) + '...'));
    }

  } catch (error) {
    if (error instanceof Error && error.message.includes('already installed')) {
      logger.info(chalk.yellow(error.message));
      return;
    }
    throw error;
  }
}

function validateShellType(value: string): ShellType {
  const validShells = [ShellType.BASH, ShellType.ZSH, ShellType.FISH];

  if (!validShells.includes(value as ShellType)) {
    throw new Error(`Invalid shell type: ${value}. Supported shells: ${validShells.join(', ')}`);
  }

  return value as ShellType;
}
