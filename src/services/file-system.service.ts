/**
 * File system service for abstracting all file operations with comprehensive error handling
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { enhanceError } from '../lib';

export interface BackupInfo {
  id: string;
  timestamp: string;
  paths: string[];
  description?: string;
}

export interface FileOperationOptions {
  overwrite?: boolean;
  preserveTimestamps?: boolean;
  mode?: number;
  createParentDirs?: boolean;
  atomic?: boolean;
}

export interface CopyOptions extends FileOperationOptions {
  filter?: (src: string, dest: string) => boolean;
  dereference?: boolean;
  errorOnExist?: boolean;
}

export interface DeleteOptions {
  recursive?: boolean;
  force?: boolean;
  maxRetries?: number;
}

export interface JsonWriteOptions extends FileOperationOptions {
  spaces?: number;
  replacer?: (key: string, value: any) => any;
}

export interface IFileSystemService {
  /**
   * Whether the service is in dry-run mode (no actual changes)
   */
  readonly isDryRun: boolean;

  /**
   * Set dry-run mode
   */
  setDryRun(enabled: boolean): void;

  /**
   * Create a file with content and proper permissions
   */
  createFile(
    filePath: string,
    content: string,
    options?: FileOperationOptions
  ): Promise<void>;

  /**
   * Create directories recursively
   */
  createDirectory(
    dirPath: string,
    options?: FileOperationOptions
  ): Promise<void>;

  /**
   * Copy files and directories
   */
  copyPath(source: string, dest: string, options?: CopyOptions): Promise<void>;

  /**
   * Delete files and directories safely
   */
  deletePath(targetPath: string, options?: DeleteOptions): Promise<void>;

  /**
   * Check if a path exists
   */
  exists(targetPath: string): Promise<boolean>;

  /**
   * Check if a path exists synchronously
   */
  existsSync(targetPath: string): boolean;

  /**
   * Read JSON file with proper error handling
   */
  readJson<T = any>(filePath: string): Promise<T>;

  /**
   * Write JSON file with atomic operation
   */
  writeJson(
    filePath: string,
    data: any,
    options?: JsonWriteOptions
  ): Promise<void>;

  /**
   * Read file content as string
   */
  readFile(filePath: string, encoding?: BufferEncoding): Promise<string>;

  /**
   * Write file content with atomic operation
   */
  writeFile(
    filePath: string,
    content: string,
    options?: FileOperationOptions
  ): Promise<void>;

  /**
   * Get file stats
   */
  stat(targetPath: string): Promise<fs.Stats>;

  /**
   * Check if path is a directory
   */
  isDirectory(targetPath: string): Promise<boolean>;

  /**
   * Check if path is a file
   */
  isFile(targetPath: string): Promise<boolean>;

  /**
   * Check if path is a symbolic link
   */
  isSymlink(targetPath: string): Promise<boolean>;

  /**
   * List directory contents
   */
  readDirectory(dirPath: string): Promise<string[]>;

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

  /**
   * Get absolute path from relative
   */
  resolvePath(...pathSegments: string[]): string;

  /**
   * Get relative path between two paths
   */
  relativePath(from: string, to: string): string;

  /**
   * Normalize path for cross-platform compatibility
   */
  normalizePath(targetPath: string): string;

  /**
   * Ensure directory exists (create if not)
   */
  ensureDirectory(dirPath: string): Promise<void>;

  /**
   * Move/rename a file or directory
   */
  move(
    source: string,
    dest: string,
    options?: FileOperationOptions
  ): Promise<void>;
}

export class FileSystemService implements IFileSystemService {
  private _isDryRun: boolean = false;
  private readonly backupDir: string;
  private readonly tempDir: string;

  constructor() {
    this.backupDir = path.resolve(process.cwd(), '.scaffold-temp', 'backups');
    this.tempDir = path.resolve(process.cwd(), '.scaffold-temp', 'temp');
  }

  get isDryRun(): boolean {
    return this._isDryRun;
  }

  setDryRun(enabled: boolean): void {
    this._isDryRun = enabled;
  }

