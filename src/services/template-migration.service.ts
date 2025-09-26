/**
 * Template migration service for migration and backup operations
 */

import { injectable } from 'tsyringe';

import { createMockServiceClass } from './mock-factory';

export interface ITemplateMigrationService {
  /**
   * Migrate all UUID-based templates to SHA-based identifiers
   * Creates backups before migration and provides rollback capability
   * @returns Object with migration results
   */
  migrateAllTemplatesToSHA(): Promise<{
    migrated: string[];
    failed: Array<{ template: string; error: string }>;
    backupDir: string;
  }>;

  /**
   * Rollback a migration using backup files
   * @param backupDir Directory containing backup files from a migration
   */
  rollbackMigration(backupDir: string): Promise<void>;
}

export interface TemplateMigrationServiceOptions {
  templatesDir?: string;
  cacheDir?: string;
}

/**
 * Mock implementation of TemplateMigrationService
 * Replace this with actual implementation when ready
 */
@injectable()
export class TemplateMigrationService extends createMockServiceClass<ITemplateMigrationService>(
  'TemplateMigrationService'
) {}
