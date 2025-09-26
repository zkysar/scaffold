/**
 * CLI command: scaffold fix [project]
 * Fix project structure issues
 */

import { Command } from 'commander';
import { DependencyContainer } from 'tsyringe';

import { DisplayFactory } from '@/cli/displays/display-factory';
import { FixHandler, FixOptions } from '@/cli/handlers/fix-handler';

import { CommandExecutor } from './command-executor';
import { COMMAND_METADATA } from './command-metadata';

export function createFixCommand(container: DependencyContainer): Command {
  const command = new Command(COMMAND_METADATA.fix.name);

  command
    .description(COMMAND_METADATA.fix.description)
    .argument(
      '[project]',
      'Project directory path (defaults to current directory)'
    )
    .option('--verbose', 'Show detailed fix output')
    .option('--dry-run', 'Show what would be fixed without making changes')
    .option('--force', 'Fix issues without confirmation prompts')
    .option('--backup', 'Create backup before making changes', true)
    .option('--no-backup', 'Skip backup creation')
    .option(
      '-f, --format <format>',
      'Output format (table|json|summary)',
      'table'
    )
    .action(async (projectPath: string | undefined, options: FixOptions) => {
      // Merge projectPath into options with proper typing
      const fullOptions: FixOptions = { ...options };

      // Resolve dependencies from container
      const handler = container.resolve(FixHandler);
      const displayFactory = container.resolve(DisplayFactory);
      const executor = container.resolve(CommandExecutor);

      // Create stateless display
      const display = displayFactory.createFixDisplay();

      // Execute command with common error handling
      await executor.execute(
        () => handler.execute(fullOptions),
        result => display.display(result, fullOptions)
      );
    });

  return command;
}
