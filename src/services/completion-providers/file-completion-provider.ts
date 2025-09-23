/**
 * File completion provider for path and file name completions
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import type { CompletionContext, CompletionItem } from '@/models';

export interface IFileCompletionProvider {
  /**
   * Get file path completions
   */
  getFileCompletions(context: CompletionContext): Promise<CompletionItem[]>;

  /**
   * Get directory completions
   */
  getDirectoryCompletions(context: CompletionContext): Promise<CompletionItem[]>;

  /**
   * Get completions for specific file extensions
   */
  getFileCompletionsByExtension(context: CompletionContext, extensions: string[]): Promise<CompletionItem[]>;

  /**
   * Get relative path completions from current directory
   */
  getRelativePathCompletions(context: CompletionContext): Promise<CompletionItem[]>;
}

export class FileCompletionProvider implements IFileCompletionProvider {
  private cacheExpiry: number = 30 * 1000; // 30 seconds
  private cache: Map<string, { data: CompletionItem[]; timestamp: number }> = new Map();
  private maxResults: number = 50; // Limit results for performance

  async getFileCompletions(context: CompletionContext): Promise<CompletionItem[]> {
    const currentWord = context.currentWord;
    let searchDir = context.currentDirectory;
    let prefix = '';

    // Parse the current word to extract directory and filename parts
    if (currentWord.includes('/')) {
      const parsed = this.parseFilePath(currentWord, context.currentDirectory);
      searchDir = parsed.directory;
      prefix = parsed.filename;
    } else {
      prefix = currentWord;
    }

    const cacheKey = `files-${searchDir}-${prefix}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      const completions = await this.scanDirectory(searchDir, prefix, true, true);

      this.cache.set(cacheKey, {
        data: completions,
        timestamp: Date.now(),
      });

      return completions;
    } catch (error) {
      console.error('Failed to get file completions:', error);
      return [];
    }
  }

  async getDirectoryCompletions(context: CompletionContext): Promise<CompletionItem[]> {
    const currentWord = context.currentWord;
    let searchDir = context.currentDirectory;
    let prefix = '';

    if (currentWord.includes('/')) {
      const parsed = this.parseFilePath(currentWord, context.currentDirectory);
      searchDir = parsed.directory;
      prefix = parsed.filename;
    } else {
      prefix = currentWord;
    }

    const cacheKey = `dirs-${searchDir}-${prefix}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      const completions = await this.scanDirectory(searchDir, prefix, false, true);

      this.cache.set(cacheKey, {
        data: completions,
        timestamp: Date.now(),
      });

      return completions;
    } catch (error) {
      console.error('Failed to get directory completions:', error);
      return [];
    }
  }

  async getFileCompletionsByExtension(context: CompletionContext, extensions: string[]): Promise<CompletionItem[]> {
    const allFiles = await this.getFileCompletions(context);

    return allFiles.filter(completion => {
      const ext = path.extname(completion.value).toLowerCase();
      return extensions.some(allowedExt =>
        ext === (allowedExt.startsWith('.') ? allowedExt : `.${allowedExt}`)
      );
    });
  }

  async getRelativePathCompletions(context: CompletionContext): Promise<CompletionItem[]> {
    // This method ensures all returned paths are relative to current directory
    const completions = await this.getFileCompletions(context);

    return completions.map(completion => {
      const absolutePath = path.resolve(context.currentDirectory, completion.value);
      const relativePath = path.relative(context.currentDirectory, absolutePath);

      return {
        ...completion,
        value: relativePath,
      };
    });
  }

  /**
   * Clear completion cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get specific file types (useful for templates, configs, etc.)
   */
  async getConfigFileCompletions(context: CompletionContext): Promise<CompletionItem[]> {
    const configExtensions = ['.json', '.yaml', '.yml', '.toml', '.ini'];
    return this.getFileCompletionsByExtension(context, configExtensions);
  }

  /**
   * Get template file completions
   */
  async getTemplateFileCompletions(context: CompletionContext): Promise<CompletionItem[]> {
    const templateExtensions = ['.mustache', '.hbs', '.handlebars', '.ejs', '.njk'];
    return this.getFileCompletionsByExtension(context, templateExtensions);
  }

  /**
   * Check if path exists and is accessible
   */
  async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  private parseFilePath(filePath: string, currentDirectory: string): { directory: string; filename: string } {
    let resolvedPath: string;

    if (path.isAbsolute(filePath)) {
      resolvedPath = filePath;
    } else {
      resolvedPath = path.resolve(currentDirectory, filePath);
    }

    const dirname = path.dirname(resolvedPath);
    const filename = path.basename(resolvedPath);

    return { directory: dirname, filename };
  }

  private async scanDirectory(
    directory: string,
    prefix: string,
    includeFiles: boolean,
    includeDirectories: boolean
  ): Promise<CompletionItem[]> {
    const completions: CompletionItem[] = [];

    try {
      if (!await this.pathExists(directory)) {
        return [];
      }

      const entries = await fs.readdir(directory, { withFileTypes: true });
      let count = 0;

      for (const entry of entries) {
        if (count >= this.maxResults) {
          break;
        }

        // Skip hidden files unless explicitly requested
        if (entry.name.startsWith('.') && !prefix.startsWith('.')) {
          continue;
        }

        // Filter by prefix
        if (prefix && !entry.name.toLowerCase().startsWith(prefix.toLowerCase())) {
          continue;
        }

        if (entry.isDirectory() && includeDirectories) {
          completions.push({
            value: entry.name + '/',
            description: 'Directory',
            type: 'path',
            deprecated: false,
          });
          count++;
        } else if (entry.isFile() && includeFiles) {
          const stats = await fs.stat(path.join(directory, entry.name));
          const sizeDescription = this.formatFileSize(stats.size);

          completions.push({
            value: entry.name,
            description: `File (${sizeDescription})`,
            type: 'path',
            deprecated: false,
          });
          count++;
        }
      }

      // Sort directories first, then files, both alphabetically
      return completions.sort((a, b) => {
        const aIsDir = a.value.endsWith('/');
        const bIsDir = b.value.endsWith('/');

        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;

        return a.value.localeCompare(b.value);
      });
    } catch (error) {
      console.error(`Error scanning directory ${directory}:`, error);
      return [];
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}