  async createFile(
    filePath: string,
    content: string,
    options: FileOperationOptions = {}
  ): Promise<void> {
    const resolvedPath = this.resolvePath(filePath);

    if (this._isDryRun) {
      console.log(`[DRY RUN] Would create file: ${resolvedPath}`);
      return;
    }

    try {
      if (options.createParentDirs !== false) {
        await this.ensureDirectory(path.dirname(resolvedPath));
      }

      if (!options.overwrite && (await this.exists(resolvedPath))) {
        throw new Error(
          `File already exists and overwrite is disabled: ${resolvedPath}`
        );
      }

      if (options.atomic) {
        await this.writeFileAtomic(resolvedPath, content, options);
      } else {
        const writeOptions: fs.WriteFileOptions = {};
        if (options.mode !== undefined) {
          writeOptions.mode = options.mode;
        }
        await fs.writeFile(resolvedPath, content, writeOptions);
      }

      if (options.mode !== undefined) {
        await fs.chmod(resolvedPath, options.mode);
      }
    } catch (error) {
      throw enhanceError(error, `Failed to create file: ${resolvedPath}`, {
        suggestion:
          'Ensure the parent directory exists and you have write permissions.',
        path: resolvedPath,
        operation: 'createFile',
      });
    }
  }

  async createDirectory(
    dirPath: string,
    options: FileOperationOptions = {}
  ): Promise<void> {
    const resolvedPath = this.resolvePath(dirPath);

    if (this._isDryRun) {
      console.log(`[DRY RUN] Would create directory: ${resolvedPath}`);
      return;
    }

    try {
      await fs.ensureDir(resolvedPath);

      if (options.mode !== undefined) {
        await fs.chmod(resolvedPath, options.mode);
      }
    } catch (error) {
      throw enhanceError(error, `Failed to create directory: ${resolvedPath}`, {
        suggestion:
          'Ensure you have write permissions in the parent directory.',
        path: resolvedPath,
        operation: 'createDirectory',
      });
    }
  }

  async copyPath(
    source: string,
    dest: string,
    options: CopyOptions = {}
  ): Promise<void> {
    const resolvedSource = this.resolvePath(source);
    const resolvedDest = this.resolvePath(dest);

    if (this._isDryRun) {
      console.log(`[DRY RUN] Would copy: ${resolvedSource} -> ${resolvedDest}`);
      return;
    }

    try {
      if (!(await this.exists(resolvedSource))) {
        throw new Error(`Source path does not exist: ${resolvedSource}`);
      }

      if (options.createParentDirs !== false) {
        await this.ensureDirectory(path.dirname(resolvedDest));
      }

      const copyOptions: fs.CopyOptions = {
        overwrite: options.overwrite,
        preserveTimestamps: options.preserveTimestamps,
        dereference: options.dereference,
        errorOnExist: options.errorOnExist,
        filter: options.filter,
      };

      await fs.copy(resolvedSource, resolvedDest, copyOptions);
    } catch (error) {
      throw enhanceError(
        error,
        `Failed to copy: ${resolvedSource} -> ${resolvedDest}`,
        {
          suggestion:
            'Ensure source exists and you have read/write permissions.',
          path: resolvedSource,
          operation: 'copyPath',
        }
      );
    }
  }

  async deletePath(
    targetPath: string,
    options: DeleteOptions = {}
  ): Promise<void> {
    const resolvedPath = this.resolvePath(targetPath);

    if (this._isDryRun) {
      console.log(`[DRY RUN] Would delete: ${resolvedPath}`);
      return;
    }

    try {
      if (!(await this.exists(resolvedPath))) {
        if (!options.force) {
          throw new Error(`Path does not exist: ${resolvedPath}`);
        }
        return;
      }

      const maxRetries = options.maxRetries || 3;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          if (await this.isDirectory(resolvedPath)) {
            if (options.recursive) {
              await fs.remove(resolvedPath);
            } else {
              await fs.rmdir(resolvedPath);
            }
          } else {
            await fs.unlink(resolvedPath);
          }
          return;
        } catch (error) {
          lastError = error as Error;
          if (attempt < maxRetries - 1) {
            await new Promise(resolve =>
              setTimeout(resolve, 100 * (attempt + 1))
            );
          }
        }
      }

