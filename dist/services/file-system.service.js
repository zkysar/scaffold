"use strict";
/**
 * File system service for abstracting all file operations with comprehensive error handling
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSystemService = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
class FileSystemService {
    _isDryRun = false;
    backupDir;
    tempDir;
    constructor() {
        this.backupDir = path.resolve(process.cwd(), '.scaffold-temp', 'backups');
        this.tempDir = path.resolve(process.cwd(), '.scaffold-temp', 'temp');
    }
    get isDryRun() {
        return this._isDryRun;
    }
    setDryRun(enabled) {
        this._isDryRun = enabled;
    }
    async createFile(filePath, content, options = {}) {
        const resolvedPath = this.resolvePath(filePath);
        if (this._isDryRun) {
            console.log(`[DRY RUN] Would create file: ${resolvedPath}`);
            return;
        }
        try {
            if (options.createParentDirs !== false) {
                await this.ensureDirectory(path.dirname(resolvedPath));
            }
            if (!options.overwrite && await this.exists(resolvedPath)) {
                throw new Error(`File already exists and overwrite is disabled: ${resolvedPath}`);
            }
            if (options.atomic) {
                await this.writeFileAtomic(resolvedPath, content, options);
            }
            else {
                const writeOptions = {};
                if (options.mode !== undefined) {
                    writeOptions.mode = options.mode;
                }
                await fs.writeFile(resolvedPath, content, writeOptions);
            }
            if (options.mode !== undefined) {
                await fs.chmod(resolvedPath, options.mode);
            }
        }
        catch (error) {
            throw this.enhanceError(error, `Failed to create file: ${resolvedPath}`, {
                suggestion: 'Ensure the parent directory exists and you have write permissions.',
                path: resolvedPath,
                operation: 'createFile'
            });
        }
    }
    async createDirectory(dirPath, options = {}) {
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
        }
        catch (error) {
            throw this.enhanceError(error, `Failed to create directory: ${resolvedPath}`, {
                suggestion: 'Ensure you have write permissions in the parent directory.',
                path: resolvedPath,
                operation: 'createDirectory'
            });
        }
    }
    async copyPath(source, dest, options = {}) {
        const resolvedSource = this.resolvePath(source);
        const resolvedDest = this.resolvePath(dest);
        if (this._isDryRun) {
            console.log(`[DRY RUN] Would copy: ${resolvedSource} -> ${resolvedDest}`);
            return;
        }
        try {
            if (!await this.exists(resolvedSource)) {
                throw new Error(`Source path does not exist: ${resolvedSource}`);
            }
            if (options.createParentDirs !== false) {
                await this.ensureDirectory(path.dirname(resolvedDest));
            }
            const copyOptions = {
                overwrite: options.overwrite,
                preserveTimestamps: options.preserveTimestamps,
                dereference: options.dereference,
                errorOnExist: options.errorOnExist,
                filter: options.filter
            };
            await fs.copy(resolvedSource, resolvedDest, copyOptions);
        }
        catch (error) {
            throw this.enhanceError(error, `Failed to copy: ${resolvedSource} -> ${resolvedDest}`, {
                suggestion: 'Ensure source exists and you have read/write permissions.',
                path: resolvedSource,
                operation: 'copyPath'
            });
        }
    }
    async deletePath(targetPath, options = {}) {
        const resolvedPath = this.resolvePath(targetPath);
        if (this._isDryRun) {
            console.log(`[DRY RUN] Would delete: ${resolvedPath}`);
            return;
        }
        try {
            if (!await this.exists(resolvedPath)) {
                if (!options.force) {
                    throw new Error(`Path does not exist: ${resolvedPath}`);
                }
                return;
            }
            const maxRetries = options.maxRetries || 3;
            let lastError = null;
            for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                    if (await this.isDirectory(resolvedPath)) {
                        if (options.recursive) {
                            await fs.remove(resolvedPath);
                        }
                        else {
                            await fs.rmdir(resolvedPath);
                        }
                    }
                    else {
                        await fs.unlink(resolvedPath);
                    }
                    return;
                }
                catch (error) {
                    lastError = error;
                    if (attempt < maxRetries - 1) {
                        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
                    }
                }
            }
            throw lastError;
        }
        catch (error) {
            throw this.enhanceError(error, `Failed to delete: ${resolvedPath}`, {
                suggestion: options.recursive
                    ? 'Ensure you have write permissions and no files are in use.'
                    : 'For directories, use recursive option or ensure directory is empty.',
                path: resolvedPath,
                operation: 'deletePath'
            });
        }
    }
    async exists(targetPath) {
        try {
            await fs.access(this.resolvePath(targetPath));
            return true;
        }
        catch {
            return false;
        }
    }
    existsSync(targetPath) {
        try {
            fs.accessSync(this.resolvePath(targetPath));
            return true;
        }
        catch {
            return false;
        }
    }
    async readJson(filePath) {
        const resolvedPath = this.resolvePath(filePath);
        try {
            if (!await this.exists(resolvedPath)) {
                throw new Error(`JSON file does not exist: ${resolvedPath}`);
            }
            return await fs.readJson(resolvedPath);
        }
        catch (error) {
            throw this.enhanceError(error, `Failed to read JSON file: ${resolvedPath}`, {
                suggestion: 'Ensure the file exists and contains valid JSON.',
                path: resolvedPath,
                operation: 'readJson'
            });
        }
    }
    async writeJson(filePath, data, options = {}) {
        const resolvedPath = this.resolvePath(filePath);
        if (this._isDryRun) {
            console.log(`[DRY RUN] Would write JSON to: ${resolvedPath}`);
            return;
        }
        try {
            if (options.createParentDirs !== false) {
                await this.ensureDirectory(path.dirname(resolvedPath));
            }
            if (!options.overwrite && await this.exists(resolvedPath)) {
                throw new Error(`JSON file already exists and overwrite is disabled: ${resolvedPath}`);
            }
            const jsonOptions = {
                spaces: options.spaces || 2,
                replacer: options.replacer
            };
            if (options.atomic) {
                const tempPath = `${resolvedPath}.tmp.${Date.now()}`;
                try {
                    await fs.writeJson(tempPath, data, jsonOptions);
                    await fs.move(tempPath, resolvedPath);
                }
                catch (error) {
                    await fs.remove(tempPath).catch(() => { });
                    throw error;
                }
            }
            else {
                await fs.writeJson(resolvedPath, data, jsonOptions);
            }
            if (options.mode !== undefined) {
                await fs.chmod(resolvedPath, options.mode);
            }
        }
        catch (error) {
            throw this.enhanceError(error, `Failed to write JSON file: ${resolvedPath}`, {
                suggestion: 'Ensure the parent directory exists and you have write permissions.',
                path: resolvedPath,
                operation: 'writeJson'
            });
        }
    }
    async readFile(filePath, encoding = 'utf8') {
        const resolvedPath = this.resolvePath(filePath);
        try {
            if (!await this.exists(resolvedPath)) {
                throw new Error(`File does not exist: ${resolvedPath}`);
            }
            return await fs.readFile(resolvedPath, encoding);
        }
        catch (error) {
            throw this.enhanceError(error, `Failed to read file: ${resolvedPath}`, {
                suggestion: 'Ensure the file exists and you have read permissions.',
                path: resolvedPath,
                operation: 'readFile'
            });
        }
    }
    async writeFile(filePath, content, options = {}) {
        const resolvedPath = this.resolvePath(filePath);
        if (this._isDryRun) {
            console.log(`[DRY RUN] Would write file: ${resolvedPath}`);
            return;
        }
        try {
            if (options.createParentDirs !== false) {
                await this.ensureDirectory(path.dirname(resolvedPath));
            }
            if (!options.overwrite && await this.exists(resolvedPath)) {
                throw new Error(`File already exists and overwrite is disabled: ${resolvedPath}`);
            }
            if (options.atomic) {
                await this.writeFileAtomic(resolvedPath, content, options);
            }
            else {
                const writeOptions = {};
                if (options.mode !== undefined) {
                    writeOptions.mode = options.mode;
                }
                await fs.writeFile(resolvedPath, content, writeOptions);
            }
            if (options.mode !== undefined) {
                await fs.chmod(resolvedPath, options.mode);
            }
        }
        catch (error) {
            throw this.enhanceError(error, `Failed to write file: ${resolvedPath}`, {
                suggestion: 'Ensure the parent directory exists and you have write permissions.',
                path: resolvedPath,
                operation: 'writeFile'
            });
        }
    }
    async stat(targetPath) {
        const resolvedPath = this.resolvePath(targetPath);
        try {
            return await fs.stat(resolvedPath);
        }
        catch (error) {
            throw this.enhanceError(error, `Failed to get stats for: ${resolvedPath}`, {
                suggestion: 'Ensure the path exists and you have read permissions.',
                path: resolvedPath,
                operation: 'stat'
            });
        }
    }
    async isDirectory(targetPath) {
        try {
            const stats = await this.stat(targetPath);
            return stats.isDirectory();
        }
        catch {
            return false;
        }
    }
    async isFile(targetPath) {
        try {
            const stats = await this.stat(targetPath);
            return stats.isFile();
        }
        catch {
            return false;
        }
    }
    async isSymlink(targetPath) {
        try {
            const stats = await fs.lstat(this.resolvePath(targetPath));
            return stats.isSymbolicLink();
        }
        catch {
            return false;
        }
    }
    async readDirectory(dirPath) {
        const resolvedPath = this.resolvePath(dirPath);
        try {
            if (!await this.exists(resolvedPath)) {
                throw new Error(`Directory does not exist: ${resolvedPath}`);
            }
            if (!await this.isDirectory(resolvedPath)) {
                throw new Error(`Path is not a directory: ${resolvedPath}`);
            }
            return await fs.readdir(resolvedPath);
        }
        catch (error) {
            throw this.enhanceError(error, `Failed to read directory: ${resolvedPath}`, {
                suggestion: 'Ensure the directory exists and you have read permissions.',
                path: resolvedPath,
                operation: 'readDirectory'
            });
        }
    }
    async backup(paths, description) {
        const backupId = (0, crypto_1.randomUUID)();
        const timestamp = new Date().toISOString();
        const backupPath = path.join(this.backupDir, backupId);
        if (this._isDryRun) {
            console.log(`[DRY RUN] Would create backup: ${backupId} for paths: ${paths.join(', ')}`);
            return backupId;
        }
        try {
            await this.ensureDirectory(backupPath);
            const backupInfo = {
                id: backupId,
                timestamp,
                paths: paths.map(p => this.resolvePath(p)),
                description
            };
            // Copy each path to backup
            for (const sourcePath of paths) {
                const resolvedSource = this.resolvePath(sourcePath);
                if (await this.exists(resolvedSource)) {
                    const relativePath = path.relative(process.cwd(), resolvedSource);
                    const backupTarget = path.join(backupPath, 'data', relativePath);
                    await this.copyPath(resolvedSource, backupTarget, { overwrite: true });
                }
            }
            // Save backup metadata
            await this.writeJson(path.join(backupPath, 'info.json'), backupInfo);
            return backupId;
        }
        catch (error) {
            // Cleanup failed backup
            await this.deletePath(backupPath, { recursive: true, force: true }).catch(() => { });
            throw this.enhanceError(error, `Failed to create backup for paths: ${paths.join(', ')}`, {
                suggestion: 'Ensure all source paths exist and you have read permissions.',
                operation: 'backup'
            });
        }
    }
    async restore(backupId) {
        const backupPath = path.join(this.backupDir, backupId);
        if (this._isDryRun) {
            console.log(`[DRY RUN] Would restore from backup: ${backupId}`);
            return;
        }
        try {
            if (!await this.exists(backupPath)) {
                throw new Error(`Backup does not exist: ${backupId}`);
            }
            const backupInfoPath = path.join(backupPath, 'info.json');
            if (!await this.exists(backupInfoPath)) {
                throw new Error(`Backup metadata is missing: ${backupId}`);
            }
            const backupInfo = await this.readJson(backupInfoPath);
            const dataPath = path.join(backupPath, 'data');
            // Restore each backed up path
            for (const originalPath of backupInfo.paths) {
                const relativePath = path.relative(process.cwd(), originalPath);
                const backupSource = path.join(dataPath, relativePath);
                if (await this.exists(backupSource)) {
                    await this.copyPath(backupSource, originalPath, { overwrite: true });
                }
            }
        }
        catch (error) {
            throw this.enhanceError(error, `Failed to restore from backup: ${backupId}`, {
                suggestion: 'Ensure the backup exists and you have write permissions to restore locations.',
                operation: 'restore'
            });
        }
    }
    async listBackups() {
        try {
            if (!await this.exists(this.backupDir)) {
                return [];
            }
            const backupDirs = await this.readDirectory(this.backupDir);
            const backups = [];
            for (const dirName of backupDirs) {
                const infoPath = path.join(this.backupDir, dirName, 'info.json');
                if (await this.exists(infoPath)) {
                    try {
                        const backupInfo = await this.readJson(infoPath);
                        backups.push(backupInfo);
                    }
                    catch {
                        // Skip corrupted backup metadata
                    }
                }
            }
            return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        }
        catch (error) {
            throw this.enhanceError(error, 'Failed to list backups', {
                suggestion: 'Ensure you have read permissions for the backup directory.',
                operation: 'listBackups'
            });
        }
    }
    async deleteBackup(backupId) {
        const backupPath = path.join(this.backupDir, backupId);
        if (this._isDryRun) {
            console.log(`[DRY RUN] Would delete backup: ${backupId}`);
            return;
        }
        try {
            if (!await this.exists(backupPath)) {
                throw new Error(`Backup does not exist: ${backupId}`);
            }
            await this.deletePath(backupPath, { recursive: true });
        }
        catch (error) {
            throw this.enhanceError(error, `Failed to delete backup: ${backupId}`, {
                suggestion: 'Ensure the backup exists and you have write permissions.',
                operation: 'deleteBackup'
            });
        }
    }
    resolvePath(...pathSegments) {
        return path.resolve(...pathSegments);
    }
    relativePath(from, to) {
        return path.relative(from, to);
    }
    normalizePath(targetPath) {
        return path.normalize(targetPath).replace(/\\/g, '/');
    }
    async ensureDirectory(dirPath) {
        if (this._isDryRun) {
            console.log(`[DRY RUN] Would ensure directory: ${dirPath}`);
            return;
        }
        try {
            await fs.ensureDir(this.resolvePath(dirPath));
        }
        catch (error) {
            throw this.enhanceError(error, `Failed to ensure directory: ${dirPath}`, {
                suggestion: 'Ensure you have write permissions in the parent directory.',
                path: dirPath,
                operation: 'ensureDirectory'
            });
        }
    }
    async move(source, dest, options = {}) {
        const resolvedSource = this.resolvePath(source);
        const resolvedDest = this.resolvePath(dest);
        if (this._isDryRun) {
            console.log(`[DRY RUN] Would move: ${resolvedSource} -> ${resolvedDest}`);
            return;
        }
        try {
            if (!await this.exists(resolvedSource)) {
                throw new Error(`Source path does not exist: ${resolvedSource}`);
            }
            if (options.createParentDirs !== false) {
                await this.ensureDirectory(path.dirname(resolvedDest));
            }
            if (!options.overwrite && await this.exists(resolvedDest)) {
                throw new Error(`Destination already exists and overwrite is disabled: ${resolvedDest}`);
            }
            await fs.move(resolvedSource, resolvedDest, { overwrite: options.overwrite });
        }
        catch (error) {
            throw this.enhanceError(error, `Failed to move: ${resolvedSource} -> ${resolvedDest}`, {
                suggestion: 'Ensure source exists and you have read/write permissions.',
                path: resolvedSource,
                operation: 'move'
            });
        }
    }
    /**
     * Write file atomically using temporary file
     */
    async writeFileAtomic(filePath, content, options = {}) {
        const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
        try {
            const writeOptions = {};
            if (options.mode !== undefined) {
                writeOptions.mode = options.mode;
            }
            await fs.writeFile(tempPath, content, writeOptions);
            await fs.move(tempPath, filePath);
        }
        catch (error) {
            // Cleanup temp file on failure
            await fs.remove(tempPath).catch(() => { });
            throw error;
        }
    }
    /**
     * Enhance error with additional context and recovery suggestions
     */
    enhanceError(originalError, message, context) {
        const error = new Error(`${message}\n${context.suggestion || ''}`);
        // Add context as properties
        Object.assign(error, {
            operation: context.operation,
            path: context.path,
            originalError
        });
        // Preserve original error details in stack trace
        if (originalError && originalError.stack) {
            error.stack = `${error.message}\nCaused by: ${originalError.stack}`;
        }
        return error;
    }
}
exports.FileSystemService = FileSystemService;
//# sourceMappingURL=file-system.service.js.map