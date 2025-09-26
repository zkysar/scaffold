/**
 * CLI command: scaffold template <action>
 * Template management operations
 */

import { Command } from 'commander';
import { DependencyContainer } from 'tsyringe';

import { DisplayFactory } from '@/cli/displays/display-factory';
import {
  TemplateHandler,
  TemplateOptions,
} from '@/cli/handlers/template-handler';

import { CommandExecutor } from './command-executor';
import { COMMAND_METADATA } from './command-metadata';

export function createTemplateCommand(container: DependencyContainer): Command {
  const command = new Command(COMMAND_METADATA.template.name);

  command
    .description(COMMAND_METADATA.template.description)
    .argument(
      '<action>',
      'Action to perform (create|list|delete|export|import|alias)'
    )
    .argument(
      '[identifier]',
      'Template SHA/alias or file path (required for some actions)'
    )
    .argument('[alias]', 'New alias (required for alias action)')
    .option('--verbose', 'Show detailed output')
    .option('--dry-run', 'Show what would be done without making changes')
    .option('--force', 'Force operation without confirmation')
    .option('-o, --output <path>', 'Output path for export operations')
    .option('-f, --format <format>', 'Output format', 'table')
    .action(
      async (
        action: string,
        identifier?: string,
        alias?: string,
        options?: TemplateOptions
      ) => {
        const fullOptions: TemplateOptions = {
          ...options,
        };

        const handler = container.resolve(TemplateHandler);
        const displayFactory = container.resolve(DisplayFactory);
        const executor = container.resolve(CommandExecutor);

        const display = displayFactory.createTemplateDisplay();

        await executor.execute(
          () => handler.execute(fullOptions),
          result => display.display(result, fullOptions)
        );
      }
    );

  return command;
}
