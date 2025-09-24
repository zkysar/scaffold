/**
 * Template completion provider for dynamic template name completions
 */

import { injectable, inject } from 'tsyringe';

import { logger } from '@/lib/logger';

import type { CompletionContext, CompletionItem } from '../../models';
import { TemplateService } from '../template-service';


export interface ITemplateCompletionProvider {
  /**
   * Get template name completions
   */
  getTemplateCompletions(context: CompletionContext): Promise<CompletionItem[]>;

  /**
   * Get template ID completions for specific context
   */
  getTemplateIdCompletions(context: CompletionContext): Promise<string[]>;

  /**
   * Get template names with descriptions
   */
  getTemplateDetails(context: CompletionContext): Promise<CompletionItem[]>;
}

@injectable()
export class TemplateCompletionProvider implements ITemplateCompletionProvider {
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private cache: Map<string, { data: CompletionItem[]; timestamp: number }> = new Map();

  constructor(
    @inject(TemplateService) private readonly templateService: TemplateService
  ) {}

  async getTemplateCompletions(context: CompletionContext): Promise<CompletionItem[]> {
    const cacheKey = 'template-completions';
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return this.filterCompletions(cached.data, context.currentWord);
    }

    try {
      const library = await this.templateService.loadTemplates();
      const completions: CompletionItem[] = library.templates.map(template => ({
        value: template.name,
        description: template.description,
        type: 'argument' as const,
        deprecated: false,
      }));

      this.cache.set(cacheKey, {
        data: completions,
        timestamp: Date.now(),
      });

      return this.filterCompletions(completions, context.currentWord);
    } catch (error) {
      logger.error('Failed to load templates for completion:', error);
      return [];
    }
  }

  async getTemplateIdCompletions(context: CompletionContext): Promise<string[]> {
    try {
      const library = await this.templateService.loadTemplates();
      const templateIds = library.templates.map(template => template.id);

      return this.filterStringCompletions(templateIds, context.currentWord);
    } catch (error) {
      logger.error('Failed to load template IDs for completion:', error);
      return [];
    }
  }

  async getTemplateDetails(context: CompletionContext): Promise<CompletionItem[]> {
    const cacheKey = 'template-details';
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return this.filterCompletions(cached.data, context.currentWord);
    }

    try {
      const library = await this.templateService.loadTemplates();
      const completions: CompletionItem[] = library.templates.map(template => ({
        value: template.name,
        description: `${template.description} (v${template.version})`,
        type: 'argument' as const,
        deprecated: false,
      }));

      this.cache.set(cacheKey, {
        data: completions,
        timestamp: Date.now(),
      });

      return this.filterCompletions(completions, context.currentWord);
    } catch (error) {
      logger.error('Failed to load template details for completion:', error);
      return [];
    }
  }

  /**
   * Clear completion cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Check if template exists by name
   */
  async templateExists(templateName: string): Promise<boolean> {
    try {
      const library = await this.templateService.loadTemplates();
      return library.templates.some(template =>
        template.name === templateName || template.id === templateName
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Get template by name or ID
   */
  async getTemplate(nameOrId: string): Promise<CompletionItem | null> {
    try {
      const library = await this.templateService.loadTemplates();
      const template = library.templates.find(t =>
        t.name === nameOrId || t.id === nameOrId
      );

      if (template) {
        return {
          value: template.name,
          description: template.description,
          type: 'argument',
          deprecated: false,
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private filterCompletions(completions: CompletionItem[], currentWord: string): CompletionItem[] {
    if (!currentWord) {
      return completions;
    }

    const lowerCurrentWord = currentWord.toLowerCase();
    return completions.filter(completion =>
      completion.value.toLowerCase().startsWith(lowerCurrentWord) ||
      (completion.description && completion.description.toLowerCase().includes(lowerCurrentWord))
    );
  }

  private filterStringCompletions(completions: string[], currentWord: string): string[] {
    if (!currentWord) {
      return completions;
    }

    const lowerCurrentWord = currentWord.toLowerCase();
    return completions.filter(completion =>
      completion.toLowerCase().startsWith(lowerCurrentWord)
    );
  }
}