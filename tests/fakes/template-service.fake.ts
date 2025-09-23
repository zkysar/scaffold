import type {
  ITemplateService,
} from '@/services/template-service';
import type {
  Template,
  TemplateLibrary,
  TemplateSummary,
  TemplateSource,
} from '@/models';

export class FakeTemplateService implements ITemplateService {
  private templates: Map<string, Template> = new Map();
  private templateSources: TemplateSource[] = [];
  private shouldThrowError: string | null = null;
  private nextReturnValue: any = null;

  reset(): void {
    this.templates.clear();
    this.templateSources = [];
    this.shouldThrowError = null;
    this.nextReturnValue = null;
  }

  setError(message: string): void {
    this.shouldThrowError = message;
  }

  setReturnValue(value: any): void {
    this.nextReturnValue = value;
  }

  addTemplate(template: Template): void {
    this.templates.set(template.id, template);
  }

  addTemplateSource(source: TemplateSource): void {
    this.templateSources.push(source);
  }

  private checkError(): void {
    if (this.shouldThrowError) {
      const error = this.shouldThrowError;
      this.shouldThrowError = null;
      throw new Error(error);
    }
  }

  private checkReturnValue(): any {
    if (this.nextReturnValue !== null) {
      const value = this.nextReturnValue;
      this.nextReturnValue = null;
      return value;
    }
    return null;
  }

  async loadTemplates(): Promise<TemplateLibrary> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    const templateSummaries: TemplateSummary[] = Array.from(this.templates.values()).map(t => ({
      id: t.id,
      name: t.name,
      version: t.version,
      description: t.description,
      source: 'local',
      installed: true,
      lastUpdated: t.updated,
      aliases: t.aliases,
    }));

    const sources = this.templateSources.length > 0
      ? this.templateSources
      : [{
          type: 'global' as const,
          path: '~/.scaffold/templates',
          priority: 100,
          enabled: true,
        }];

    return {
      sources,
      templates: templateSummaries,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getTemplate(identifier: string): Promise<Template> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    // Try exact match first
    if (this.templates.has(identifier)) {
      return this.templates.get(identifier)!;
    }

    // Try short SHA match
    for (const [id, template] of this.templates.entries()) {
      if (id.startsWith(identifier)) {
        return template;
      }
    }

    // Try alias match
    for (const template of this.templates.values()) {
      if (template.aliases?.includes(identifier)) {
        return template;
      }
    }

    throw new Error(`Template '${identifier}' not found`);
  }

  async searchTemplates(query: string): Promise<TemplateSummary[]> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.templates.values())
      .filter(t =>
        t.name.toLowerCase().includes(lowercaseQuery) ||
        t.description.toLowerCase().includes(lowercaseQuery)
      )
      .map(t => ({
        id: t.id,
        name: t.name,
        version: t.version,
        description: t.description,
        source: 'local',
        installed: true,
        lastUpdated: t.updated,
        aliases: t.aliases,
      }));
  }

  async createTemplate(template: Template): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    if (this.templates.has(template.id)) {
      throw new Error(`Template with ID '${template.id}' already exists`);
    }

    this.templates.set(template.id, {
      ...template,
      created: template.created || new Date().toISOString(),
      updated: new Date().toISOString(),
    });
  }

  async updateTemplate(template: Template): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    const existing = this.templates.get(template.id);
    this.templates.set(template.id, {
      ...template,
      created: existing?.created || template.created || new Date().toISOString(),
      updated: new Date().toISOString(),
    });
  }

  async deleteTemplate(identifier: string): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    // Try exact match
    if (this.templates.delete(identifier)) {
      return;
    }

    // Try short SHA match
    for (const [id] of this.templates.entries()) {
      if (id.startsWith(identifier)) {
        this.templates.delete(id);
        return;
      }
    }

    throw new Error(`Template '${identifier}' not found`);
  }

  async installTemplate(source: TemplateSource, templateId: string): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    throw new Error('Remote template installation not yet implemented');
  }

  async validateTemplate(template: Template): Promise<string[]> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    const errors: string[] = [];

    if (!template.id) {
      errors.push('Template ID is required');
    }
    if (!template.name) {
      errors.push('Template name is required');
    }
    if (!template.version) {
      errors.push('Template version is required');
    }
    if (!template.description) {
      errors.push('Template description is required');
    }
    if (!template.rootFolder) {
      errors.push('Template rootFolder is required');
    }

    return errors;
  }

  async getTemplateDependencies(identifier: string): Promise<Template[]> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    const template = await this.getTemplate(identifier);
    const dependencies: Template[] = [];
    const visited = new Set<string>();

    const collectDeps = (t: Template): void => {
      if (!t.dependencies) return;

      for (const depId of t.dependencies) {
        if (visited.has(depId)) continue;
        visited.add(depId);

        const depTemplate = this.templates.get(depId);
        if (depTemplate) {
          dependencies.push(depTemplate);
          collectDeps(depTemplate);
        }
      }
    };

    collectDeps(template);
    return dependencies;
  }

  async exportTemplate(templateId: string, outputPath: string): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }
  }

  async importTemplate(archivePath: string): Promise<Template> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    const template: Template = {
      id: 'imported-' + Date.now(),
      name: 'Imported Template',
      version: '1.0.0',
      description: 'Imported from ' + archivePath,
      rootFolder: '.',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      folders: [],
      files: [],
      variables: [],
      rules: {
        strictMode: false,
        allowExtraFiles: true,
        allowExtraFolders: true,
        conflictResolution: 'skip',
        excludePatterns: [],
        rules: [],
      },
    };

    this.templates.set(template.id, template);
    return template;
  }

  async loadTemplate(templatePath: string): Promise<Template> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    // Return first template if any exist, or create a dummy one
    const firstTemplate = this.templates.values().next().value;
    if (firstTemplate) {
      return firstTemplate;
    }

    return {
      id: 'loaded-' + Date.now(),
      name: 'Loaded Template',
      version: '1.0.0',
      description: 'Loaded from ' + templatePath,
      rootFolder: '.',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      folders: [],
      files: [],
      variables: [],
      rules: {
        strictMode: false,
        allowExtraFiles: true,
        allowExtraFolders: true,
        conflictResolution: 'skip',
        excludePatterns: [],
        rules: [],
      },
    };
  }

  async saveTemplate(template: Template): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    this.templates.set(template.id, template);
  }

  // Test helpers
  getStoredTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  hasTemplate(id: string): boolean {
    return this.templates.has(id);
  }
}