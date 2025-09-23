/**
 * CLI command: scaffold completion install
 * Install shell completion for the scaffold CLI
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { CompletionService } from '../../services';
import { ShellType } from '../../models';

interface InstallCommandOptions {
  shell?: ShellType;
  force?: boolean;
  verbose?: boolean;
}

export function createInstallCommand(): Command {
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
        await handleInstallCommand({ ...options, verbose });
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}

async function handleInstallCommand(options: InstallCommandOptions): Promise<void> {
  const verbose = options.verbose || false;
  const force = options.force || false;


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
    console.log(chalk.blue('Installing completion for:'), shellType);
    console.log(chalk.blue('Force reinstall:'), force);
  }

  try {
    // Check current status
    const status = await completionService.getCompletionStatus(shellType);

    if (status.isInstalled && status.isEnabled && !force) {
      console.log(chalk.yellow('Shell completion is already installed and enabled.'));
      console.log(chalk.gray(`Shell: ${status.shellType}`));
      console.log(chalk.gray(`Install path: ${status.installPath}`));
      console.log(chalk.gray('Use --force to reinstall'));
      return;
    }

    // Install completion
    const config = await completionService.installCompletion(shellType, force);

    console.log(chalk.green('✓ Shell completion installed successfully'));
    console.log(chalk.gray(`Shell: ${shellType}`));
    console.log(chalk.gray(`Install path: ${config.installPath}`));

    // Show installation instructions
    const script = await completionService.generateCompletionScript(shellType);
    console.log('');
    console.log(chalk.blue('To enable completion:'));
    console.log(chalk.gray('Restart your shell or source your shell configuration file'));

    if (verbose) {
      console.log('');
      console.log(chalk.blue('Completion script preview:'));
      console.log(chalk.gray(script.content.slice(0, 200) + '...'));
    }

  } catch (error) {
    if (error instanceof Error && error.message.includes('already installed')) {
      console.log(chalk.yellow(error.message));
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