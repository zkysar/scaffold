/**
 * Program builder - creates the Commander program instance
 * Separated from index.ts to avoid circular dependencies
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { DependencyContainer } from 'tsyringe';

// Import command handlers
import { createNewCommand } from '@/cli/commands/new.command';
import { createTemplateCommand } from '@/cli/commands/template.command';
import { createCheckCommand } from '@/cli/commands/check.command';
import { createFixCommand } from '@/cli/commands/fix.command';
import { createExtendCommand } from '@/cli/commands/extend.command';
import { createShowCommand } from '@/cli/commands/show.command';
import { createConfigCommand } from '@/cli/commands/config.command';
import { createCleanCommand } from '@/cli/commands/clean.command';
import { createCompletionCommand } from '@/cli/completion';

export function createProgram(container: DependencyContainer): Command {
  // Get package.json for version info
  const packagePath = join(dirname(dirname(__dirname)), 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

  const program = new Command();

  // Configure main program
  program
    .name('scaffold')
    .description('A generic project structure management CLI tool with template-based scaffolding')
    .version(packageJson.version)
    .option('--verbose', 'Show detailed output')
    .option('--dry-run', 'Show what would be done without making changes')
    .option('--no-color', 'Disable colored output')
    .configureHelp({
      sortSubcommands: true,
      showGlobalOptions: true,
    });

  // Register commands
  program.addCommand(createNewCommand(container));
  program.addCommand(createTemplateCommand(container));
  program.addCommand(createCheckCommand(container));
  program.addCommand(createFixCommand(container));
  program.addCommand(createExtendCommand(container));
  program.addCommand(createShowCommand(container));
  program.addCommand(createConfigCommand(container));
  program.addCommand(createCleanCommand(container));
  program.addCommand(createCompletionCommand(container));

  return program;
}