/**
 * Program builder - creates the Commander program instance
 * Separated from index.ts to avoid circular dependencies
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';

// Import command handlers
import { createNewCommand } from './commands/new';
import { createTemplateCommand } from './commands/template.command';
import { createCheckCommand } from './commands/check.command';
import { createFixCommand } from './commands/fix.command';
import { createExtendCommand } from './commands/extend.command';
import { createShowCommand } from './commands/show.command';
import { createConfigCommand } from './commands/config.command';
import { createCleanCommand } from './commands/clean.command';
import { createCompletionCommand } from './completion';

export function createProgram(): Command {
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
  program.addCommand(createNewCommand());
  program.addCommand(createTemplateCommand());
  program.addCommand(createCheckCommand());
  program.addCommand(createFixCommand());
  program.addCommand(createExtendCommand());
  program.addCommand(createShowCommand());
  program.addCommand(createConfigCommand());
  program.addCommand(createCleanCommand());
  program.addCommand(createCompletionCommand());

  return program;
}