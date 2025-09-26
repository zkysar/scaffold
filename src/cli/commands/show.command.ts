/**
 * CLI command: scaffold show [item]
 * Display information about templates, projects, or configuration
 */

import { Command } from 'commander';
import { DependencyContainer } from 'tsyringe';

import { DisplayFactory } from '@/cli/displays/display-factory';
import { ShowHandler, ShowOptions } from '@/cli/handlers/show-handler';

import { CommandExecutor } from './command-executor';
import { COMMAND_METADATA } from './command-metadata';

export function createShowCommand(container: DependencyContainer): Command {
  const command = new Command(COMMAND_METADATA.show.name);

  command
    .description(COMMAND_METADATA.show.description)
    .argument('[item]', 'Item to show (template|project|config|all)', 'project')
    .option('--verbose', 'Show detailed information')
    .option(
      '-f, --format <format>',
      'Output format (table|json|summary)',
      'table'
    )
    .addHelpText(
      'after',
      `
      Examples:
        scaffold show                    # Show current project info
        scaffold show project            # Show current project info
        scaffold show template           # Show available templates
        scaffold show config             # Show configuration cascade
        scaffold show all                # Show all information
      `
    )
    .action(async (item: string, options: ShowOptions) => {
      // Merge item into options with proper typing
      const fullOptions: ShowOptions = { ...options };

      // Resolve dependencies from container
      const handler = container.resolve(ShowHandler);
      const displayFactory = container.resolve(DisplayFactory);
      const executor = container.resolve(CommandExecutor);

      // Create stateless display
      const display = displayFactory.createShowDisplay();

      // Execute command with common error handling
      await executor.execute(
        () => handler.execute(fullOptions),
        result => display.display(result, fullOptions)
      );
    });

  return command;
}
