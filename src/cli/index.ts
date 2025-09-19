#!/usr/bin/env node

/**
 * CLI entry point for the Scaffold CLI tool
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import chalk from 'chalk';

// Import command handlers
import { createNewCommand } from './commands/new';
import { createTemplateCommand } from './commands/template.command';
import { createCheckCommand } from './commands/check.command';
import { createFixCommand } from './commands/fix.command';
import { createExtendCommand } from './commands/extend.command';
import { createShowCommand } from './commands/show.command';
import { createConfigCommand } from './commands/config.command';
import { createCleanCommand } from './commands/clean.command';

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
  })
  .configureOutput({
    writeErr: (str) => process.stderr.write(chalk.red(str)),
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

// Add command aliases
program.command('n').alias('new').description('Alias for "new" command');
program.command('t').alias('template').description('Alias for "template" command');
program.command('c').alias('check').description('Alias for "check" command');

// Global error handling
program.exitOverride((err) => {
  if (err.code === 'commander.help' || err.code === 'commander.version') {
    process.exit(0);
  }
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});

// Show help if no command provided
if (process.argv.length <= 2) {
  program.help();
}

// Parse CLI arguments
program.parse();