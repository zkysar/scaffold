/**
 * File operations service for core file system operations
 */

import * as fs from 'fs-extra';
import { injectable } from 'tsyringe';

import {
  FileOperationOptions,
  CopyOptions,
  DeleteOptions,
  JsonWriteOptions,
} from './file-system.service';
import { createMockServiceClass } from './mock-factory';

export interface IFileOperationsService {
  /**
   * Whether the service is in dry-run mode (no actual changes)
   */
  readonly isDryRun: boolean;

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
   * List directory contents
   */
  readDirectory(dirPath: string): Promise<string[]>;

  /**
   * Copy files and directories
   */
  copyPath(source: string, dest: string, options?: CopyOptions): Promise<void>;

  /**
   * Delete files and directories safely
   */
  deletePath(targetPath: string, options?: DeleteOptions): Promise<void>;

  /**
   * Move/rename a file or directory
   */
  move(
    source: string,
    dest: string,
    options?: FileOperationOptions
  ): Promise<void>;

  /**
   * Check if a path exists
   */
  exists(targetPath: string): Promise<boolean>;

  /**
   * Check if a path exists synchronously
   */
  existsSync(targetPath: string): boolean;

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
   * Read JSON file with proper error handling
   */
  readJson<T = unknown>(filePath: string): Promise<T>;

  /**
   * Write JSON file with atomic operation
   */
  writeJson(
    filePath: string,
    data: unknown,
    options?: JsonWriteOptions
  ): Promise<void>;

  /**
   * Ensure directory exists (create if not)
   */
  ensureDirectory(dirPath: string): Promise<void>;
}

/**
 * Mock implementation of FileOperationsService
 * Replace this with actual implementation when ready
 */
@injectable()
export class FileOperationsService extends createMockServiceClass<IFileOperationsService>(
  'FileOperationsService'
) {}
