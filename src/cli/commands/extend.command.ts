/**
 * CLI command: scaffold extend <project>
 * Add templates to existing project
 */

import { Command } from 'commander';
import { DependencyContainer } from 'tsyringe';

import { DisplayFactory } from '@/cli/displays/display-factory';
import { ExtendHandler, ExtendOptions } from '@/cli/handlers/extend-handler';

import { CommandExecutor } from './command-executor';
import { COMMAND_METADATA } from './command-metadata';

export function createExtendCommand(container: DependencyContainer): Command {
  const command = new Command(COMMAND_METADATA.extend.name);

  command
    .description(COMMAND_METADATA.extend.description)
    .argument(
      '[project]',
      'Project directory path (defaults to current directory)'
    )
    .option('--template <name>', 'Template name or ID to add')
    .option('--variables <json>', 'Variables as JSON string')
    .option('--verbose', 'Show detailed extend output')
    .option('--dry-run', 'Show what would be extended without making changes')
    .option('--force', 'Add template without confirmation prompts')
    .option(
      '-f, --format <format>',
      'Output format (table|json|summary)',
      'table'
    )
    .action(async (projectPath: string | undefined, options: ExtendOptions) => {
      // Merge projectPath into options with proper typing
      const fullOptions: ExtendOptions = { ...options };

      // Resolve dependencies from container
      const handler = container.resolve(ExtendHandler);
      const displayFactory = container.resolve(DisplayFactory);
      const executor = container.resolve(CommandExecutor);

      // Create stateless display
      const display = displayFactory.createExtendDisplay();

      // Execute command with common error handling
      await executor.execute(
        () => handler.execute(fullOptions),
        result => display.display(result, fullOptions)
      );
    });

  return command;
}
