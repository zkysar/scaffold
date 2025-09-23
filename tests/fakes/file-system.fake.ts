import type {
  IFileSystemService,
} from '@/services/file-system.service';

export class FakeFileSystemService implements IFileSystemService {
  private files: Map<string, string> = new Map();
  private directories: Set<string> = new Set();
  private shouldThrowError: string | null = null;
  private nextReturnValue: any = null;

  reset(): void {
    this.files.clear();
    this.directories.clear();
    this.shouldThrowError = null;
    this.nextReturnValue = null;
  }

  setError(message: string): void {
    this.shouldThrowError = message;
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

    this.setDirectory(dirPath);
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

  // Test helpers
  getFiles(): Map<string, string> {
    return new Map(this.files);
  }

  getDirectories(): Set<string> {
    return new Set(this.directories);
  }
}