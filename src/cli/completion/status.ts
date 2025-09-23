/**
 * CLI command: scaffold completion status
 * Check the current status of shell completion
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { CompletionService } from '../../services';

interface StatusCommandOptions {
  verbose?: boolean;
  format?: 'table' | 'json';
}

export function createStatusCommand(): Command {
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
        await handleStatusCommand({ ...options, verbose });
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}

async function handleStatusCommand(options: StatusCommandOptions): Promise<void> {
  const verbose = options.verbose || false;
  const format = options.format || 'table';

  const completionService = new CompletionService();

  try {
    const shellType = await completionService.detectShell();

    // Get completion status
    const status = await completionService.getCompletionStatus(shellType);

    // Output based on format
    switch (format) {
      case 'json':
        console.log(JSON.stringify(status, null, 2));
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
    console.error(chalk.red('Failed to check completion status:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function displayStatusTable(
  status: any,
  verbose: boolean,
  completionService: CompletionService
): Promise<void> {
  console.log(chalk.bold('Shell Completion Status'));
  console.log('─'.repeat(50));

  // Overall status
  if (status.isInstalled && status.isEnabled) {
    console.log(chalk.green('✓ Shell completion is installed and enabled'));
  } else if (status.isInstalled && !status.isEnabled) {
    console.log(chalk.yellow('⚠ Shell completion is installed but not enabled'));
  } else {
    console.log(chalk.red('✗ Shell completion is not installed'));
  }

  console.log('');

  // Detailed information
  console.log(chalk.blue('Details:'));
  console.log(chalk.gray(`  Installed: ${status.isInstalled ? 'Yes' : 'No'}`));
  console.log(chalk.gray(`  Enabled: ${status.isEnabled ? 'Yes' : 'No'}`));

  if (status.isInstalled && status.shellType) {
    console.log(chalk.gray(`  Shell: ${status.shellType}`));
  } else {
    const detectedShell = await completionService.detectShell();
    console.log(chalk.gray(`  Detected shell: ${detectedShell || 'Unknown'}`));
  }

  if (status.installPath) {
    console.log(chalk.gray(`  Install path: ${status.installPath}`));
  }

  if (status.installDate) {
    const date = new Date(status.installDate);
    console.log(chalk.gray(`  Install date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`));
  }

  if (status.version) {
    console.log(chalk.gray(`  Version: ${status.version}`));

    if (status.isUpToDate !== undefined) {
      if (status.isUpToDate) {
        console.log(chalk.gray('  Status: Up to date'));
      } else {
        console.log(chalk.yellow('  Status: Update available'));
      }
    }
  }

  console.log('');

  // Show next steps
  if (!status.isInstalled) {
    console.log(chalk.blue('Next steps:'));
    console.log(chalk.gray('  • Run "scaffold completion install" to install shell completion'));

    const detectedShell = await completionService.detectShell();
    if (detectedShell) {
      console.log(chalk.gray(`  • For ${detectedShell}: scaffold completion install --shell ${detectedShell}`));
    }
  } else if (!status.isEnabled) {
    console.log(chalk.blue('Next steps:'));
    console.log(chalk.gray('  • Follow the shell-specific setup instructions shown during installation'));
    console.log(chalk.gray('  • Restart your shell or reload your profile'));
  } else if (!status.isUpToDate) {
    console.log(chalk.blue('Next steps:'));
    console.log(chalk.gray('  • Run "scaffold completion install --force" to update to the latest version'));
  }

  if (verbose) {
    console.log('');
    console.log(chalk.blue('Verbose information:'));

    // Check if completion script file exists (show even if not fully installed)
    if (status.installPath) {
      const fs = require('fs');
      const exists = fs.existsSync(status.installPath);
      console.log(chalk.gray(`  Script file exists: ${exists ? 'Yes' : 'No'}`));

      if (exists) {
        try {
          const stats = fs.statSync(status.installPath);
          console.log(chalk.gray(`  Script file size: ${stats.size} bytes`));
          console.log(chalk.gray(`  Script modified: ${stats.mtime.toLocaleString()}`));
        } catch (error) {
          console.log(chalk.gray('  Script file info: Unable to read'));
        }
      }
    }

    // Show available shells
    const availableShells = ['bash', 'zsh', 'fish'];
    console.log(chalk.gray(`  Supported shells: ${availableShells.join(', ')}`));
  }
}