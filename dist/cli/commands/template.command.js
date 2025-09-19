"use strict";
/**
 * CLI command: scaffold template <action>
 * Template management operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTemplateCommand = createTemplateCommand;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const services_1 = require("../../services");
function createTemplateCommand() {
    const command = new commander_1.Command('template');
    command
        .description('Manage templates (create/list/delete/export/import)')
        .argument('<action>', 'Action to perform (create|list|delete|export|import)')
        .argument('[name]', 'Template name or file path (required for some actions)')
        .option('--verbose', 'Show detailed output')
        .option('--dry-run', 'Show what would be done without making changes')
        .option('--force', 'Force operation without confirmation')
        .option('-o, --output <path>', 'Output path for export operations')
        .action(async (action, name, options) => {
        try {
            await handleTemplateCommand(action, name, options);
        }
        catch (error) {
            console.error(chalk_1.default.red('Error:'), error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    return command;
}
async function handleTemplateCommand(action, name, options) {
    const verbose = options.verbose || false;
    const dryRun = options.dryRun || false;
    const force = options.force || false;
    if (verbose) {
        console.log(chalk_1.default.blue('Template action:'), action);
        if (name)
            console.log(chalk_1.default.blue('Template name:'), name);
        console.log(chalk_1.default.blue('Options:'), JSON.stringify(options, null, 2));
    }
    const templateService = new services_1.TemplateService();
    switch (action.toLowerCase()) {
        case 'list':
            await handleListTemplates(templateService, options);
            break;
        case 'create':
            await handleCreateTemplate(templateService, name, options);
            break;
        case 'delete':
            await handleDeleteTemplate(templateService, name, options);
            break;
        case 'export':
            await handleExportTemplate(templateService, name, options);
            break;
        case 'import':
            await handleImportTemplate(templateService, name, options);
            break;
        default:
            console.error(chalk_1.default.red('Error:'), `Unknown action: ${action}`);
            console.log(chalk_1.default.gray('Available actions: list, create, delete, export, import'));
            process.exit(1);
    }
}
async function handleListTemplates(templateService, options) {
    const verbose = options.verbose || false;
    try {
        const library = await templateService.loadTemplates();
        if (library.templates.length === 0) {
            console.log(chalk_1.default.yellow('No templates found.'));
            console.log(chalk_1.default.gray('Use "scaffold template create" to create your first template.'));
            return;
        }
        console.log(chalk_1.default.green('Available Templates:'));
        console.log('');
        for (const template of library.templates) {
            console.log(chalk_1.default.bold(template.name), chalk_1.default.gray(`(${template.id})`));
            console.log(chalk_1.default.gray('  Version:'), template.version);
            console.log(chalk_1.default.gray('  Description:'), template.description);
            console.log(chalk_1.default.gray('  Location:'), `~/.scaffold/templates/${template.id}/template.json`);
            if (verbose) {
                console.log(chalk_1.default.gray('  Source:'), template.source);
                console.log(chalk_1.default.gray('  Installed:'), template.installed ? 'Yes' : 'No');
                console.log(chalk_1.default.gray('  Last Updated:'), template.lastUpdated);
            }
            console.log('');
        }
        console.log(chalk_1.default.blue('Total:'), library.templates.length, 'templates');
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('No templates found')) {
            console.log(chalk_1.default.yellow('No templates found.'));
            console.log(chalk_1.default.gray('Use "scaffold template create" to create your first template.'));
        }
        else {
            throw error;
        }
    }
}
async function handleCreateTemplate(templateService, name, options) {
    const verbose = options.verbose || false;
    const dryRun = options.dryRun || false;
    if (!name) {
        console.error(chalk_1.default.red('Error:'), 'Template name is required for create action');
        console.log(chalk_1.default.gray('Usage: scaffold template create <name>'));
        process.exit(1);
    }
    if (verbose) {
        console.log(chalk_1.default.blue('Creating template:'), name);
    }
    // Interactive template creation
    const answers = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'description',
            message: 'Template description:',
            validate: (input) => input.trim().length > 0 || 'Description is required',
        },
        {
            type: 'input',
            name: 'rootFolder',
            message: 'Root folder for template isolation:',
            default: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
            validate: (input) => {
                if (!input.trim())
                    return 'Root folder is required';
                if (!/^[a-zA-Z0-9_-]+$/.test(input))
                    return 'Root folder must contain only alphanumeric characters, underscores, and hyphens';
                if (input.startsWith('.') || input.startsWith('-'))
                    return 'Root folder cannot start with a dot or hyphen';
                return true;
            },
        },
        {
            type: 'input',
            name: 'version',
            message: 'Initial version:',
            default: '1.0.0',
            validate: (input) => {
                const semverRegex = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
                return semverRegex.test(input) || 'Invalid semantic version (e.g., 1.0.0)';
            },
        },
        {
            type: 'confirm',
            name: 'strictMode',
            message: 'Enable strict mode validation?',
            default: false,
        },
        {
            type: 'confirm',
            name: 'allowExtraFiles',
            message: 'Allow extra files in projects?',
            default: true,
        },
    ]);
    const template = {
        id: generateTemplateId(name),
        name,
        version: answers.version,
        description: answers.description,
        rootFolder: answers.rootFolder,
        folders: [],
        files: [],
        variables: [],
        rules: {
            strictMode: answers.strictMode,
            allowExtraFiles: answers.allowExtraFiles,
            allowExtraFolders: true,
            conflictResolution: 'prompt',
            excludePatterns: ['node_modules', '.git', '*.log'],
            rules: [],
        },
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
    };
    if (dryRun) {
        console.log(chalk_1.default.yellow('DRY RUN - Template would be created with:'));
        console.log(JSON.stringify(template, null, 2));
        return;
    }
    try {
        await templateService.createTemplate(template);
        console.log(chalk_1.default.green('✓ Template created successfully!'));
        console.log(chalk_1.default.blue('Template ID:'), template.id);
        console.log(chalk_1.default.blue('Template Name:'), template.name);
        console.log(chalk_1.default.blue('Version:'), template.version);
        if (verbose) {
            console.log(chalk_1.default.gray('Location:'), `~/.scaffold/templates/${template.id}/template.json`);
        }
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
            console.error(chalk_1.default.red('Error:'), `Template '${name}' already exists`);
            console.log(chalk_1.default.gray('Use a different name or delete the existing template first.'));
        }
        else {
            throw error;
        }
    }
}
async function handleDeleteTemplate(templateService, name, options) {
    const verbose = options.verbose || false;
    const dryRun = options.dryRun || false;
    const force = options.force || false;
    if (!name) {
        console.error(chalk_1.default.red('Error:'), 'Template name or ID is required for delete action');
        console.log(chalk_1.default.gray('Usage: scaffold template delete <name>'));
        process.exit(1);
    }
    if (verbose) {
        console.log(chalk_1.default.blue('Deleting template:'), name);
    }
    try {
        // Find template by name or ID
        const library = await templateService.loadTemplates();
        const template = library.templates.find(t => t.name === name || t.id === name);
        if (!template) {
            console.error(chalk_1.default.red('Error:'), `Template '${name}' not found`);
            process.exit(1);
        }
        if (!force && !dryRun) {
            const { confirm } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: `Are you sure you want to delete template '${template.name}' (${template.id})?`,
                    default: false,
                },
            ]);
            if (!confirm) {
                console.log(chalk_1.default.yellow('Operation cancelled.'));
                return;
            }
        }
        if (dryRun) {
            console.log(chalk_1.default.yellow('DRY RUN - Would delete template:'));
            console.log(chalk_1.default.blue('  ID:'), template.id);
            console.log(chalk_1.default.blue('  Name:'), template.name);
            console.log(chalk_1.default.blue('  Version:'), template.version);
            return;
        }
        await templateService.deleteTemplate(template.id);
        console.log(chalk_1.default.green('✓ Template deleted successfully!'));
        console.log(chalk_1.default.blue('Deleted:'), `${template.name} (${template.id})`);
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
            console.error(chalk_1.default.red('Error:'), `Template '${name}' not found`);
        }
        else {
            throw error;
        }
    }
}
async function handleExportTemplate(templateService, name, options) {
    const verbose = options.verbose || false;
    const dryRun = options.dryRun || false;
    if (!name) {
        console.error(chalk_1.default.red('Error:'), 'Template name or ID is required for export action');
        console.log(chalk_1.default.gray('Usage: scaffold template export <name> [-o output.json]'));
        process.exit(1);
    }
    const outputPath = options.output || `./${name}-template.json`;
    if (verbose) {
        console.log(chalk_1.default.blue('Exporting template:'), name);
        console.log(chalk_1.default.blue('Output path:'), outputPath);
    }
    try {
        // Find template by name or ID
        const library = await templateService.loadTemplates();
        const template = library.templates.find(t => t.name === name || t.id === name);
        if (!template) {
            console.error(chalk_1.default.red('Error:'), `Template '${name}' not found`);
            process.exit(1);
        }
        if (dryRun) {
            console.log(chalk_1.default.yellow('DRY RUN - Would export template to:'), outputPath);
            console.log(chalk_1.default.blue('  Template:'), `${template.name} (${template.id})`);
            return;
        }
        await templateService.exportTemplate(template.id, outputPath);
        console.log(chalk_1.default.green('✓ Template exported successfully!'));
        console.log(chalk_1.default.blue('Template:'), `${template.name} (${template.id})`);
        console.log(chalk_1.default.blue('Output:'), outputPath);
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
            console.error(chalk_1.default.red('Error:'), `Template '${name}' not found`);
        }
        else {
            throw error;
        }
    }
}
async function handleImportTemplate(templateService, archivePath, options) {
    const verbose = options.verbose || false;
    const dryRun = options.dryRun || false;
    if (!archivePath) {
        console.error(chalk_1.default.red('Error:'), 'Archive path is required for import action');
        console.log(chalk_1.default.gray('Usage: scaffold template import <archive-path>'));
        process.exit(1);
    }
    if (verbose) {
        console.log(chalk_1.default.blue('Importing template from:'), archivePath);
    }
    if (dryRun) {
        console.log(chalk_1.default.yellow('DRY RUN - Would import template from:'), archivePath);
        return;
    }
    try {
        const template = await templateService.importTemplate(archivePath);
        console.log(chalk_1.default.green('✓ Template imported successfully!'));
        console.log(chalk_1.default.blue('Template ID:'), template.id);
        console.log(chalk_1.default.blue('Template Name:'), template.name);
        console.log(chalk_1.default.blue('Version:'), template.version);
        console.log(chalk_1.default.blue('Description:'), template.description);
        if (verbose) {
            console.log(chalk_1.default.gray('Location:'), `~/.scaffold/templates/${template.id}/template.json`);
        }
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
            console.error(chalk_1.default.red('Error:'), 'Template with the same ID already exists');
            console.log(chalk_1.default.gray('Delete the existing template first or modify the import.'));
        }
        else if (error instanceof Error && error.message.includes('does not exist')) {
            console.error(chalk_1.default.red('Error:'), `Archive file '${archivePath}' not found`);
        }
        else {
            throw error;
        }
    }
}
function generateTemplateId(name) {
    // Generate template ID from name (kebab-case)
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
//# sourceMappingURL=template.command.js.map