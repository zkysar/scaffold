/**
 * CLI command group: scaffold completion
 * Manages shell completion for the scaffold CLI
 */

import { Command } from 'commander';
import { DependencyContainer } from 'tsyringe';
import { createInstallCommand } from './install';
import { createUninstallCommand } from './uninstall';
import { createStatusCommand } from './status';
import { createScriptCommand } from './script';
import { createCompleteCommand } from './complete';

export function createCompletionCommand(container: DependencyContainer): Command {
  const command = new Command('completion');

  command
    .description('Manage shell completion for scaffold CLI')
    .configureHelp({
      sortSubcommands: true,
      showGlobalOptions: false,
    });

  // Add subcommands
  command.addCommand(createInstallCommand(container));
  command.addCommand(createUninstallCommand(container));
  command.addCommand(createStatusCommand(container));
  command.addCommand(createScriptCommand(container));

  // Add hidden command for dynamic completion
  command.addCommand(createCompleteCommand(container));

  // Add help text
  command.on('--help', () => {
    console.log('');
    console.log('Examples:');
    console.log('  $ scaffold completion install              # Auto-detect shell and install');
    console.log('  $ scaffold completion install --shell zsh # Install for specific shell');
    console.log('  $ scaffold completion status              # Check installation status');
    console.log('  $ scaffold completion script --shell bash # Output completion script');
    console.log('  $ scaffold completion uninstall           # Remove completion');
    console.log('');
    console.log('Supported shells:');
    console.log('  bash, zsh, fish');
    console.log('');
    console.log('Notes:');
    console.log('  • Shell completion provides command, option, and argument suggestions');
    console.log('  • Auto-detection works by examining the SHELL environment variable');
    console.log('  • Manual setup may be required depending on your shell configuration');
  });

  return command;
}