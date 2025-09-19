"use strict";
/**
 * Template service for CRUD operations on templates
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateService = void 0;
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs-extra"));
const semver = __importStar(require("semver"));
class TemplateService {
    templatesDir;
    cacheDir;
    constructor() {
        this.templatesDir = path.join(os.homedir(), '.scaffold', 'templates');
        this.cacheDir = path.join(os.homedir(), '.scaffold', 'cache');
    }
    async loadTemplates() {
        await this.ensureDirectoriesExist();
        try {
            const templateSummaries = [];
            const templateDirs = await this.getTemplateDirectories();
            for (const templateDir of templateDirs) {
                try {
                    const template = await this.loadTemplate(templateDir);
                    templateSummaries.push({
                        id: template.id,
                        name: template.name,
                        version: template.version,
                        description: template.description,
                        source: 'local',
                        installed: true,
                        lastUpdated: template.updated,
                    });
                }
                catch (error) {
                    console.warn(`Failed to load template from ${templateDir}:`, error);
                }
            }
            const sources = [
                {
                    type: 'global',
                    path: this.templatesDir,
                    priority: 100,
                    enabled: true,
                },
            ];
            return {
                sources,
                templates: templateSummaries,
                lastUpdated: new Date().toISOString(),
            };
        }
        catch (error) {
            throw new Error(`Failed to load templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getTemplate(id) {
        if (!id || typeof id !== 'string') {
            throw new Error('Template ID must be a non-empty string');
        }
        await this.ensureDirectoriesExist();
        const templatePath = await this.findTemplateById(id);
        if (!templatePath) {
            throw new Error(`Template with ID '${id}' not found`);
        }
        return this.loadTemplate(templatePath);
    }
    async searchTemplates(query) {
        if (!query || typeof query !== 'string') {
            throw new Error('Search query must be a non-empty string');
        }
        const library = await this.loadTemplates();
        const lowercaseQuery = query.toLowerCase();
        return library.templates.filter(template => template.name.toLowerCase().includes(lowercaseQuery) ||
            template.description.toLowerCase().includes(lowercaseQuery));
    }
    async createTemplate(template) {
        const validationErrors = await this.validateTemplate(template);
        if (validationErrors.length > 0) {
            throw new Error(`Template validation failed: ${validationErrors.join(', ')}`);
        }
        await this.ensureDirectoriesExist();
        const existingTemplatePath = await this.findTemplateById(template.id);
        if (existingTemplatePath) {
            throw new Error(`Template with ID '${template.id}' already exists`);
        }
        const now = new Date().toISOString();
        const templateWithDates = {
            ...template,
            created: template.created || now,
            updated: now,
        };
        await this.saveTemplate(templateWithDates);
    }
    async updateTemplate(template) {
        const validationErrors = await this.validateTemplate(template);
        if (validationErrors.length > 0) {
            throw new Error(`Template validation failed: ${validationErrors.join(', ')}`);
        }
        await this.ensureDirectoriesExist();
        const existingTemplatePath = await this.findTemplateById(template.id);
        if (!existingTemplatePath) {
            throw new Error(`Template with ID '${template.id}' not found`);
        }
        const existingTemplate = await this.loadTemplate(existingTemplatePath);
        const updatedTemplate = {
            ...template,
            created: existingTemplate.created,
            updated: new Date().toISOString(),
        };
        await this.saveTemplate(updatedTemplate);
    }
    async deleteTemplate(id) {
        if (!id || typeof id !== 'string') {
            throw new Error('Template ID must be a non-empty string');
        }
        await this.ensureDirectoriesExist();
        const templatePath = await this.findTemplateById(id);
        if (!templatePath) {
            throw new Error(`Template with ID '${id}' not found`);
        }
        try {
            await fs.remove(templatePath);
        }
        catch (error) {
            throw new Error(`Failed to delete template '${id}': ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async installTemplate(source, templateId) {
        throw new Error('Remote template installation not yet implemented');
    }
    async validateTemplate(template) {
        const errors = [];
        if (!template.id || typeof template.id !== 'string') {
            errors.push('Template ID is required and must be a string');
        }
        if (!template.name || typeof template.name !== 'string') {
            errors.push('Template name is required and must be a string');
        }
        if (!template.version || typeof template.version !== 'string') {
            errors.push('Template version is required and must be a string');
        }
        else if (!semver.valid(template.version)) {
            errors.push('Template version must be a valid semantic version');
        }
        if (!template.description || typeof template.description !== 'string') {
            errors.push('Template description is required and must be a string');
        }
        if (!template.rootFolder || typeof template.rootFolder !== 'string') {
            errors.push('Template rootFolder is required and must be a string');
        }
        else {
            // Validate rootFolder is a simple directory name (no slashes, no special chars)
            if (!/^[a-zA-Z0-9_-]+$/.test(template.rootFolder)) {
                errors.push('Template rootFolder must be a simple directory name (alphanumeric, underscore, hyphen only)');
            }
            if (template.rootFolder.startsWith('.') || template.rootFolder.startsWith('-')) {
                errors.push('Template rootFolder cannot start with a dot or hyphen');
            }
        }
        if (!Array.isArray(template.folders)) {
            errors.push('Template folders must be an array');
        }
        else {
            template.folders.forEach((folder, index) => {
                if (!folder.path || typeof folder.path !== 'string') {
                    errors.push(`Folder ${index}: path is required and must be a string`);
                }
                else if (template.rootFolder) {
                    // Validate that folder path starts with rootFolder
                    if (!folder.path.startsWith(template.rootFolder + '/') && folder.path !== template.rootFolder) {
                        errors.push(`Folder ${index}: path '${folder.path}' must start with rootFolder '${template.rootFolder}/'`);
                    }
                }
            });
        }
        if (!Array.isArray(template.files)) {
            errors.push('Template files must be an array');
        }
        else {
            template.files.forEach((file, index) => {
                if (!file.path || typeof file.path !== 'string') {
                    errors.push(`File ${index}: path is required and must be a string`);
                }
                else if (template.rootFolder) {
                    // Validate that file path starts with rootFolder
                    if (!file.path.startsWith(template.rootFolder + '/')) {
                        errors.push(`File ${index}: path '${file.path}' must start with rootFolder '${template.rootFolder}/'`);
                    }
                }
                if (!file.sourcePath && !file.content) {
                    errors.push(`File ${index}: either sourcePath or content must be provided`);
                }
            });
        }
        if (!Array.isArray(template.variables)) {
            errors.push('Template variables must be an array');
        }
        else {
            const variableNames = new Set();
            template.variables.forEach((variable, index) => {
                if (!variable.name || typeof variable.name !== 'string') {
                    errors.push(`Variable ${index}: name is required and must be a string`);
                }
                else if (variableNames.has(variable.name)) {
                    errors.push(`Variable ${index}: duplicate variable name '${variable.name}'`);
                }
                else {
                    variableNames.add(variable.name);
                }
                if (!variable.description || typeof variable.description !== 'string') {
                    errors.push(`Variable ${index}: description is required and must be a string`);
                }
                if (typeof variable.required !== 'boolean') {
                    errors.push(`Variable ${index}: required must be a boolean`);
                }
                if (variable.pattern && typeof variable.pattern !== 'string') {
                    errors.push(`Variable ${index}: pattern must be a string`);
                }
            });
        }
        if (!template.rules || typeof template.rules !== 'object') {
            errors.push('Template rules are required and must be an object');
        }
        else {
            if (typeof template.rules.strictMode !== 'boolean') {
                errors.push('Template rules.strictMode must be a boolean');
            }
            if (typeof template.rules.allowExtraFiles !== 'boolean') {
                errors.push('Template rules.allowExtraFiles must be a boolean');
            }
            if (typeof template.rules.allowExtraFolders !== 'boolean') {
                errors.push('Template rules.allowExtraFolders must be a boolean');
            }
            if (!['skip', 'replace', 'prompt', 'merge'].includes(template.rules.conflictResolution)) {
                errors.push('Template rules.conflictResolution must be one of: skip, replace, prompt, merge');
            }
            if (!Array.isArray(template.rules.excludePatterns)) {
                errors.push('Template rules.excludePatterns must be an array');
            }
            if (!Array.isArray(template.rules.rules)) {
                errors.push('Template rules.rules must be an array');
            }
            else {
                const ruleIds = new Set();
                template.rules.rules.forEach((rule, index) => {
                    if (!rule.id || typeof rule.id !== 'string') {
                        errors.push(`Rule ${index}: id is required and must be a string`);
                    }
                    else if (ruleIds.has(rule.id)) {
                        errors.push(`Rule ${index}: duplicate rule ID '${rule.id}'`);
                    }
                    else {
                        ruleIds.add(rule.id);
                    }
                    if (!rule.name || typeof rule.name !== 'string') {
                        errors.push(`Rule ${index}: name is required and must be a string`);
                    }
                    if (!rule.target || typeof rule.target !== 'string') {
                        errors.push(`Rule ${index}: target is required and must be a string`);
                    }
                    else if (template.rootFolder) {
                        // Validate that rule target starts with rootFolder
                        if (!rule.target.startsWith(template.rootFolder + '/') && rule.target !== template.rootFolder) {
                            errors.push(`Rule ${index}: target '${rule.target}' must start with rootFolder '${template.rootFolder}/'`);
                        }
                    }
                    if (!['error', 'warning'].includes(rule.severity)) {
                        errors.push(`Rule ${index}: severity must be 'error' or 'warning'`);
                    }
                });
            }
        }
        if (template.dependencies && !Array.isArray(template.dependencies)) {
            errors.push('Template dependencies must be an array if provided');
        }
        return errors;
    }
    async getTemplateDependencies(templateId) {
        const template = await this.getTemplate(templateId);
        const dependencies = [];
        const visited = new Set();
        const collectDependencies = async (currentTemplate) => {
            if (!currentTemplate.dependencies) {
                return;
            }
            for (const depId of currentTemplate.dependencies) {
                if (visited.has(depId)) {
                    continue;
                }
                visited.add(depId);
                try {
                    const depTemplate = await this.getTemplate(depId);
                    dependencies.push(depTemplate);
                    await collectDependencies(depTemplate);
                }
                catch (error) {
                    throw new Error(`Failed to resolve dependency '${depId}': ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
        };
        await collectDependencies(template);
        return dependencies;
    }
    async exportTemplate(templateId, outputPath) {
        const template = await this.getTemplate(templateId);
        const templatePath = await this.findTemplateById(templateId);
        if (!templatePath) {
            throw new Error(`Template with ID '${templateId}' not found`);
        }
        try {
            await fs.ensureDir(path.dirname(outputPath));
            const exportData = {
                template,
                files: {},
            };
            const templateFilesDir = path.join(templatePath, 'files');
            if (await fs.pathExists(templateFilesDir)) {
                const fileList = await this.getFileList(templateFilesDir);
                for (const filePath of fileList) {
                    const relativePath = path.relative(templateFilesDir, filePath);
                    const content = await fs.readFile(filePath, 'utf-8');
                    exportData.files[relativePath] = content;
                }
            }
            await fs.writeJson(outputPath, exportData, { spaces: 2 });
        }
        catch (error) {
            throw new Error(`Failed to export template '${templateId}': ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async importTemplate(archivePath) {
        if (!await fs.pathExists(archivePath)) {
            throw new Error(`Archive file '${archivePath}' does not exist`);
        }
        try {
            const exportData = await fs.readJson(archivePath);
            if (!exportData.template || typeof exportData.template !== 'object') {
                throw new Error('Invalid export file: missing template data');
            }
            const template = exportData.template;
            const existingTemplatePath = await this.findTemplateById(template.id);
            if (existingTemplatePath) {
                throw new Error(`Template with ID '${template.id}' already exists`);
            }
            await this.saveTemplate(template);
            if (exportData.files && typeof exportData.files === 'object') {
                const templateFilesDir = path.join(this.templatesDir, template.id, 'files');
                await fs.ensureDir(templateFilesDir);
                for (const [relativePath, content] of Object.entries(exportData.files)) {
                    if (typeof content === 'string') {
                        const filePath = path.join(templateFilesDir, relativePath);
                        await fs.ensureDir(path.dirname(filePath));
                        await fs.writeFile(filePath, content, 'utf-8');
                    }
                }
            }
            return template;
        }
        catch (error) {
            throw new Error(`Failed to import template: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async loadTemplate(templatePath) {
        const templateJsonPath = path.join(templatePath, 'template.json');
        if (!await fs.pathExists(templateJsonPath)) {
            throw new Error(`Template definition not found at ${templateJsonPath}`);
        }
        try {
            const templateJson = await fs.readJson(templateJsonPath);
            const validationErrors = await this.validateTemplate(templateJson);
            if (validationErrors.length > 0) {
                throw new Error(`Invalid template: ${validationErrors.join(', ')}`);
            }
            return templateJson;
        }
        catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error(`Invalid JSON in template definition: ${error.message}`);
            }
            throw error;
        }
    }
    async saveTemplate(template) {
        const templateDir = path.join(this.templatesDir, template.id);
        const templateJsonPath = path.join(templateDir, 'template.json');
        try {
            await fs.ensureDir(templateDir);
            await fs.writeJson(templateJsonPath, template, { spaces: 2 });
        }
        catch (error) {
            throw new Error(`Failed to save template '${template.id}': ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async ensureDirectoriesExist() {
        try {
            await fs.ensureDir(this.templatesDir);
            await fs.ensureDir(this.cacheDir);
        }
        catch (error) {
            throw new Error(`Failed to create scaffold directories: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getTemplateDirectories() {
        try {
            const entries = await fs.readdir(this.templatesDir, { withFileTypes: true });
            return entries
                .filter(entry => entry.isDirectory())
                .map(entry => path.join(this.templatesDir, entry.name));
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }
    async findTemplateById(id) {
        const templateDirs = await this.getTemplateDirectories();
        for (const templateDir of templateDirs) {
            try {
                const template = await this.loadTemplate(templateDir);
                if (template.id === id) {
                    return templateDir;
                }
            }
            catch (error) {
                continue;
            }
        }
        return null;
    }
    async getFileList(directory) {
        const files = [];
        const processDirectory = async (dir) => {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    await processDirectory(fullPath);
                }
                else if (entry.isFile()) {
                    files.push(fullPath);
                }
            }
        };
        await processDirectory(directory);
        return files;
    }
}
exports.TemplateService = TemplateService;
//# sourceMappingURL=template-service.js.map