      throw lastError;
    } catch (error) {
      throw enhanceError(error, `Failed to delete: ${resolvedPath}`, {
        suggestion: options.recursive
          ? 'Ensure you have write permissions and no files are in use.'
          : 'For directories, use recursive option or ensure directory is empty.',
        path: resolvedPath,
        operation: 'deletePath',
      });
    }
  }

  async exists(targetPath: string): Promise<boolean> {
    try {
      await fs.access(this.resolvePath(targetPath));
      return true;
    } catch {
      return false;
    }
  }

  existsSync(targetPath: string): boolean {
    try {
      fs.accessSync(this.resolvePath(targetPath));
      return true;
    } catch {
      return false;
    }
  }

  async readJson<T = any>(filePath: string): Promise<T> {
    const resolvedPath = this.resolvePath(filePath);

    try {
      if (!(await this.exists(resolvedPath))) {
        throw new Error(`JSON file does not exist: ${resolvedPath}`);
      }

      return await fs.readJson(resolvedPath);
    } catch (error) {
      throw enhanceError(error, `Failed to read JSON file: ${resolvedPath}`, {
        suggestion: 'Ensure the file exists and contains valid JSON.',
        path: resolvedPath,
        operation: 'readJson',
      });
    }
  }

  async writeJson(
    filePath: string,
    data: any,
    options: JsonWriteOptions = {}
  ): Promise<void> {
    const resolvedPath = this.resolvePath(filePath);

    if (this._isDryRun) {
      console.log(`[DRY RUN] Would write JSON to: ${resolvedPath}`);
      return;
    }

    try {
      if (options.createParentDirs !== false) {
        await this.ensureDirectory(path.dirname(resolvedPath));
      }

      if (!options.overwrite && (await this.exists(resolvedPath))) {
        throw new Error(
          `JSON file already exists and overwrite is disabled: ${resolvedPath}`
        );
      }

      const jsonOptions = {
        spaces: options.spaces || 2,
        replacer: options.replacer,
      };

      if (options.atomic) {
        const tempPath = `${resolvedPath}.tmp.${Date.now()}`;
        try {
          await fs.writeJson(tempPath, data, jsonOptions);
          await fs.move(tempPath, resolvedPath);
        } catch (error) {
          await fs.remove(tempPath).catch(() => {});
          throw error;
        }
      } else {
        await fs.writeJson(resolvedPath, data, jsonOptions);
      }

      if (options.mode !== undefined) {
        await fs.chmod(resolvedPath, options.mode);
      }
    } catch (error) {
      throw enhanceError(error, `Failed to write JSON file: ${resolvedPath}`, {
        suggestion:
          'Ensure the parent directory exists and you have write permissions.',
        path: resolvedPath,
        operation: 'writeJson',
      });
    }
  }

  async readFile(
    filePath: string,
    encoding: BufferEncoding = 'utf8'
  ): Promise<string> {
    const resolvedPath = this.resolvePath(filePath);

    try {
      if (!(await this.exists(resolvedPath))) {
        throw new Error(`File does not exist: ${resolvedPath}`);
      }

      return await fs.readFile(resolvedPath, encoding);
    } catch (error) {
      throw enhanceError(error, `Failed to read file: ${resolvedPath}`, {
        suggestion: 'Ensure the file exists and you have read permissions.',
        path: resolvedPath,
        operation: 'readFile',
      });
    }
  }

  async writeFile(
    filePath: string,
    content: string,
    options: FileOperationOptions = {}
  ): Promise<void> {
    const resolvedPath = this.resolvePath(filePath);

    if (this._isDryRun) {
      console.log(`[DRY RUN] Would write file: ${resolvedPath}`);
      return;
    }

    try {
      if (options.createParentDirs !== false) {
        await this.ensureDirectory(path.dirname(resolvedPath));
      }

      if (!options.overwrite && (await this.exists(resolvedPath))) {
        throw new Error(
          `File already exists and overwrite is disabled: ${resolvedPath}`
        );
      }

      if (options.atomic) {
        await this.writeFileAtomic(resolvedPath, content, options);
      } else {
        const writeOptions: fs.WriteFileOptions = {};
        if (options.mode !== undefined) {
          writeOptions.mode = options.mode;
        }
        await fs.writeFile(resolvedPath, content, writeOptions);
      }

      if (options.mode !== undefined) {
        await fs.chmod(resolvedPath, options.mode);
      }
    } catch (error) {
      throw enhanceError(error, `Failed to write file: ${resolvedPath}`, {
        suggestion:
          'Ensure the parent directory exists and you have write permissions.',
        path: resolvedPath,
        operation: 'writeFile',
      });
    }
  }

  async stat(targetPath: string): Promise<fs.Stats> {
    const resolvedPath = this.resolvePath(targetPath);

    try {
      return await fs.stat(resolvedPath);
    } catch (error) {
      throw enhanceError(error, `Failed to get stats for: ${resolvedPath}`, {
        suggestion: 'Ensure the path exists and you have read permissions.',
        path: resolvedPath,
        operation: 'stat',
      });
    }
  }

  async isDirectory(targetPath: string): Promise<boolean> {
    try {
      const stats = await this.stat(targetPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  async isFile(targetPath: string): Promise<boolean> {
    try {
      const stats = await this.stat(targetPath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  async isSymlink(targetPath: string): Promise<boolean> {
    try {
      const stats = await fs.lstat(this.resolvePath(targetPath));
      return stats.isSymbolicLink();
    } catch {
      return false;
    }
  }

  async readDirectory(dirPath: string): Promise<string[]> {
    const resolvedPath = this.resolvePath(dirPath);

    try {
      if (!(await this.exists(resolvedPath))) {
        throw new Error(`Directory does not exist: ${resolvedPath}`);
      }

      if (!(await this.isDirectory(resolvedPath))) {
        throw new Error(`Path is not a directory: ${resolvedPath}`);
      }

      return await fs.readdir(resolvedPath);
    } catch (error) {
      throw enhanceError(error, `Failed to read directory: ${resolvedPath}`, {
        suggestion:
          'Ensure the directory exists and you have read permissions.',
        path: resolvedPath,
        operation: 'readDirectory',
      });
    }
  }

  async backup(paths: string[], description?: string): Promise<string> {
    const backupId = randomUUID();
    const timestamp = new Date().toISOString();
    const backupPath = path.join(this.backupDir, backupId);

    if (this._isDryRun) {
      console.log(
        `[DRY RUN] Would create backup: ${backupId} for paths: ${paths.join(', ')}`
      );
      return backupId;
    }

    try {
      await this.ensureDirectory(backupPath);

      const backupInfo: BackupInfo = {
        id: backupId,
        timestamp,
        paths: paths.map(p => this.resolvePath(p)),
        description,
      };

      // Copy each path to backup
      for (const sourcePath of paths) {
        const resolvedSource = this.resolvePath(sourcePath);
        if (await this.exists(resolvedSource)) {
          const relativePath = path.relative(process.cwd(), resolvedSource);
          const backupTarget = path.join(backupPath, 'data', relativePath);
          await this.copyPath(resolvedSource, backupTarget, {
            overwrite: true,
          });
        }
      }

      // Save backup metadata
      await this.writeJson(path.join(backupPath, 'info.json'), backupInfo);

      return backupId;
    } catch (error) {
      // Cleanup failed backup
      await this.deletePath(backupPath, { recursive: true, force: true }).catch(
        () => {}
      );

      throw enhanceError(
        error,
        `Failed to create backup for paths: ${paths.join(', ')}`,
        {
          suggestion:
            'Ensure all source paths exist and you have read permissions.',
          operation: 'backup',
        }
      );
    }
  }

  async restore(backupId: string): Promise<void> {
    const backupPath = path.join(this.backupDir, backupId);

    if (this._isDryRun) {
      console.log(`[DRY RUN] Would restore from backup: ${backupId}`);
      return;
    }

    try {
      if (!(await this.exists(backupPath))) {
        throw new Error(`Backup does not exist: ${backupId}`);
      }

      const backupInfoPath = path.join(backupPath, 'info.json');
      if (!(await this.exists(backupInfoPath))) {
        throw new Error(`Backup metadata is missing: ${backupId}`);
      }

      const backupInfo: BackupInfo = await this.readJson(backupInfoPath);
      const dataPath = path.join(backupPath, 'data');

      // Restore each backed up path
      for (const originalPath of backupInfo.paths) {
        const relativePath = path.relative(process.cwd(), originalPath);
        const backupSource = path.join(dataPath, relativePath);

        if (await this.exists(backupSource)) {
          await this.copyPath(backupSource, originalPath, { overwrite: true });
        }
      }
    } catch (error) {
      throw enhanceError(error, `Failed to restore from backup: ${backupId}`, {
        suggestion:
          'Ensure the backup exists and you have write permissions to restore locations.',
        operation: 'restore',
      });
    }
  }

  async listBackups(): Promise<BackupInfo[]> {
    try {
      if (!(await this.exists(this.backupDir))) {
        return [];
      }

      const backupDirs = await this.readDirectory(this.backupDir);
      const backups: BackupInfo[] = [];

      for (const dirName of backupDirs) {
        const infoPath = path.join(this.backupDir, dirName, 'info.json');
        if (await this.exists(infoPath)) {
          try {
            const backupInfo = await this.readJson<BackupInfo>(infoPath);
            backups.push(backupInfo);
          } catch {
            // Skip corrupted backup metadata
          }
        }
      }

      return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch (error) {
      throw enhanceError(error, 'Failed to list backups', {
        suggestion:
          'Ensure you have read permissions for the backup directory.',
        operation: 'listBackups',
      });
    }
  }

  async deleteBackup(backupId: string): Promise<void> {
    const backupPath = path.join(this.backupDir, backupId);

    if (this._isDryRun) {
      console.log(`[DRY RUN] Would delete backup: ${backupId}`);
      return;
    }

    try {
      if (!(await this.exists(backupPath))) {
        throw new Error(`Backup does not exist: ${backupId}`);
      }

      await this.deletePath(backupPath, { recursive: true });
    } catch (error) {
      throw enhanceError(error, `Failed to delete backup: ${backupId}`, {
        suggestion: 'Ensure the backup exists and you have write permissions.',
        operation: 'deleteBackup',
      });
    }
  }

  resolvePath(...pathSegments: string[]): string {
    return path.resolve(...pathSegments);
  }

  relativePath(from: string, to: string): string {
    return path.relative(from, to);
  }

  normalizePath(targetPath: string): string {
    return path.normalize(targetPath).replace(/\\/g, '/');
  }

  async ensureDirectory(dirPath: string): Promise<void> {
    if (this._isDryRun) {
      console.log(`[DRY RUN] Would ensure directory: ${dirPath}`);
      return;
    }

    try {
      await fs.ensureDir(this.resolvePath(dirPath));
    } catch (error) {
      throw enhanceError(error, `Failed to ensure directory: ${dirPath}`, {
        suggestion:
          'Ensure you have write permissions in the parent directory.',
        path: dirPath,
        operation: 'ensureDirectory',
      });
    }
  }

  async move(
    source: string,
    dest: string,
    options: FileOperationOptions = {}
  ): Promise<void> {
    const resolvedSource = this.resolvePath(source);
    const resolvedDest = this.resolvePath(dest);

    if (this._isDryRun) {
      console.log(`[DRY RUN] Would move: ${resolvedSource} -> ${resolvedDest}`);
      return;
    }

    try {
      if (!(await this.exists(resolvedSource))) {
        throw new Error(`Source path does not exist: ${resolvedSource}`);
      }

      if (options.createParentDirs !== false) {
        await this.ensureDirectory(path.dirname(resolvedDest));
      }

      if (!options.overwrite && (await this.exists(resolvedDest))) {
        throw new Error(
          `Destination already exists and overwrite is disabled: ${resolvedDest}`
        );
      }

      await fs.move(resolvedSource, resolvedDest, {
        overwrite: options.overwrite,
      });
    } catch (error) {
      throw enhanceError(
        error,
        `Failed to move: ${resolvedSource} -> ${resolvedDest}`,
        {
          suggestion:
            'Ensure source exists and you have read/write permissions.',
          path: resolvedSource,
          operation: 'move',
        }
      );
    }
  }

  /**
   * Write file atomically using temporary file
   */
  private async writeFileAtomic(
    filePath: string,
    content: string,
    options: FileOperationOptions = {}
  ): Promise<void> {
    const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;

    try {
      const writeOptions: fs.WriteFileOptions = {};
      if (options.mode !== undefined) {
        writeOptions.mode = options.mode;
      }

      await fs.writeFile(tempPath, content, writeOptions);
      await fs.move(tempPath, filePath);
    } catch (error) {
      // Cleanup temp file on failure
      await fs.remove(tempPath).catch(() => {});
      throw error;
    }
  }
}
