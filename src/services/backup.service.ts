/**
 * Backup service for backup and restore functionality
 */

import { injectable } from 'tsyringe';

import { BackupInfo } from './file-system.service';
import { createMockServiceClass } from './mock-factory';

export interface IBackupService {
  /**
   * Create backup of specified paths
   */
  backup(paths: string[], description?: string): Promise<string>;

  /**
   * Restore from backup
   */
  restore(backupId: string): Promise<void>;

  /**
   * List available backups
   */
  listBackups(): Promise<BackupInfo[]>;

  /**
   * Delete a backup
   */
  deleteBackup(backupId: string): Promise<void>;
}

/**
 * Mock implementation of BackupService
 * Replace this with actual implementation when ready
 */
@injectable()
export class BackupService extends createMockServiceClass<IBackupService>(
  'BackupService'
) {}
