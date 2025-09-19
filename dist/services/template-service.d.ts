/**
 * Template service for CRUD operations on templates
 */
import type { Template, TemplateLibrary, TemplateSummary, TemplateSource } from '../models';
export interface ITemplateService {
    /**
     * Load all available templates from configured sources
     */
    loadTemplates(): Promise<TemplateLibrary>;
    /**
     * Get a specific template by ID
     */
    getTemplate(id: string): Promise<Template>;
    /**
     * Search templates by name or description
     */
    searchTemplates(query: string): Promise<TemplateSummary[]>;
    /**
     * Create a new template
     */
    createTemplate(template: Template): Promise<void>;
    /**
     * Update an existing template
     */
    updateTemplate(template: Template): Promise<void>;
    /**
     * Delete a template by ID
     */
    deleteTemplate(id: string): Promise<void>;
    /**
     * Install a template from a remote source
     */
    installTemplate(source: TemplateSource, templateId: string): Promise<void>;
    /**
     * Validate template structure and dependencies
     */
    validateTemplate(template: Template): Promise<string[]>;
    /**
     * Get template dependencies (recursive)
     */
    getTemplateDependencies(templateId: string): Promise<Template[]>;
    /**
     * Export template as .tar.gz archive
     */
    exportTemplate(templateId: string, outputPath: string): Promise<void>;
    /**
     * Import template from .tar.gz archive
     */
    importTemplate(archivePath: string): Promise<Template>;
    /**
     * Load template from filesystem
     */
    loadTemplate(templatePath: string): Promise<Template>;
    /**
     * Save template to filesystem
     */
    saveTemplate(template: Template): Promise<void>;
}
export declare class TemplateService implements ITemplateService {
    private readonly templatesDir;
    private readonly cacheDir;
    constructor();
    loadTemplates(): Promise<TemplateLibrary>;
    getTemplate(id: string): Promise<Template>;
    searchTemplates(query: string): Promise<TemplateSummary[]>;
    createTemplate(template: Template): Promise<void>;
    updateTemplate(template: Template): Promise<void>;
    deleteTemplate(id: string): Promise<void>;
    installTemplate(source: TemplateSource, templateId: string): Promise<void>;
    validateTemplate(template: Template): Promise<string[]>;
    getTemplateDependencies(templateId: string): Promise<Template[]>;
    exportTemplate(templateId: string, outputPath: string): Promise<void>;
    importTemplate(archivePath: string): Promise<Template>;
    loadTemplate(templatePath: string): Promise<Template>;
    saveTemplate(template: Template): Promise<void>;
    private ensureDirectoriesExist;
    private getTemplateDirectories;
    private findTemplateById;
    private getFileList;
}
//# sourceMappingURL=template-service.d.ts.map