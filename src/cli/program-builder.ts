/**
 * Injectable program builder for creating the Commander program
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';

import { Command } from 'commander';
import { injectable } from 'tsyringe';

import { CommandFactory } from './commands/command-factory';

@injectable()
export class ProgramBuilder {
  constructor(private commandFactory: CommandFactory) {}

  build(): Command {
    // Get package.json for version info
    const packagePath = join(dirname(dirname(__dirname)), 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

    const program = new Command();

    // Configure main program
    program
      .name('scaffold')
      .description(
        'A generic project structure management CLI tool with template-based scaffolding'
      )
      .version(packageJson.version)
      .option('--verbose', 'Show detailed output')
      .option('--dry-run', 'Show what would be done without making changes')
      .option('--no-color', 'Disable colored output')
      .configureHelp({
        sortSubcommands: true,
        showGlobalOptions: true,
      });

    // Register commands using factory
    program.addCommand(this.commandFactory.createNewCommand());
    program.addCommand(this.commandFactory.createTemplateCommand());
    program.addCommand(this.commandFactory.createCheckCommand());
    program.addCommand(this.commandFactory.createFixCommand());
    program.addCommand(this.commandFactory.createExtendCommand());
    program.addCommand(this.commandFactory.createShowCommand());
    program.addCommand(this.commandFactory.createConfigCommand());
    program.addCommand(this.commandFactory.createCleanCommand());

    return program;
  }
}
