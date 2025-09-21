/**
 * CLI command: scaffold completion script
 * Output shell completion script for manual installation
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { CompletionService } from '../../services';
import { ShellType } from '../../models';

interface ScriptCommandOptions {
  shell?: ShellType;
  instructions?: boolean;
  verbose?: boolean;
}

export function createScriptCommand(): Command {
  const command = new Command('script');

  command
    .description('Output shell completion script')
    .option('-s, --shell <shell>', 'Shell type (bash|zsh|fish)', validateShellType)
    .option('--instructions', 'Show installation instructions with the script')
    .option('--verbose', 'Show detailed output')
    .action(async (options: ScriptCommandOptions) => {
      try {
        await handleScriptCommand(options);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}

async function handleScriptCommand(options: ScriptCommandOptions): Promise<void> {
  const verbose = options.verbose || false;
  const showInstructions = options.instructions || false;

  const completionService = new CompletionService();

  // Determine shell type
  let shellType = options.shell;
  if (!shellType) {
    shellType = await completionService.detectShell();
    if (verbose) {
      console.log(chalk.blue('Detected shell:'), shellType);
    }
  }

  if (verbose) {
    console.log(chalk.blue('Generating completion script for:'), shellType);
  }

  try {
    // Get completion script
    const scriptInfo = await completionService.getCompletionScript(shellType);

    if (showInstructions) {
      // Show header with instructions
      console.log(chalk.blue(`# Shell completion script for scaffold CLI (${shellType})`));
      console.log(chalk.blue('# Installation instructions:'));
      console.log(chalk.blue('# 1. Save this script to a file'));
      console.log(chalk.blue('# 2. Source it in your shell configuration'));
      console.log(chalk.blue('#'));
      console.log('');
    }

    // Output the script
    console.log(scriptInfo.content);

    if (verbose && !showInstructions) {
      console.log('');
      console.log(chalk.blue('Installation instructions:'));
      console.log(chalk.gray('Save this script and source it in your shell configuration'));
    }

  } catch (error) {
    console.error(chalk.red('Failed to generate completion script:'), error instanceof Error ? error.message : String(error));
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