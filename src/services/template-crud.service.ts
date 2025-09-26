/**
 * Template CRUD service for create, update, delete operations
 */

import { injectable } from 'tsyringe';

import type { Template, TemplateSource } from '@/models';

import { createMockServiceClass } from './mock-factory';

export interface ITemplateCrudService {
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
}

export interface TemplateCrudServiceOptions {
  templatesDir?: string;
  cacheDir?: string;
}

/**
 * Mock implementation of TemplateCrudService
 * Replace this with actual implementation when ready
 */
@injectable()
export class TemplateCrudService extends createMockServiceClass<ITemplateCrudService>(
  'TemplateCrudService'
) {}
