"use strict";
/**
 * CLI command: scaffold show [item]
 * Display information about templates, projects, or configuration
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createShowCommand = createShowCommand;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const services_1 = require("../../services");
function createShowCommand() {
    const command = new commander_1.Command('show');
    command
        .description('Display information about templates, projects, or configuration')
        .argument('[item]', 'Item to show (template|project|config|all)', 'project')
        .option('--verbose', 'Show detailed information')
        .option('-f, --format <format>', 'Output format (table|json|summary)', 'table')
        .addHelpText('after', `
Examples:
  scaffold show                    # Show current project info
  scaffold show project            # Show current project info
  scaffold show template           # Show available templates
  scaffold show config             # Show configuration cascade
  scaffold show all                # Show all information
`)
        .action(async (item, options) => {
        try {
            await handleShowCommand(item, options);
        }
        catch (error) {
            console.error(chalk_1.default.red('Error:'), error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    return command;
}
async function handleShowCommand(item, options) {
    const verbose = options.verbose || false;
    const format = options.format || 'table';
    if (verbose) {
        console.log(chalk_1.default.blue('Show item:'), item);
        console.log(chalk_1.default.blue('Format:'), format);
    }
    try {
        switch (item.toLowerCase()) {
            case 'project':
                await showProjectInfo(options);
                break;
            case 'template':
            case 'templates':
                await showTemplateInfo(options);
                break;
            case 'config':
            case 'configuration':
                await showConfigurationInfo(options);
                break;
            case 'all':
                await showAllInfo(options);
                break;
            default:
                console.error(chalk_1.default.red('Error:'), `Unknown item: ${item}`);
                console.log(chalk_1.default.gray('Available items: project, template, config, all'));
                process.exit(1);
        }
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Not implemented') {
            console.log(chalk_1.default.yellow('✓ Command structure created (service implementation pending)'));
            console.log(chalk_1.default.blue('Would show:'), item);
            console.log(chalk_1.default.blue('Format:'), format);
            return;
        }
        throw error;
    }
}
async function showProjectInfo(options) {
    const verbose = options.verbose || false;
    const format = options.format || 'table';
    console.log(chalk_1.default.green('Project Information:'));
    console.log('');
    try {
        const fileSystemService = new services_1.FileSystemService();
        const templateService = new services_1.TemplateService();
        const projectService = new services_1.ProjectService(templateService, fileSystemService);
        const manifest = await projectService.loadProjectManifest(process.cwd());
        if (!manifest) {
            console.log(chalk_1.default.yellow('This directory is not a scaffold-managed project.'));
            console.log(chalk_1.default.gray('Use "scaffold new" to create a new project or "scaffold check" to validate.'));
            return;
        }
        if (format === 'json') {
            console.log(JSON.stringify(manifest, null, 2));
            return;
        }
        console.log(chalk_1.default.blue('Project Name:'), manifest.projectName);
        console.log(chalk_1.default.blue('Version:'), manifest.version);
        console.log(chalk_1.default.blue('Created:'), manifest.created);
        console.log(chalk_1.default.blue('Last Updated:'), manifest.updated);
        if (manifest.templates.length > 0) {
            console.log(chalk_1.default.blue('Applied Templates:'));
            for (const template of manifest.templates) {
                console.log(chalk_1.default.gray('  -'), `${template.name}@${template.version}`);
                if (verbose) {
                    console.log(chalk_1.default.gray('    Applied:'), template.appliedAt);
                }
            }
        }
        else {
            console.log(chalk_1.default.yellow('No templates applied'));
        }
        if (Object.keys(manifest.variables).length > 0) {
            console.log(chalk_1.default.blue('Variables:'));
            for (const [key, value] of Object.entries(manifest.variables)) {
                console.log(chalk_1.default.gray('  -'), `${key}: ${value}`);
            }
        }
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('No manifest found')) {
            console.log(chalk_1.default.yellow('This directory is not a scaffold-managed project.'));
            console.log(chalk_1.default.gray('Use "scaffold new" to create a new project or "scaffold check" to validate.'));
        }
        else {
            throw error;
        }
    }
}
async function showTemplateInfo(options) {
    const format = options.format || 'table';
    console.log(chalk_1.default.green('Template Information:'));
    console.log('');
    const templateService = new services_1.TemplateService();
    const library = await templateService.loadTemplates();
    if (format === 'json') {
        console.log(JSON.stringify(library.templates, null, 2));
        return;
    }
    if (library.templates.length === 0) {
        console.log(chalk_1.default.yellow('No templates available.'));
        console.log(chalk_1.default.gray('Use "scaffold template create" to create your first template.'));
        return;
    }
    for (const template of library.templates) {
        console.log(chalk_1.default.bold(template.name), chalk_1.default.gray(`(${template.id})`));
        console.log(chalk_1.default.gray('  Version:'), template.version);
        console.log(chalk_1.default.gray('  Description:'), template.description);
        console.log('');
    }
    console.log(chalk_1.default.blue('Total:'), library.templates.length, 'templates');
}
async function showConfigurationInfo(options) {
    const format = options.format || 'table';
    console.log(chalk_1.default.green('Configuration Information:'));
    console.log('');
    try {
        const configService = new services_1.ConfigurationService();
        await configService.loadConfiguration();
        const config = configService.getEffectiveConfiguration();
        if (format === 'json') {
            console.log(JSON.stringify(config, null, 2));
            return;
        }
        console.log(chalk_1.default.blue('Templates Directory:'), config.paths?.templatesDir || 'Not configured');
        console.log(chalk_1.default.blue('Cache Directory:'), config.paths?.cacheDir || 'Not configured');
        console.log(chalk_1.default.blue('Backup Directory:'), config.paths?.backupDir || 'Not configured');
        console.log(chalk_1.default.blue('Strict Mode Default:'), config.preferences?.strictModeDefault ? 'Enabled' : 'Disabled');
        console.log(chalk_1.default.blue('Color Output:'), config.preferences?.colorOutput ? 'Yes' : 'No');
        console.log(chalk_1.default.blue('Verbose Output:'), config.preferences?.verboseOutput ? 'Yes' : 'No');
        console.log(chalk_1.default.blue('Confirm Destructive:'), config.preferences?.confirmDestructive ? 'Yes' : 'No');
        console.log(chalk_1.default.blue('Backup Before Sync:'), config.preferences?.backupBeforeSync ? 'Yes' : 'No');
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Not implemented') {
            console.log(chalk_1.default.yellow('✓ Command structure created (service implementation pending)'));
            return;
        }
        throw error;
    }
}
async function showAllInfo(options) {
    console.log(chalk_1.default.green('=== Scaffold Information ==='));
    console.log('');
    await showProjectInfo(options);
    console.log('');
    await showTemplateInfo(options);
    console.log('');
    await showConfigurationInfo(options);
}
//# sourceMappingURL=show.command.js.map