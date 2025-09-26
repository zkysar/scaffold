/**
 * Template import/export service for import/export functionality
 */

import { injectable } from 'tsyringe';

import type { Template } from '@/models';

import { createMockServiceClass } from './mock-factory';

export interface ITemplateImportExportService {
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

export interface TemplateImportExportServiceOptions {
  templatesDir?: string;
  cacheDir?: string;
}

/**
 * Mock implementation of TemplateImportExportService
 * Replace this with actual implementation when ready
 */
@injectable()
export class TemplateImportExportService extends createMockServiceClass<ITemplateImportExportService>(
  'TemplateImportExportService'
) {}
