/**
 * Template-specific identifier service
 * Manages SHA-based identification and aliasing for templates
 */

import * as os from 'os';
import * as path from 'path';

import { injectable } from 'tsyringe';

import { generateSHAFromObject } from '@/lib/sha';
import type { Template } from '@/models';
import { IdentifierService } from '@/services/identifier-service';

/**
 * Service for managing template identifiers (SHAs and aliases)
 */
@injectable()
export class TemplateIdentifierService extends IdentifierService {
  private static instance: TemplateIdentifierService | null = null;

  constructor(aliasFilePath?: string) {
    const defaultPath = path.join(os.homedir(), '.scaffold', 'templates', 'aliases.json');
    super(aliasFilePath ?? defaultPath);
  }

  /**
   * Get singleton instance with optional custom alias file path
   */
  static getInstance(aliasFilePath?: string): TemplateIdentifierService {
    if (!TemplateIdentifierService.instance || aliasFilePath) {
      TemplateIdentifierService.instance = new TemplateIdentifierService(aliasFilePath);
    }
    return TemplateIdentifierService.instance;
  }

  /**
   * Compute SHA for a template based on its content
   * Excludes metadata fields like id, created, updated, and aliases
   * @param template - The template object
   * @returns SHA-256 hash of template content
   */
  computeTemplateSHA(template: Template): string {
    // Extract only the content-relevant fields for hashing
    const contentForHash = {
      name: template.name,
      version: template.version,
      description: template.description,
      rootFolder: template.rootFolder,
      author: template.author,
      folders: template.folders,
      files: template.files,
      variables: template.variables,
      rules: template.rules,
      dependencies: template.dependencies
    };

    // Generate SHA from the content
    return generateSHAFromObject(contentForHash, []);
  }

  /**
   * Migrate a template from UUID to SHA-based identification
   * @param template - The template with UUID
   * @returns Template with SHA as id
   */
  migrateTemplateToSHA(template: Template): Template {
    // Compute SHA from content
    const sha = this.computeTemplateSHA(template);

    // Create new template with SHA as id
    const migratedTemplate: Template = {
      ...template,
      id: sha,
      // Remove aliases from the template itself (managed separately)
      aliases: undefined
    };

    return migratedTemplate;
  }

  /**
   * Validate that a template's SHA matches its content
   * @param template - The template to validate
   * @returns True if SHA is valid
   */
  validateTemplateSHA(template: Template): boolean {
    const computedSHA = this.computeTemplateSHA(template);
    return template.id === computedSHA;
  }

  /**
   * Format template identifier for CLI display
   * @param template - The template
   * @param options - Display options
   */
  formatTemplateForDisplay(template: Template, options: { verbose?: boolean } = {}): string {
    return this.formatForDisplay(template.id, options);
  }

  /**
   * Register default aliases for common templates
   */
  async registerDefaultAliases(): Promise<void> {
    // This can be extended to register common aliases
    // For example: 'react' -> react template SHA
    // Currently a placeholder for future use
  }
}