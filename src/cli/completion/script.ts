/**
 * CLI command: scaffold completion script
 * Output shell completion script for manual installation
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { DependencyContainer } from 'tsyringe';
import { CompletionService } from '@/services';
import { ShellType } from '@/models';
import { logger } from '@/lib/logger';

interface ScriptCommandOptions {
  shell?: ShellType;
  instructions?: boolean;
  verbose?: boolean;
}

export function createScriptCommand(container: DependencyContainer): Command {
  const command = new Command('script');

  command
    .description('Output shell completion script')
    .option('-s, --shell <shell>', 'Shell type (bash|zsh|fish)', validateShellType)
    .option('--instructions', 'Show installation instructions with the script')
    .option('--verbose', 'Show detailed output')
    .action(async (options: ScriptCommandOptions) => {
      try {
        await handleScriptCommand(options, container);
      } catch (error) {
        logger.error(chalk.red('Error: ') + (error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }
    });

  return command;
}

async function handleScriptCommand(
  options: ScriptCommandOptions,
  container: DependencyContainer
): Promise<void> {
  const verbose = options.verbose || false;
  const showInstructions = options.instructions || false;

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
    logger.info(chalk.blue('Generating completion script for:') + " " +  shellType);
  }

  try {
    // Get completion script
    const scriptInfo = await completionService.getCompletionScript(shellType);

    if (showInstructions) {
      // Show header with instructions
      logger.info(chalk.blue(`# Shell completion script for scaffold CLI (${shellType})`));
      logger.info(chalk.blue('# Installation instructions:'));
      logger.info(chalk.blue('# 1. Save this script to a file'));
      logger.info(chalk.blue('# 2. Source it in your shell configuration'));
      logger.info(chalk.blue('#'));
      logger.info('');
    }

    // Output the script
    logger.info(scriptInfo.content);

    if (verbose && !showInstructions) {
      logger.info('');
      logger.info(chalk.blue('Installation instructions:'));
      logger.info(chalk.gray('Save this script and source it in your shell configuration'));
    }

  } catch (error) {
    logger.error(chalk.red('Failed to generate completion script: ') + (error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

function validateShellType(value: string): ShellType {
  const validShells = [ShellType.BASH, ShellType.ZSH, ShellType.FISH];

  if (!validShells.includes(value as ShellType)) {
    throw new Error(`Invalid shell type: ${value}. Supported shells: ${validShells.join(', ')}`);
  }

  return value as ShellType;
}
