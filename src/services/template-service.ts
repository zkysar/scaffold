/**
 * Template service for CRUD operations on templates
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import * as semver from 'semver';

import type {
  Template,
  TemplateLibrary,
  TemplateSummary,
  TemplateSource,
} from '../models';

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

export class TemplateService implements ITemplateService {
  private readonly templatesDir: string;
  private readonly cacheDir: string;

  constructor() {
    this.templatesDir = path.join(os.homedir(), '.scaffold', 'templates');
    this.cacheDir = path.join(os.homedir(), '.scaffold', 'cache');
  }

  async loadTemplates(): Promise<TemplateLibrary> {
    await this.ensureDirectoriesExist();

    try {
      const templateSummaries: TemplateSummary[] = [];
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
        } catch (error) {
          console.warn(`Failed to load template from ${templateDir}:`, error);
        }
      }

      const sources: TemplateSource[] = [
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
    } catch (error) {
      throw new Error(
        `Failed to load templates: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getTemplate(id: string): Promise<Template> {
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

  async searchTemplates(query: string): Promise<TemplateSummary[]> {
    if (!query || typeof query !== 'string') {
      throw new Error('Search query must be a non-empty string');
    }

    const library = await this.loadTemplates();
    const lowercaseQuery = query.toLowerCase();

    return library.templates.filter(
      template =>
        template.name.toLowerCase().includes(lowercaseQuery) ||
        template.description.toLowerCase().includes(lowercaseQuery)
    );
  }

  async createTemplate(template: Template): Promise<void> {
    const validationErrors = await this.validateTemplate(template);
    if (validationErrors.length > 0) {
      throw new Error(
        `Template validation failed: ${validationErrors.join(', ')}`
      );
    }

    await this.ensureDirectoriesExist();

    const existingTemplatePath = await this.findTemplateById(template.id);
    if (existingTemplatePath) {
      throw new Error(`Template with ID '${template.id}' already exists`);
    }

    const now = new Date().toISOString();
    const templateWithDates: Template = {
      ...template,
      created: template.created || now,
      updated: now,
    };

    await this.saveTemplate(templateWithDates);
  }

  async updateTemplate(template: Template): Promise<void> {
    const validationErrors = await this.validateTemplate(template);
    if (validationErrors.length > 0) {
      throw new Error(
        `Template validation failed: ${validationErrors.join(', ')}`
      );
    }

    await this.ensureDirectoriesExist();

    const existingTemplatePath = await this.findTemplateById(template.id);
    if (!existingTemplatePath) {
      throw new Error(`Template with ID '${template.id}' not found`);
    }

    const existingTemplate = await this.loadTemplate(existingTemplatePath);
    const updatedTemplate: Template = {
      ...template,
      created: existingTemplate.created,
      updated: new Date().toISOString(),
    };

    await this.saveTemplate(updatedTemplate);
  }

  async deleteTemplate(id: string): Promise<void> {
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
    } catch (error) {
      throw new Error(
        `Failed to delete template '${id}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async installTemplate(): Promise<void> {
    throw new Error('Remote template installation not yet implemented');
  }

  async validateTemplate(template: Template): Promise<string[]> {
    const errors: string[] = [];

    if (!template.id || typeof template.id !== 'string') {
      errors.push('Template ID is required and must be a string');
    }

    if (!template.name || typeof template.name !== 'string') {
      errors.push('Template name is required and must be a string');
    }

    if (!template.version || typeof template.version !== 'string') {
      errors.push('Template version is required and must be a string');
    } else if (!semver.valid(template.version)) {
      errors.push('Template version must be a valid semantic version');
    }

    if (!template.description || typeof template.description !== 'string') {
      errors.push('Template description is required and must be a string');
    }

    if (!template.rootFolder || typeof template.rootFolder !== 'string') {
      errors.push('Template rootFolder is required and must be a string');
    } else {
      // Validate rootFolder - allow "." for current directory or a simple directory name
      if (
        template.rootFolder !== '.' &&
        !/^[a-zA-Z0-9_-]+$/.test(template.rootFolder)
      ) {
        errors.push(
          'Template rootFolder must be "." or a simple directory name (alphanumeric, underscore, hyphen only)'
        );
      }
      if (
        template.rootFolder !== '.' &&
        (template.rootFolder.startsWith('.') ||
          template.rootFolder.startsWith('-'))
      ) {
        errors.push(
          'Template rootFolder cannot start with a dot or hyphen (except for ".")'
        );
      }
    }

    if (!Array.isArray(template.folders)) {
      errors.push('Template folders must be an array');
    } else {
      template.folders.forEach((folder, index) => {
        if (!folder.path || typeof folder.path !== 'string') {
          errors.push(`Folder ${index}: path is required and must be a string`);
        } else if (template.rootFolder) {
          // Validate that folder path starts with rootFolder
          if (template.rootFolder === '.') {
            // For current directory, paths should start with "./"
            if (!folder.path.startsWith('./') && folder.path !== '.') {
              errors.push(
                `Folder ${index}: path '${folder.path}' must start with './' when rootFolder is '.'`
              );
            }
          } else {
            if (
              !folder.path.startsWith(template.rootFolder + '/') &&
              folder.path !== template.rootFolder
            ) {
              errors.push(
                `Folder ${index}: path '${folder.path}' must start with rootFolder '${template.rootFolder}/'`
              );
            }
          }
        }
      });
    }

    if (!Array.isArray(template.files)) {
      errors.push('Template files must be an array');
    } else {
      template.files.forEach((file, index) => {
        if (!file.path || typeof file.path !== 'string') {
          errors.push(`File ${index}: path is required and must be a string`);
        } else if (template.rootFolder) {
          // Validate that file path starts with rootFolder
          if (template.rootFolder === '.') {
            // For current directory, paths should start with "./"
            if (!file.path.startsWith('./')) {
              errors.push(
                `File ${index}: path '${file.path}' must start with './' when rootFolder is '.'`
              );
            }
          } else {
            if (!file.path.startsWith(template.rootFolder + '/')) {
              errors.push(
                `File ${index}: path '${file.path}' must start with rootFolder '${template.rootFolder}/'`
              );
            }
          }
        }
        if (!file.sourcePath && !file.content) {
          errors.push(
            `File ${index}: either sourcePath or content must be provided`
          );
        }
      });
    }

    if (!Array.isArray(template.variables)) {
      errors.push('Template variables must be an array');
    } else {
      const variableNames = new Set<string>();
      template.variables.forEach((variable, index) => {
        if (!variable.name || typeof variable.name !== 'string') {
          errors.push(
            `Variable ${index}: name is required and must be a string`
          );
        } else if (variableNames.has(variable.name)) {
          errors.push(
            `Variable ${index}: duplicate variable name '${variable.name}'`
          );
        } else {
          variableNames.add(variable.name);
        }

        if (!variable.description || typeof variable.description !== 'string') {
          errors.push(
            `Variable ${index}: description is required and must be a string`
          );
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
    } else {
      if (typeof template.rules.strictMode !== 'boolean') {
        errors.push('Template rules.strictMode must be a boolean');
      }

      if (typeof template.rules.allowExtraFiles !== 'boolean') {
        errors.push('Template rules.allowExtraFiles must be a boolean');
      }

      if (typeof template.rules.allowExtraFolders !== 'boolean') {
        errors.push('Template rules.allowExtraFolders must be a boolean');
      }

      if (
        !['skip', 'replace', 'prompt', 'merge'].includes(
          template.rules.conflictResolution
        )
      ) {
        errors.push(
          'Template rules.conflictResolution must be one of: skip, replace, prompt, merge'
        );
      }

      if (!Array.isArray(template.rules.excludePatterns)) {
        errors.push('Template rules.excludePatterns must be an array');
      }

      if (!Array.isArray(template.rules.rules)) {
        errors.push('Template rules.rules must be an array');
      } else {
        const ruleIds = new Set<string>();
        template.rules.rules.forEach((rule, index) => {
          if (!rule.id || typeof rule.id !== 'string') {
            errors.push(`Rule ${index}: id is required and must be a string`);
          } else if (ruleIds.has(rule.id)) {
            errors.push(`Rule ${index}: duplicate rule ID '${rule.id}'`);
          } else {
            ruleIds.add(rule.id);
          }

          if (!rule.name || typeof rule.name !== 'string') {
            errors.push(`Rule ${index}: name is required and must be a string`);
          }

          if (!rule.target || typeof rule.target !== 'string') {
            errors.push(
              `Rule ${index}: target is required and must be a string`
            );
          } else if (template.rootFolder) {
            // Validate that rule target starts with rootFolder
            if (template.rootFolder === '.') {
              // For current directory, targets should start with "./"
              if (!rule.target.startsWith('./') && rule.target !== '.') {
                errors.push(
                  `Rule ${index}: target '${rule.target}' must start with './' when rootFolder is '.'`
                );
              }
            } else {
              if (
                !rule.target.startsWith(template.rootFolder + '/') &&
                rule.target !== template.rootFolder
              ) {
                errors.push(
                  `Rule ${index}: target '${rule.target}' must start with rootFolder '${template.rootFolder}/'`
                );
              }
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

  async getTemplateDependencies(templateId: string): Promise<Template[]> {
    const template = await this.getTemplate(templateId);
    const dependencies: Template[] = [];
    const visited = new Set<string>();

    const collectDependencies = async (
      currentTemplate: Template
    ): Promise<void> => {
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
        } catch (error) {
          throw new Error(
            `Failed to resolve dependency '${depId}': ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    };

    await collectDependencies(template);
    return dependencies;
  }

  async exportTemplate(templateId: string, outputPath: string): Promise<void> {
    const template = await this.getTemplate(templateId);
    const templatePath = await this.findTemplateById(templateId);

    if (!templatePath) {
      throw new Error(`Template with ID '${templateId}' not found`);
    }

    try {
      await fs.ensureDir(path.dirname(outputPath));

      const exportData = {
        template,
        files: {} as Record<string, string>,
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
    } catch (error) {
      throw new Error(
        `Failed to export template '${templateId}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async importTemplate(archivePath: string): Promise<Template> {
    if (!(await fs.pathExists(archivePath))) {
      throw new Error(`Archive file '${archivePath}' does not exist`);
    }

    try {
      const exportData = await fs.readJson(archivePath);

      if (!exportData.template || typeof exportData.template !== 'object') {
        throw new Error('Invalid export file: missing template data');
      }

      const template: Template = exportData.template;

      const existingTemplatePath = await this.findTemplateById(template.id);
      if (existingTemplatePath) {
        throw new Error(`Template with ID '${template.id}' already exists`);
      }

      await this.saveTemplate(template);

      if (exportData.files && typeof exportData.files === 'object') {
        const templateFilesDir = path.join(
          this.templatesDir,
          template.id,
          'files'
        );
        await fs.ensureDir(templateFilesDir);

        for (const [relativePath, content] of Object.entries(
          exportData.files
        )) {
          if (typeof content === 'string') {
            const filePath = path.join(templateFilesDir, relativePath);
            await fs.ensureDir(path.dirname(filePath));
            await fs.writeFile(filePath, content, 'utf-8');
          }
        }
      }

      return template;
    } catch (error) {
      throw new Error(
        `Failed to import template: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async loadTemplate(templatePath: string): Promise<Template> {
    const templateJsonPath = path.join(templatePath, 'template.json');

    if (!(await fs.pathExists(templateJsonPath))) {
      throw new Error(`Template definition not found at ${templateJsonPath}`);
    }

    try {
      const templateJson = await fs.readJson(templateJsonPath);
      const validationErrors = await this.validateTemplate(templateJson);

      if (validationErrors.length > 0) {
        throw new Error(`Invalid template: ${validationErrors.join(', ')}`);
      }

      return templateJson as Template;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(
          `Invalid JSON in template definition: ${error.message}`
        );
      }
      throw error;
    }
  }

  async saveTemplate(template: Template): Promise<void> {
    const templateDir = path.join(this.templatesDir, template.id);
    const templateJsonPath = path.join(templateDir, 'template.json');

    try {
      await fs.ensureDir(templateDir);
      await fs.writeJson(templateJsonPath, template, { spaces: 2 });
    } catch (error) {
      throw new Error(
        `Failed to save template '${template.id}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async ensureDirectoriesExist(): Promise<void> {
    try {
      await fs.ensureDir(this.templatesDir);
      await fs.ensureDir(this.cacheDir);
    } catch (error) {
      throw new Error(
        `Failed to create scaffold directories: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async getTemplateDirectories(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.templatesDir, {
        withFileTypes: true,
      });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => path.join(this.templatesDir, entry.name));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  private async findTemplateById(id: string): Promise<string | null> {
    const templateDirs = await this.getTemplateDirectories();

    for (const templateDir of templateDirs) {
      try {
        const template = await this.loadTemplate(templateDir);
        if (template.id === id) {
          return templateDir;
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  private async getFileList(directory: string): Promise<string[]> {
    const files: string[] = [];

    const processDirectory = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await processDirectory(fullPath);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    };

    await processDirectory(directory);
    return files;
  }
}
