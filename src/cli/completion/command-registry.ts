/**
 * Command registry for dynamic command discovery
 * Provides a centralized way to access command metadata for completion
 */

import { Command } from 'commander';

export interface CommandInfo {
  name: string;
  aliases: string[];
  description: string;
  subcommands: CommandInfo[];
  options: OptionInfo[];
}

export interface OptionInfo {
  flags: string;
  description: string;
  required: boolean;
}

export class CommandRegistry {
  private static instance: CommandRegistry;
  private program: Command | null = null;

  private constructor() {}

  static getInstance(): CommandRegistry {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry();
    }
    return CommandRegistry.instance;
  }

  /**
   * Set the program instance to use for command discovery
   */
  setProgram(program: Command): void {
    this.program = program;
  }

  /**
   * Get the program instance (lazy initialization)
   */
  private getProgram(): Command {
    if (!this.program) {
      // Lazy load the program to avoid circular dependencies
      const { createProgram } = require('../program');
      this.program = createProgram();
    }
    return this.program as Command;
  }

  /**
   * Get all top-level command names
   */
  getTopLevelCommands(): string[] {
    const program = this.getProgram();

    // Filter out hidden commands (hidden property may not exist on all Commands)
    const visibleCommands = program.commands
      .filter(cmd => !(cmd as any).hidden)
      .map(cmd => cmd.name());

    return visibleCommands;
  }

  /**
   * Get subcommands for a given command
   */
  getSubcommands(commandName: string): string[] {
    const program = this.getProgram();
    const command = program.commands.find(cmd =>
      cmd.name() === commandName || cmd.aliases().includes(commandName)
    );

    if (!command) {
      return [];
    }

    // Check if this command has subcommands
    if (command.commands && command.commands.length > 0) {
      return command.commands
        .filter(cmd => !(cmd as any).hidden)
        .map(cmd => cmd.name());
    }

    // Check if this command has argument choices for the first positional argument
    // This handles cases like 'scaffold template <action>' where action has specific choices
    if ((command as any)._args && (command as any)._args.length > 0) {
      const firstArg = (command as any)._args[0];

      // Special handling for known commands with argument choices
      if (commandName === 'template' && firstArg._name === 'action') {
        return ['create', 'list', 'delete', 'export', 'import'];
      }
    }

    return [];
  }

  /**
   * Get options for a command (including subcommands)
   */
  getCommandOptions(commandPath: string[]): string[] {
    const program = this.getProgram();
    let current: Command | undefined = program;

    // Navigate to the specified command
    for (const name of commandPath) {
      current = current?.commands.find(cmd =>
        cmd.name() === name || cmd.aliases().includes(name)
      );
      if (!current) break;
    }

    if (!current) {
      return ['--help']; // Default to help option
    }

    // Get options from the command
    const options: string[] = [];
    current.options.forEach(option => {
      // Extract the long option (e.g., "--force" from "-f, --force")
      const match = option.flags.match(/--[\w-]+/);
      if (match) {
        options.push(match[0]);
      }
    });

    // Always include help
    if (!options.includes('--help')) {
      options.push('--help');
    }

    return options;
  }

  /**
   * Check if a command exists
   */
  hasCommand(commandName: string): boolean {
    const program = this.getProgram();
    return program.commands.some(cmd =>
      cmd.name() === commandName || cmd.aliases().includes(commandName)
    );
  }

  /**
   * Get command info for a specific command
   */
  getCommandInfo(commandName: string): CommandInfo | null {
    const program = this.getProgram();
    const command = program.commands.find(cmd =>
      cmd.name() === commandName || cmd.aliases().includes(commandName)
    );

    if (!command) {
      return null;
    }

    return this.buildCommandInfo(command);
  }

  private buildCommandInfo(command: Command): CommandInfo {
    return {
      name: command.name(),
      aliases: command.aliases(),
      description: command.description(),
      subcommands: command.commands
        .filter(cmd => !(cmd as any).hidden)
        .map(cmd => this.buildCommandInfo(cmd)),
      options: command.options.map(opt => ({
        flags: opt.flags,
        description: opt.description || '',
        required: opt.required || false,
      })),
    };
  }
}