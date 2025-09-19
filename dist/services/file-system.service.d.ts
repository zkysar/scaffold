/**
 * File system service for abstracting all file operations with comprehensive error handling
 */
import * as fs from 'fs-extra';
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
    createFile(filePath: string, content: string, options?: FileOperationOptions): Promise<void>;
    /**
     * Create directories recursively
     */
    createDirectory(dirPath: string, options?: FileOperationOptions): Promise<void>;
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
    writeJson(filePath: string, data: any, options?: JsonWriteOptions): Promise<void>;
    /**
     * Read file content as string
     */
    readFile(filePath: string, encoding?: BufferEncoding): Promise<string>;
    /**
     * Write file content with atomic operation
     */
    writeFile(filePath: string, content: string, options?: FileOperationOptions): Promise<void>;
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
    move(source: string, dest: string, options?: FileOperationOptions): Promise<void>;
}
export declare class FileSystemService implements IFileSystemService {
    private _isDryRun;
    private readonly backupDir;
    private readonly tempDir;
    constructor();
    get isDryRun(): boolean;
    setDryRun(enabled: boolean): void;
    createFile(filePath: string, content: string, options?: FileOperationOptions): Promise<void>;
    createDirectory(dirPath: string, options?: FileOperationOptions): Promise<void>;
    copyPath(source: string, dest: string, options?: CopyOptions): Promise<void>;
    deletePath(targetPath: string, options?: DeleteOptions): Promise<void>;
    exists(targetPath: string): Promise<boolean>;
    existsSync(targetPath: string): boolean;
    readJson<T = any>(filePath: string): Promise<T>;
    writeJson(filePath: string, data: any, options?: JsonWriteOptions): Promise<void>;
    readFile(filePath: string, encoding?: BufferEncoding): Promise<string>;
    writeFile(filePath: string, content: string, options?: FileOperationOptions): Promise<void>;
    stat(targetPath: string): Promise<fs.Stats>;
    isDirectory(targetPath: string): Promise<boolean>;
    isFile(targetPath: string): Promise<boolean>;
    isSymlink(targetPath: string): Promise<boolean>;
    readDirectory(dirPath: string): Promise<string[]>;
    backup(paths: string[], description?: string): Promise<string>;
    restore(backupId: string): Promise<void>;
    listBackups(): Promise<BackupInfo[]>;
    deleteBackup(backupId: string): Promise<void>;
    resolvePath(...pathSegments: string[]): string;
    relativePath(from: string, to: string): string;
    normalizePath(targetPath: string): string;
    ensureDirectory(dirPath: string): Promise<void>;
    move(source: string, dest: string, options?: FileOperationOptions): Promise<void>;
    /**
     * Write file atomically using temporary file
     */
    private writeFileAtomic;
    /**
     * Enhance error with additional context and recovery suggestions
     */
    private enhanceError;
}
//# sourceMappingURL=file-system.service.d.ts.map