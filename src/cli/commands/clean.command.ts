/**
 * CLI command: scaffold clean
 * Cleanup temporary files and cache
 */

import { Command } from 'commander';
import { DependencyContainer } from 'tsyringe';

import { DisplayFactory } from '@/cli/displays/display-factory';
import { CleanHandler, CleanOptions } from '@/cli/handlers/clean-handler';

import { CommandExecutor } from './command-executor';
import { COMMAND_METADATA } from './command-metadata';

export function createCleanCommand(container: DependencyContainer): Command {
  const command = new Command(COMMAND_METADATA.clean.name);

  command
    .description(COMMAND_METADATA.clean.description)
    .option('--all', 'Clean all temporary files and cache')
    .option('--cache', 'Clean cache files')
    .option('--temp', 'Clean temporary files (default)')
    .option('--dry-run', 'Show what would be cleaned without actually cleaning')
    .option('--verbose', 'Show detailed output')
    .option(
      '-f, --format <format>',
      'Output format (table|json|summary)',
      'table'
    )
    .action(async (options: CleanOptions) => {
      // Resolve dependencies from container
      const handler = container.resolve(CleanHandler);
      const displayFactory = container.resolve(DisplayFactory);
      const executor = container.resolve(CommandExecutor);

      // Create stateless display
      const display = displayFactory.createCleanDisplay();

      // Execute command with common error handling
      await executor.execute(
        () => handler.execute(options),
        result => display.display(result, options)
      );
    });

  return command;
}
