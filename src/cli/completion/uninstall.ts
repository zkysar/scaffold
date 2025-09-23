/**
 * CLI command: scaffold completion uninstall
 * Remove shell completion for the scaffold CLI
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { CompletionService } from '@/services';

interface UninstallCommandOptions {
  verbose?: boolean;
}

export function createUninstallCommand(): Command {
  const command = new Command('uninstall');

  command
    .description('Remove shell completion for scaffold CLI')
    .option('--verbose', 'Show detailed output')
    .action(async (options: UninstallCommandOptions) => {
      try {
        await handleUninstallCommand(options);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}

async function handleUninstallCommand(options: UninstallCommandOptions): Promise<void> {
  const verbose = options.verbose || false;

  const completionService = new CompletionService();

  if (verbose) {
    console.log(chalk.blue('Checking completion status...'));
  }

  const shellType = await completionService.detectShell();

  // Check current status
  const status = await completionService.getCompletionStatus(shellType);

  if (!status.isInstalled) {
    console.log(chalk.yellow('Shell completion is not installed.'));
    console.log(chalk.gray('Nothing to remove.'));
    return;
  }

  if (verbose) {
    console.log(chalk.blue('Current status:'));
    console.log(chalk.gray(`  Installed: ${status.isInstalled}`));
    console.log(chalk.gray(`  Enabled: ${status.isEnabled}`));
    console.log(chalk.gray(`  Shell: ${status.shellType}`));
    console.log(chalk.gray(`  Install path: ${status.installPath}`));
  }

  try {
    // Uninstall completion
    await completionService.uninstallCompletion(shellType);

    console.log(chalk.green('✓ Shell completion removed successfully'));

    if (status.installPath) {
      console.log(chalk.gray(`Removed from: ${status.installPath}`));

      // Show manual cleanup instructions if needed
      console.log('');
      console.log(chalk.blue('Manual cleanup (if needed):'));

      switch (status.shellType) {
        case 'bash':
          console.log(chalk.gray('Remove any references to the completion script from ~/.bashrc'));
          break;
        case 'zsh':
          console.log(chalk.gray('Remove any references to the completion script from ~/.zshrc'));
          console.log(chalk.gray('You may need to rebuild completion cache: rm -f ~/.zcompdump*'));
          break;
        case 'fish':
          console.log(chalk.gray('Fish completion will be automatically disabled in new sessions'));
          break;
      }
    }

  } catch (error) {
    console.error(chalk.red('Failed to remove completion:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}