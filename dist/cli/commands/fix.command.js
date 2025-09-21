"use strict";
/**
 * CLI command: scaffold fix [project]
 * Fix project structure issues
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFixCommand = createFixCommand;
const commander_1 = require("commander");
const path_1 = require("path");
const fs_1 = require("fs");
const chalk_1 = __importDefault(require("chalk"));
const services_1 = require("../../services");
function createFixCommand() {
    const command = new commander_1.Command('fix');
    command
        .description('Fix project structure issues automatically')
        .argument('[project]', 'Project directory path (defaults to current directory)')
        .option('--verbose', 'Show detailed fix output')
        .option('--dry-run', 'Show what would be fixed without making changes')
        .option('--force', 'Fix issues without confirmation prompts')
        .option('--backup', 'Create backup before making changes', true)
        .action(async (projectPath, options) => {
        try {
            await handleFixCommand(projectPath, options);
        }
        catch (error) {
            console.error(chalk_1.default.red('Error:'), error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    return command;
}
async function handleFixCommand(projectPath, options) {
    const verbose = options.verbose || false;
    const dryRun = options.dryRun || false;
    // Determine target path
    const targetPath = projectPath ? (0, path_1.resolve)(projectPath) : (0, path_1.resolve)(process.cwd());
    if (verbose) {
        console.log(chalk_1.default.blue('Fixing project:'), targetPath);
        console.log(chalk_1.default.blue('Options:'), JSON.stringify(options, null, 2));
    }
    // Check if target directory exists
    if (!(0, fs_1.existsSync)(targetPath)) {
        console.error(chalk_1.default.red('Error:'), `Directory "${targetPath}" does not exist`);
        process.exit(1);
    }
    // Initialize services
    const fileSystemService = new services_1.FileSystemService();
    const templateService = new services_1.TemplateService();
    const projectService = new services_1.ProjectService(templateService, fileSystemService);
    // Check if this is a scaffold-managed project
    const manifest = await projectService.loadProjectManifest(targetPath);
    if (!manifest) {
        console.log(chalk_1.default.yellow('Not a scaffold-managed project.'));
        console.log(chalk_1.default.gray('No .scaffold/manifest.json file found.'));
        console.log(chalk_1.default.gray('Use "scaffold new" to create a new project or "scaffold extend" to add templates.'));
        return;
    }
    if (verbose) {
        console.log(chalk_1.default.blue('Project name:'), manifest.projectName);
        console.log(chalk_1.default.blue('Applied templates:'), manifest.templates.map(t => `${t.name}@${t.version}`).join(', '));
    }
    // Fix the project
    const report = await projectService.fixProject(targetPath, dryRun);
    // Display results
    console.log(chalk_1.default.bold('Project Fix Report'));
    console.log('─'.repeat(50));
    if (report.valid) {
        console.log(chalk_1.default.green('✓ Project structure is valid - no fixes needed'));
    }
    else {
        // Display errors that couldn't be fixed
        if (report.errors.length > 0) {
            console.log(chalk_1.default.red('Remaining Errors:'));
            for (const error of report.errors) {
                console.log(chalk_1.default.red('  ✗'), error.message);
                if (error.suggestion) {
                    console.log(chalk_1.default.gray(`    Suggestion: ${error.suggestion}`));
                }
            }
            console.log('');
        }
        // Display warnings
        if (report.warnings.length > 0) {
            console.log(chalk_1.default.yellow('Warnings:'));
            for (const warning of report.warnings) {
                console.log(chalk_1.default.yellow('  ⚠'), warning.message);
                if (warning.suggestion) {
                    console.log(chalk_1.default.gray(`    Suggestion: ${warning.suggestion}`));
                }
            }
            console.log('');
        }
    }
    // Display suggestions
    if (report.suggestions && report.suggestions.length > 0) {
        console.log(chalk_1.default.blue('Summary:'));
        for (const suggestion of report.suggestions) {
            console.log(chalk_1.default.gray(`  • ${suggestion}`));
        }
        console.log('');
    }
    // Display stats
    console.log(chalk_1.default.blue('Statistics:'));
    console.log(chalk_1.default.gray(`  Files checked: ${report.stats.filesChecked}`));
    console.log(chalk_1.default.gray(`  Folders checked: ${report.stats.foldersChecked}`));
    console.log(chalk_1.default.gray(`  Errors: ${report.stats.errorCount}`));
    console.log(chalk_1.default.gray(`  Warnings: ${report.stats.warningCount}`));
    console.log(chalk_1.default.gray(`  Duration: ${report.stats.duration}ms`));
    // Set exit code based on results
    if (report.stats.errorCount > 0) {
        process.exit(1);
    }
    else if (report.stats.warningCount > 0) {
        process.exit(2);
    }
}
//# sourceMappingURL=fix.command.js.map