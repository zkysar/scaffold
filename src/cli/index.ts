#!/usr/bin/env node

/**
 * CLI entry point for the Scaffold CLI tool
 */

import chalk from 'chalk';
import { createProgram } from './program';
import { CommandRegistry } from './completion/command-registry';

// Create the program
const program = createProgram();

// Register program with command registry for completion
CommandRegistry.getInstance().setProgram(program);

// Configure output
program.configureOutput({
  writeErr: (str) => process.stderr.write(chalk.red(str)),
});

// Global error handling
program.exitOverride(err => {
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
