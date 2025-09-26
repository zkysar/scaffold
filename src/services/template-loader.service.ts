/**
 * Template loader service for loading and searching templates
 */

import { injectable } from 'tsyringe';

import type { Template, TemplateLibrary, TemplateSummary } from '@/models';

import { createMockServiceClass } from './mock-factory';

export interface ITemplateLoaderService {
  /**
   * Load all available templates from configured sources
   */
  loadTemplates(): Promise<TemplateLibrary>;

  /**
   * Get a specific template by ID (SHA, short SHA, or alias)
   */
  getTemplate(identifier: string): Promise<Template>;

  /**
   * Search templates by name or description
   */
  searchTemplates(query: string): Promise<TemplateSummary[]>;

  /**
   * Get all template SHAs
   */
  getAllTemplateSHAs(): Promise<string[]>;
}

export interface TemplateLoaderServiceOptions {
  templatesDir?: string;
  cacheDir?: string;
}

/**
 * Mock implementation of TemplateLoaderService
 * Replace this with actual implementation when ready
 */
@injectable()
export class TemplateLoaderService extends createMockServiceClass<ITemplateLoaderService>(
  'TemplateLoaderService'
) {}
