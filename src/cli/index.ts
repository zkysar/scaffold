#!/usr/bin/env node

/**
 * CLI entry point for the Scaffold CLI tool
 */

import 'module-alias/register';
import 'reflect-metadata';
import chalk from 'chalk';

import { createProgram } from '@/cli/program';
import { configureContainer } from '@/di/container';
import { logger } from '@/lib/logger';

// Initialize DI container
const container = configureContainer();

// Create the program
const program = createProgram(container);

// Configure output
program.configureOutput({
  writeErr: str => process.stderr.write(chalk.red(str)),
});

// Global error handling
program.exitOverride(err => {
  if (err.code === 'commander.help' || err.code === 'commander.version') {
    process.exit(0);
  }
  logger.error(err.message);
  process.exit(1);
});

// Configure logger before commands run
program.hook('preAction', thisCommand => {
  const globalOptions = thisCommand.opts();
  logger.setOptions({
    verbose: globalOptions.verbose,
    noColor: globalOptions.noColor,
  });
});

// Show help if no command provided
if (process.argv.length <= 2) {
  program.help();
}

// Parse CLI arguments
program.parse();
