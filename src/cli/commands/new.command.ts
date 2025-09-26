/**
 * CLI command: scaffold new <project>
 * Create new project from template
 */

import { Command } from 'commander';
import { DependencyContainer } from 'tsyringe';

import { DisplayFactory } from '@/cli/displays/display-factory';
import { NewHandler, NewOptions } from '@/cli/handlers/new-handler';

import { CommandExecutor } from './command-executor';
import { COMMAND_METADATA } from './command-metadata';

export function createNewCommand(container: DependencyContainer): Command {
  const command = new Command(COMMAND_METADATA.new.name);

  command
    .description(COMMAND_METADATA.new.description)
    .argument('[project]', 'Project name')
    .option('-t, --template <template>', 'Template ID or name to use')
    .option(
      '-p, --path <path>',
      'Target directory path (defaults to current directory)'
    )
    .option('-v, --variables <variables>', 'JSON string of template variables')
    .option('--verbose', 'Show detailed output')
    .option('--dry-run', 'Show what would be created without creating anything')
    .option(
      '-f, --format <format>',
      'Output format (table|json|summary)',
      'table'
    )
    .action(async (projectPath: string | undefined, options: NewOptions) => {
      // Merge projectPath into options with proper typing
      const fullOptions: NewOptions = { ...options };

      // Resolve dependencies from container
      const handler = container.resolve(NewHandler);
      const displayFactory = container.resolve(DisplayFactory);
      const executor = container.resolve(CommandExecutor);

      // Create stateless display
      const display = displayFactory.createNewDisplay();

      // Execute command with common error handling
      await executor.execute(
        () => handler.execute(fullOptions),
        result => display.display(result, fullOptions)
      );
    });

  return command;
}
