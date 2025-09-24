import type {
  IFileSystemService,
} from '@/services/file-system.service';

export class FakeFileSystemService implements IFileSystemService {
  private files: Map<string, string> = new Map();
  private directories: Set<string> = new Set();
  private shouldThrowError: string | null = null;
  private nextReturnValue: any = null;
  private _isDryRun = false;
  private methodErrors: Map<string, string> = new Map();

  reset(): void {
    this.files.clear();
    this.directories.clear();
    this.shouldThrowError = null;
    this.nextReturnValue = null;
    this.methodErrors.clear();
  }

  setError(message: string): void {
    this.shouldThrowError = message;
  }

  setMethodError(method: string, message: string): void {
    this.methodErrors.set(method, message);
  }

  setReturnValue(value: any): void {
    this.nextReturnValue = value;
  }

  setFile(path: string, content: string): void {
    this.files.set(path, content);
    // Also add parent directories
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i++) {
      this.directories.add(parts.slice(0, i).join('/'));
    }
  }

  setDirectory(path: string): void {
    this.directories.add(path);
  }

  private checkError(): void {
    if (this.shouldThrowError) {
      const error = this.shouldThrowError;
      this.shouldThrowError = null;
      throw new Error(error);
    }
  }

  private checkReturnValue(): any {
    if (this.nextReturnValue !== null) {
      const value = this.nextReturnValue;
      this.nextReturnValue = null;
      return value;
    }
    return null;
  }

  async readFile(filePath: string): Promise<string> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return returnValue;

    const content = this.files.get(filePath);
    if (content === undefined) {
      throw new Error(`File not found: ${filePath}`);
    }
    return content;
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    this.setFile(filePath, content);
  }

  async exists(path: string): Promise<boolean> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return returnValue;

    return this.files.has(path) || this.directories.has(path);
  }

  async isDirectory(path: string): Promise<boolean> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return returnValue;

    return this.directories.has(path);
  }

  async isFile(path: string): Promise<boolean> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return returnValue;

    return this.files.has(path);
  }

  async createDirectory(dirPath: string): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    if (!this.isDryRun) {
      this.setDirectory(dirPath);
    }
  }

  async remove(path: string): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    this.files.delete(path);
    this.directories.delete(path);
    // Remove children
    for (const [filePath] of this.files) {
      if (filePath.startsWith(path + '/')) {
        this.files.delete(filePath);
      }
    }
    for (const dirPath of this.directories) {
      if (dirPath.startsWith(path + '/')) {
        this.directories.delete(dirPath);
      }
    }
  }

  async copy(source: string, destination: string): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    const content = this.files.get(source);
    if (content !== undefined) {
      this.setFile(destination, content);
    }
  }

  async move(source: string, destination: string): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    const content = this.files.get(source);
    if (content !== undefined) {
      this.files.delete(source);
      this.setFile(destination, content);
    }
  }

  async readDirectory(dirPath: string): Promise<string[]> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    const entries: Set<string> = new Set();
    const dirPrefix = dirPath.endsWith('/') ? dirPath : dirPath + '/';

    // Find all direct children
    for (const [filePath] of this.files) {
      if (filePath.startsWith(dirPrefix)) {
        const relativePath = filePath.slice(dirPrefix.length);
        const firstSlash = relativePath.indexOf('/');
        if (firstSlash === -1) {
          entries.add(relativePath);
        } else {
          entries.add(relativePath.substring(0, firstSlash));
        }
      }
    }

    for (const dir of this.directories) {
      if (dir.startsWith(dirPrefix) && dir !== dirPath) {
        const relativePath = dir.slice(dirPrefix.length);
        const firstSlash = relativePath.indexOf('/');
        if (firstSlash === -1) {
          entries.add(relativePath);
        }
      }
    }

    return Array.from(entries);
  }

  async getStats(path: string): Promise<{ size: number; mtime: Date }> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    if (this.files.has(path)) {
      const content = this.files.get(path)!;
      return {
        size: content.length,
        mtime: new Date(),
      };
    } else if (this.directories.has(path)) {
      return {
        size: 0,
        mtime: new Date(),
      };
    }

    throw new Error(`Path not found: ${path}`);
  }

  async glob(pattern: string, basePath?: string): Promise<string[]> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    // Simplified glob - just return all files that match a basic pattern
    const results: string[] = [];
    const base = basePath || '';
    const simplePattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
    const regex = new RegExp('^' + simplePattern + '$');

    for (const [filePath] of this.files) {
      const relativePath = base ? filePath.replace(base + '/', '') : filePath;
      if (regex.test(relativePath)) {
        results.push(filePath);
      }
    }

    return results;
  }

  get isDryRun(): boolean {
    return this._isDryRun;
  }

  setDryRun(enabled: boolean): void {
    this._isDryRun = enabled;
  }

  async createFile(filePath: string, content: string, options?: any): Promise<void> {
    this.checkError();
    if (!this.isDryRun) {
      this.setFile(filePath, content);
    }
  }

  async copyPath(source: string, dest: string, options?: any): Promise<void> {
    this.checkError();
    const content = this.files.get(source);
    if (content !== undefined && !this.isDryRun) {
      this.setFile(dest, content);
    }
  }

  async deletePath(targetPath: string, options?: any): Promise<void> {
    this.checkError();
    if (!this.isDryRun) {
      this.files.delete(targetPath);
      this.directories.delete(targetPath);
    }
  }

  existsSync(targetPath: string): boolean {
    return this.files.has(targetPath) || this.directories.has(targetPath);
  }

  async readJson<T = any>(filePath: string): Promise<T> {
    const content = await this.readFile(filePath);
    return JSON.parse(content);
  }

  async writeJson(filePath: string, data: any, options?: any): Promise<void> {
    this.checkError();

    // Check for method-specific error
    const methodError = this.methodErrors.get('writeJson');
    if (methodError) {
      this.methodErrors.delete('writeJson');
      throw new Error(methodError);
    }

    if (!this.isDryRun) {
      this.setFile(filePath, JSON.stringify(data, null, 2));
    }
  }

  async stat(targetPath: string): Promise<any> {
    this.checkError();
    if (this.files.has(targetPath)) {
      return { isFile: () => true, isDirectory: () => false };
    } else if (this.directories.has(targetPath)) {
      return { isFile: () => false, isDirectory: () => true };
    }
    throw new Error(`Path not found: ${targetPath}`);
  }

  async isSymlink(targetPath: string): Promise<boolean> {
    return false; // Simplified for testing
  }

  async backup(paths: string[], description?: string): Promise<string> {
    return 'backup-id-123'; // Simplified for testing
  }

  async restore(backupId: string): Promise<void> {
    // Simplified for testing
  }

  async listBackups(): Promise<any[]> {
    return []; // Simplified for testing
  }

  async deleteBackup(backupId: string): Promise<void> {
    // Simplified for testing
  }

  resolvePath(...pathSegments: string[]): string {
    return pathSegments.join('/');
  }

  relativePath(from: string, to: string): string {
    // Simplified implementation
    return to.startsWith(from) ? to.slice(from.length + 1) : to;
  }

  normalizePath(targetPath: string): string {
    return targetPath.replace(/\\/g, '/');
  }

  async ensureDirectory(dirPath: string): Promise<void> {
    this.checkError();
    if (!this.isDryRun) {
      this.setDirectory(dirPath);
    }
  }

  // Test helpers
  getFiles(): Map<string, string> {
    return new Map(this.files);
  }

  getDirectories(): Set<string> {
    return new Set(this.directories);
  }
}