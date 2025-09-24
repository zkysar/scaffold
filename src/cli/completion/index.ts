/**
 * CLI command group: scaffold completion
 * Manages shell completion for the scaffold CLI
 */

import { Command } from 'commander';
import { DependencyContainer } from 'tsyringe';

import { logger } from '@/lib/logger';

import { createCompleteCommand } from './complete';
import { createInstallCommand } from './install';
import { createScriptCommand } from './script';
import { createStatusCommand } from './status';
import { createUninstallCommand } from './uninstall';


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
    logger.info('');
    logger.info('Examples:');
    logger.info('  $ scaffold completion install              # Auto-detect shell and install');
    logger.info('  $ scaffold completion install --shell zsh # Install for specific shell');
    logger.info('  $ scaffold completion status              # Check installation status');
    logger.info('  $ scaffold completion script --shell bash # Output completion script');
    logger.info('  $ scaffold completion uninstall           # Remove completion');
    logger.info('');
    logger.info('Supported shells:');
    logger.info('  bash, zsh, fish');
    logger.info('');
    logger.info('Notes:');
    logger.info('  • Shell completion provides command, option, and argument suggestions');
    logger.info('  • Auto-detection works by examining the SHELL environment variable');
    logger.info('  • Manual setup may be required depending on your shell configuration');
  });

  return command;
}