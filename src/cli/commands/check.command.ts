/**
 * CLI command: scaffold check [project]
 * Validate project structure against applied templates
 */

import { Command } from 'commander';
import { DependencyContainer } from 'tsyringe';

import { DisplayFactory } from '@/cli/displays/display-factory';
import { CheckHandler, CheckOptions } from '@/cli/handlers/check-handler';

import { CommandExecutor } from './command-executor';
import { COMMAND_METADATA } from './command-metadata';

export function createCheckCommand(container: DependencyContainer): Command {
  const command = new Command(COMMAND_METADATA.check.name);

  command
    .description(COMMAND_METADATA.check.description)
    .argument(
      '[project]',
      'Project directory path (defaults to current directory)'
    )
    .option('--verbose', 'Show detailed validation output')
    .option('--strict', 'Use strict mode validation')
    .option('-c, --config <path>', 'Path to configuration file')
    .option(
      '-f, --format <format>',
      'Output format (table|json|summary)',
      'table'
    )
    .action(async (projectPath: string | undefined, options: CheckOptions) => {
      // Merge projectPath into options with proper typing
      const fullOptions: CheckOptions = { ...options };

      // Resolve dependencies from container
      const handler = container.resolve(CheckHandler);
      const displayFactory = container.resolve(DisplayFactory);
      const executor = container.resolve(CommandExecutor);

      // Create stateless display
      const display = displayFactory.createCheckDisplay();

      // Execute command with common error handling
      await executor.execute(
        () => handler.execute(fullOptions),
        result => display.display(result, fullOptions)
      );
    });

  return command;
}
