"use strict";
/**
 * CLI command: scaffold extend <project>
 * Add templates to existing project
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExtendCommand = createExtendCommand;
const commander_1 = require("commander");
const path_1 = require("path");
const fs_1 = require("fs");
const chalk_1 = __importDefault(require("chalk"));
const services_1 = require("../../services");
function createExtendCommand() {
    const command = new commander_1.Command('extend');
    command
        .description('Add templates to existing scaffold project')
        .argument('[project]', 'Project directory path (defaults to current directory)')
        .option('-t, --template <template>', 'Template ID or name to add')
        .option('-v, --variables <variables>', 'JSON string of template variables')
        .option('--verbose', 'Show detailed output')
        .option('--dry-run', 'Show what would be added without making changes')
        .option('--force', 'Apply template without confirmation prompts')
        .action(async (projectPath, options) => {
        try {
            await handleExtendCommand(projectPath, options);
        }
        catch (error) {
            console.error(chalk_1.default.red('Error:'), error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    return command;
}
async function handleExtendCommand(projectPath, options) {
    const verbose = options.verbose || false;
    const dryRun = options.dryRun || false;
    // Determine target path
    const targetPath = projectPath ? (0, path_1.resolve)(projectPath) : (0, path_1.resolve)(process.cwd());
    if (verbose) {
        console.log(chalk_1.default.blue('Extending project:'), targetPath);
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
    try {
        // Check if this is a scaffold-managed project
        const manifest = await projectService.loadProjectManifest(targetPath);
        if (!manifest) {
            console.error(chalk_1.default.red('Error:'), 'Not a scaffold-managed project');
            console.log(chalk_1.default.gray('No .scaffold/manifest.json file found.'));
            console.log(chalk_1.default.gray('Use "scaffold new" to create a new project first.'));
            process.exit(1);
        }
        if (!options.template) {
            console.error(chalk_1.default.red('Error:'), 'Template is required');
            console.log(chalk_1.default.gray('Usage: scaffold extend <project> --template <template-name>'));
            process.exit(1);
        }
        // Parse variables if provided
        let variables = {};
        if (options.variables) {
            try {
                variables = JSON.parse(options.variables);
            }
            catch (error) {
                throw new Error(`Invalid variables JSON: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        if (dryRun) {
            console.log(chalk_1.default.yellow('DRY RUN - Would extend project with:'));
            console.log(chalk_1.default.blue('Project:'), manifest.projectName);
            console.log(chalk_1.default.blue('Template:'), options.template);
            console.log(chalk_1.default.blue('Variables:'), variables);
            return;
        }
        console.log(chalk_1.default.yellow('✓ Command structure created (service implementation pending)'));
        console.log(chalk_1.default.blue('Would extend project:'), targetPath);
        console.log(chalk_1.default.blue('With template:'), options.template);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Not implemented') {
            console.log(chalk_1.default.yellow('✓ Command structure created (service implementation pending)'));
            console.log(chalk_1.default.blue('Would extend project:'), targetPath);
            console.log(chalk_1.default.blue('With template:'), options.template);
            return;
        }
        throw error;
    }
}
//# sourceMappingURL=extend.command.js.map