/**
 * CLI command: scaffold config <action>
 * Configuration management operations
 */

import { Command } from 'commander';
import { DependencyContainer } from 'tsyringe';

import { DisplayFactory } from '@/cli/displays/display-factory';
import { ConfigHandler, ConfigOptions } from '@/cli/handlers/config-handler';

import { CommandExecutor } from './command-executor';
import { COMMAND_METADATA } from './command-metadata';

export function createConfigCommand(container: DependencyContainer): Command {
  const command = new Command(COMMAND_METADATA.config.name);

  command
    .description(COMMAND_METADATA.config.description)
    .argument('<action>', 'Action to perform s(get|set|list|reset)')
    .argument('[key]', 'Configuration key (required for get/set)')
    .argument('[value]', 'Configuration value (required for set)')
    .option('--verbose', 'Show detailed output')
    .option('--dry-run', 'Show what would be done without making changes')
    .option('--global', 'Use global configuration')
    .option('--workspace', 'Use workspace configuration')
    .option('--project', 'Use project configuration')
    .option(
      '-f, --format <format>',
      'Output format (table|json|summary)',
      'table'
    )
    .action(async (action: string, options: ConfigOptions) => {
      // Resolve dependencies from container
      const handler = container.resolve(ConfigHandler);
      const displayFactory = container.resolve(DisplayFactory);
      const executor = container.resolve(CommandExecutor);

      // Create stateless display
      const display = displayFactory.createConfigDisplay();

      // Execute command with common error handling
      await executor.execute(
        () => handler.execute(options),
        result => display.display(result, options)
      );
    });

  return command;
}
