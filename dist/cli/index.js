#!/usr/bin/env node
"use strict";
/**
 * CLI entry point for the Scaffold CLI tool
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs_1 = require("fs");
const path_1 = require("path");
const chalk_1 = __importDefault(require("chalk"));
// Import command handlers
const new_1 = require("./commands/new");
const template_command_1 = require("./commands/template.command");
const check_command_1 = require("./commands/check.command");
const fix_command_1 = require("./commands/fix.command");
const extend_command_1 = require("./commands/extend.command");
const show_command_1 = require("./commands/show.command");
const config_command_1 = require("./commands/config.command");
const clean_command_1 = require("./commands/clean.command");
// Get package.json for version info
const packagePath = (0, path_1.join)((0, path_1.dirname)((0, path_1.dirname)(__dirname)), 'package.json');
const packageJson = JSON.parse((0, fs_1.readFileSync)(packagePath, 'utf8'));
const program = new commander_1.Command();
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
    writeErr: (str) => process.stderr.write(chalk_1.default.red(str)),
});
// Register commands
program.addCommand((0, new_1.createNewCommand)());
program.addCommand((0, template_command_1.createTemplateCommand)());
program.addCommand((0, check_command_1.createCheckCommand)());
program.addCommand((0, fix_command_1.createFixCommand)());
program.addCommand((0, extend_command_1.createExtendCommand)());
program.addCommand((0, show_command_1.createShowCommand)());
program.addCommand((0, config_command_1.createConfigCommand)());
program.addCommand((0, clean_command_1.createCleanCommand)());
// Add command aliases
program.command('n').alias('new').description('Alias for "new" command');
program.command('t').alias('template').description('Alias for "template" command');
program.command('c').alias('check').description('Alias for "check" command');
// Global error handling
program.exitOverride((err) => {
    if (err.code === 'commander.help' || err.code === 'commander.version') {
        process.exit(0);
    }
    console.error(chalk_1.default.red('Error:'), err.message);
    process.exit(1);
});
// Show help if no command provided
if (process.argv.length <= 2) {
    program.help();
}
// Parse CLI arguments
program.parse();
//# sourceMappingURL=index.js.map