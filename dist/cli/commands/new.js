"use strict";
/**
 * CLI command: scaffold new <project>
 * Create new project from template
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNewCommand = createNewCommand;
const commander_1 = require("commander");
const path_1 = require("path");
const fs_1 = require("fs");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const services_1 = require("../../services");
function createNewCommand() {
    const command = new commander_1.Command('new');
    command
        .description('Create new project from template')
        .argument('<project>', 'Project name')
        .option('-t, --template <template>', 'Template ID or name to use')
        .option('-p, --path <path>', 'Target directory path (defaults to current directory)')
        .option('-v, --variables <variables>', 'JSON string of template variables')
        .option('--verbose', 'Show detailed output')
        .option('--dry-run', 'Show what would be created without creating anything')
        .action(async (projectName, options) => {
        try {
            await handleNewCommand(projectName, options);
        }
        catch (error) {
            console.error(chalk_1.default.red('Error:'), error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    return command;
}
async function handleNewCommand(projectName, options) {
    const verbose = options.verbose || false;
    const dryRun = options.dryRun || false;
    if (verbose) {
        console.log(chalk_1.default.blue('Creating new project:'), projectName);
        console.log(chalk_1.default.blue('Options:'), JSON.stringify(options, null, 2));
    }
    // Determine target path
    const targetPath = options.path
        ? (0, path_1.resolve)(options.path, projectName)
        : (0, path_1.resolve)(process.cwd(), projectName);
    if (verbose) {
        console.log(chalk_1.default.blue('Target path:'), targetPath);
    }
    // Check if target directory already exists
    if ((0, fs_1.existsSync)(targetPath)) {
        const { overwrite } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'overwrite',
                message: `Directory "${targetPath}" already exists. Continue?`,
                default: false,
            },
        ]);
        if (!overwrite) {
            console.log(chalk_1.default.yellow('Operation cancelled.'));
            return;
        }
    }
    // Initialize services
    const fileSystemService = new services_1.FileSystemService();
    const templateService = new services_1.TemplateService();
    const projectService = new services_1.ProjectService(templateService, fileSystemService);
    let templateIds = [];
    if (options.template) {
        templateIds = [options.template];
        if (verbose) {
            console.log(chalk_1.default.blue('Using template:'), options.template);
        }
    }
    else {
        // TODO: Prompt user to select from available templates
        console.log(chalk_1.default.yellow('No template specified. Use --template option.'));
        console.log(chalk_1.default.gray('Example: scaffold new my-project --template node-typescript'));
        return;
    }
    // Parse variables if provided
    let variables = {};
    if (options.variables) {
        try {
            variables = JSON.parse(options.variables);
            if (verbose) {
                console.log(chalk_1.default.blue('Variables:'), variables);
            }
        }
        catch (error) {
            throw new Error(`Invalid variables JSON: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    if (dryRun) {
        console.log(chalk_1.default.yellow('DRY RUN - No files will be created'));
        console.log(chalk_1.default.blue('Would create project:'), projectName);
        console.log(chalk_1.default.blue('Target path:'), targetPath);
        console.log(chalk_1.default.blue('Templates:'), templateIds);
        console.log(chalk_1.default.blue('Variables:'), variables);
        return;
    }
    try {
        // Create the project
        const manifest = await projectService.createProject(projectName, templateIds, targetPath, variables);
        console.log(chalk_1.default.green('✓ Project created successfully!'));
        console.log(chalk_1.default.blue('Project name:'), manifest.projectName);
        console.log(chalk_1.default.blue('Location:'), targetPath);
        console.log(chalk_1.default.blue('Templates applied:'), manifest.templates.map(t => `${t.name}@${t.version}`).join(', '));
        if (verbose) {
            console.log(chalk_1.default.blue('Manifest ID:'), manifest.id);
            console.log(chalk_1.default.blue('Created at:'), manifest.created);
        }
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Not implemented') {
            console.log(chalk_1.default.yellow('✓ Command structure created (service implementation pending)'));
            console.log(chalk_1.default.blue('Would create project:'), projectName);
            console.log(chalk_1.default.blue('Target path:'), targetPath);
            console.log(chalk_1.default.blue('Templates:'), templateIds);
            return;
        }
        throw error;
    }
}
//# sourceMappingURL=new.js.map