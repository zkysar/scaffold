/**
 * Unit tests for FileCompletionProvider
 * Tests file/directory completions and path resolution
 */

import 'reflect-metadata';
import * as fs from 'fs';

// Mock fs-extra BEFORE importing other modules
const mockFsExtra = {
  access: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
};

jest.mock('fs-extra', () => mockFsExtra);

import * as path from 'path';
import { FileCompletionProvider } from '@/services/completion-providers/file-completion-provider';
import { CompletionContext, CompletionItem } from '@/models';

describe('FileCompletionProvider', () => {
  let provider: FileCompletionProvider;
  let context: CompletionContext;

  beforeEach(() => {
    provider = new FileCompletionProvider();

    context = {
      currentWord: '',
      previousWord: null,
      commandLine: ['scaffold', 'new'],
      cursorPosition: 12,
      environmentVars: new Map(),
      currentDirectory: '/test/workspace',
    };

    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock behaviors
    mockFsExtra.access.mockResolvedValue(undefined);
    mockFsExtra.readdir.mockResolvedValue([]);
    mockFsExtra.stat.mockResolvedValue({ size: 1024 });
  });

  afterEach(() => {
    provider.clearCache();
  });

  describe('getFileCompletions', () => {
    it('should return file and directory completions', async () => {
      const mockEntries = [
        { name: 'file1.txt', isDirectory: () => false, isFile: () => true },
        { name: 'file2.js', isDirectory: () => false, isFile: () => true },
        { name: 'subdir', isDirectory: () => true, isFile: () => false },
      ] as fs.Dirent[];

      mockFsExtra.readdir.mockResolvedValue(mockEntries);

      const result = await provider.getFileCompletions(context);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        value: 'subdir/',
        description: 'Directory',
        type: 'path',
        deprecated: false,
      });
      expect(result[1]).toEqual({
        value: 'file1.txt',
        description: 'File (1 KB)',
        type: 'path',
        deprecated: false,
      });
      expect(result[2]).toEqual({
        value: 'file2.js',
        description: 'File (1 KB)',
        type: 'path',
        deprecated: false,
      });
    });

    it('should filter completions by prefix', async () => {
      context.currentWord = 'file';

      const mockEntries = [
        { name: 'file1.txt', isDirectory: () => false, isFile: () => true },
        { name: 'file2.js', isDirectory: () => false, isFile: () => true },
        { name: 'other.txt', isDirectory: () => false, isFile: () => true },
      ] as fs.Dirent[];

      mockFsExtra.readdir.mockResolvedValue(mockEntries);

      const result = await provider.getFileCompletions(context);

      expect(result).toHaveLength(2);
      expect(result.map(r => r.value)).toEqual(['file1.txt', 'file2.js']);
    });

    it('should handle path with directory separator', async () => {
      context.currentWord = 'src/file';

      const mockEntries = [
        { name: 'file1.js', isDirectory: () => false, isFile: () => true },
        { name: 'file2.ts', isDirectory: () => false, isFile: () => true },
      ] as fs.Dirent[];

      mockFsExtra.readdir.mockResolvedValue(mockEntries);

      const result = await provider.getFileCompletions(context);

      expect(result).toHaveLength(2);
      expect(mockFsExtra.readdir).toHaveBeenCalledWith(
        path.resolve('/test/workspace', 'src'),
        { withFileTypes: true }
      );
    });

    it('should include hidden files when prefix starts with dot', async () => {
      context.currentWord = '.hid';

      const mockEntries = [
        { name: '.hidden-file', isDirectory: () => false, isFile: () => true },
        { name: '.hiddenrc', isDirectory: () => false, isFile: () => true },
        { name: 'visible-file', isDirectory: () => false, isFile: () => true },
      ] as fs.Dirent[];

      mockFsExtra.readdir.mockResolvedValue(mockEntries);

      const result = await provider.getFileCompletions(context);

      expect(result).toHaveLength(2);
      expect(result.map(r => r.value)).toEqual(['.hidden-file', '.hiddenrc']);
    });

    it('should exclude hidden files when prefix does not start with dot', async () => {
      context.currentWord = 'file';

      const mockEntries = [
        { name: '.hidden-file', isDirectory: () => false, isFile: () => true },
        { name: 'file1.txt', isDirectory: () => false, isFile: () => true },
      ] as fs.Dirent[];

      mockFsExtra.readdir.mockResolvedValue(mockEntries);

      const result = await provider.getFileCompletions(context);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('file1.txt');
    });

    it('should use cache for subsequent calls', async () => {
      mockFsExtra.readdir.mockResolvedValue([]);

      // First call
      await provider.getFileCompletions(context);
      expect(mockFsExtra.readdir).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await provider.getFileCompletions(context);
      expect(mockFsExtra.readdir).toHaveBeenCalledTimes(1);
    });

    it('should refresh cache after expiry', async () => {
      // Mock short cache expiry
      (provider as any).cacheExpiry = 1; // 1ms

      mockFsExtra.readdir.mockResolvedValue([]);

      // First call
      await provider.getFileCompletions(context);
      expect(mockFsExtra.readdir).toHaveBeenCalledTimes(1);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 2));

      // Second call should reload
      await provider.getFileCompletions(context);
      expect(mockFsExtra.readdir).toHaveBeenCalledTimes(2);
    });

    it('should handle nonexistent directory gracefully', async () => {
      mockFsExtra.access.mockRejectedValue(new Error('Directory not found'));

      const result = await provider.getFileCompletions(context);

      expect(result).toHaveLength(0);
    });

    it('should handle filesystem errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFsExtra.readdir.mockRejectedValue(new Error('Permission denied'));

      const result = await provider.getFileCompletions(context);

      expect(result).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get file completions:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should limit results to maxResults', async () => {
      // Create more entries than maxResults
      const maxResults = (provider as any).maxResults;
      const mockEntries = Array.from({ length: maxResults + 10 }, (_, i) => ({
        name: `file${i}.txt`,
        isDirectory: () => false,
        isFile: () => true,
      })) as fs.Dirent[];

      mockFsExtra.readdir.mockResolvedValue(mockEntries);

      const result = await provider.getFileCompletions(context);

      expect(result.length).toBeLessThanOrEqual(maxResults);
    });

    it('should sort directories before files', async () => {
      const mockEntries = [
        { name: 'zebra.txt', isDirectory: () => false, isFile: () => true },
        { name: 'alpha-dir', isDirectory: () => true, isFile: () => false },
        { name: 'beta.js', isDirectory: () => false, isFile: () => true },
      ] as fs.Dirent[];

      mockFsExtra.readdir.mockResolvedValue(mockEntries);

      const result = await provider.getFileCompletions(context);

      expect(result[0].value).toBe('alpha-dir/');
      expect(result[1].value).toBe('beta.js');
      expect(result[2].value).toBe('zebra.txt');
    });
  });

  describe('getDirectoryCompletions', () => {
    it('should return only directory completions', async () => {
      const mockEntries = [
        { name: 'file1.txt', isDirectory: () => false, isFile: () => true },
        { name: 'dir1', isDirectory: () => true, isFile: () => false },
        { name: 'dir2', isDirectory: () => true, isFile: () => false },
      ] as fs.Dirent[];

      mockFsExtra.readdir.mockResolvedValue(mockEntries);

      const result = await provider.getDirectoryCompletions(context);

      expect(result).toHaveLength(2);
      expect(result.map(r => r.value)).toEqual(['dir1/', 'dir2/']);
    });

    it('should filter directories by prefix', async () => {
      context.currentWord = 'src';

      const mockEntries = [
        { name: 'src', isDirectory: () => true, isFile: () => false },
        { name: 'scripts', isDirectory: () => true, isFile: () => false },
        { name: 'dist', isDirectory: () => true, isFile: () => false },
      ] as fs.Dirent[];

      mockFsExtra.readdir.mockResolvedValue(mockEntries);

      const result = await provider.getDirectoryCompletions(context);

      expect(result).toHaveLength(2);
      expect(result.map(r => r.value)).toEqual(['scripts/', 'src/']);
    });

    it('should handle path with directory separator for directories', async () => {
      context.currentWord = 'src/comp';

      const mockEntries = [
        { name: 'components', isDirectory: () => true, isFile: () => false },
        { name: 'compiler', isDirectory: () => true, isFile: () => false },
      ] as fs.Dirent[];

      mockFsExtra.readdir.mockResolvedValue(mockEntries);

      const result = await provider.getDirectoryCompletions(context);

      expect(result).toHaveLength(2);
      expect(mockFsExtra.readdir).toHaveBeenCalledWith(
        path.resolve('/test/workspace', 'src'),
        { withFileTypes: true }
      );
    });

    it('should use cache for directory completions', async () => {
      mockFsExtra.readdir.mockResolvedValue([]);

      // First call
      await provider.getDirectoryCompletions(context);
      expect(mockFsExtra.readdir).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await provider.getDirectoryCompletions(context);
      expect(mockFsExtra.readdir).toHaveBeenCalledTimes(1);
    });

    it('should handle errors in directory scanning', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFsExtra.readdir.mockRejectedValue(new Error('Access denied'));

      const result = await provider.getDirectoryCompletions(context);

      expect(result).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get directory completions:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('getFileCompletionsByExtension', () => {
    beforeEach(() => {
      const mockEntries = [
        { name: 'file1.js', isDirectory: () => false, isFile: () => true },
        { name: 'file2.ts', isDirectory: () => false, isFile: () => true },
        { name: 'file3.json', isDirectory: () => false, isFile: () => true },
        { name: 'file4.txt', isDirectory: () => false, isFile: () => true },
      ] as fs.Dirent[];

      mockFsExtra.readdir.mockResolvedValue(mockEntries);
    });

    it('should filter files by extension', async () => {
      const result = await provider.getFileCompletionsByExtension(context, ['.js', '.ts']);

      expect(result).toHaveLength(2);
      expect(result.map(r => r.value)).toEqual(['file1.js', 'file2.ts']);
    });

    it('should handle extensions without leading dot', async () => {
      const result = await provider.getFileCompletionsByExtension(context, ['js', 'ts']);

      expect(result).toHaveLength(2);
      expect(result.map(r => r.value)).toEqual(['file1.js', 'file2.ts']);
    });

    it('should handle mixed extension formats', async () => {
      const result = await provider.getFileCompletionsByExtension(context, ['.js', 'json']);

      expect(result).toHaveLength(2);
      expect(result.map(r => r.value)).toEqual(['file1.js', 'file3.json']);
    });

    it('should return empty array for no matching extensions', async () => {
      const result = await provider.getFileCompletionsByExtension(context, ['.py', '.rb']);

      expect(result).toHaveLength(0);
    });

    it('should handle case-insensitive extension matching', async () => {
      const mockEntries = [
        { name: 'file1.JS', isDirectory: () => false, isFile: () => true },
        { name: 'file2.Ts', isDirectory: () => false, isFile: () => true },
      ] as fs.Dirent[];

      mockFsExtra.readdir.mockResolvedValue(mockEntries);

      const result = await provider.getFileCompletionsByExtension(context, ['.js', '.ts']);

      expect(result).toHaveLength(2);
    });
  });

  describe('getRelativePathCompletions', () => {
    it('should return relative paths from current directory', async () => {
      const mockEntries = [
        { name: 'file.txt', isDirectory: () => false, isFile: () => true },
      ] as fs.Dirent[];

      mockFsExtra.readdir.mockResolvedValue(mockEntries);

      const result = await provider.getRelativePathCompletions(context);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('file.txt');
    });

    it('should handle subdirectory paths correctly', async () => {
      context.currentWord = 'src/';
      context.currentDirectory = '/test/workspace';

      const mockEntries = [
        { name: 'index.js', isDirectory: () => false, isFile: () => true },
      ] as fs.Dirent[];

      mockFsExtra.readdir.mockResolvedValue(mockEntries);

      const result = await provider.getRelativePathCompletions(context);

      expect(result).toHaveLength(1);
      // Should return relative path
      expect(result[0].value).toBe('index.js');
    });
  });

  describe('specialized completion methods', () => {
    beforeEach(() => {
      const mockEntries = [
        { name: 'config.json', isDirectory: () => false, isFile: () => true },
        { name: 'settings.yaml', isDirectory: () => false, isFile: () => true },
        { name: 'template.mustache', isDirectory: () => false, isFile: () => true },
        { name: 'view.hbs', isDirectory: () => false, isFile: () => true },
        { name: 'readme.txt', isDirectory: () => false, isFile: () => true },
      ] as fs.Dirent[];

      mockFsExtra.readdir.mockResolvedValue(mockEntries);
    });

    it('should return config file completions', async () => {
      const result = await provider.getConfigFileCompletions(context);

      expect(result).toHaveLength(2);
      expect(result.map(r => r.value)).toEqual(['config.json', 'settings.yaml']);
    });

    it('should return template file completions', async () => {
      const result = await provider.getTemplateFileCompletions(context);

      expect(result).toHaveLength(2);
      expect(result.map(r => r.value)).toEqual(['template.mustache', 'view.hbs']);
    });
  });

  describe('pathExists', () => {
    it('should return true for existing path', async () => {
      mockFsExtra.access.mockResolvedValue(undefined);

      const result = await provider.pathExists('/test/file.txt');

      expect(result).toBe(true);
      expect(mockFsExtra.access).toHaveBeenCalledWith('/test/file.txt');
    });

    it('should return false for non-existing path', async () => {
      mockFsExtra.access.mockRejectedValue(new Error('File not found'));

      const result = await provider.pathExists('/test/nonexistent.txt');

      expect(result).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear file completion cache', async () => {
      mockFsExtra.readdir.mockResolvedValue([]);

      // First call to populate cache
      await provider.getFileCompletions(context);
      expect(mockFsExtra.readdir).toHaveBeenCalledTimes(1);

      // Clear cache
      provider.clearCache();

      // Next call should reload
      await provider.getFileCompletions(context);
      expect(mockFsExtra.readdir).toHaveBeenCalledTimes(2);
    });
  });

  describe('private helper methods', () => {
    it('should parse file paths correctly', async () => {
      const parsedAbsolute = (provider as any).parseFilePath('/abs/path/file.txt', '/current');
      expect(parsedAbsolute.directory).toBe('/abs/path');
      expect(parsedAbsolute.filename).toBe('file.txt');

      const parsedRelative = (provider as any).parseFilePath('rel/path/file.txt', '/current');
      expect(parsedRelative.directory).toBe('/current/rel/path');
      expect(parsedRelative.filename).toBe('file.txt');
    });

    it('should scan directory correctly', async () => {
      const mockEntries = [
        { name: 'file1.txt', isDirectory: () => false, isFile: () => true },
        { name: 'dir1', isDirectory: () => true, isFile: () => false },
        { name: '.hidden', isDirectory: () => false, isFile: () => true },
      ] as fs.Dirent[];

      mockFsExtra.readdir.mockResolvedValue(mockEntries);

      const result = await (provider as any).scanDirectory('/test/dir', '', true, true);

      expect(result).toHaveLength(2); // Hidden file excluded
      expect(result[0].value).toBe('dir1/');
      expect(result[1].value).toBe('file1.txt');
    });

    it('should format file sizes correctly', async () => {
      const formatFileSize = (provider as any).formatFileSize;

      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should handle file stat errors gracefully', async () => {
      const mockEntries = [
        { name: 'file.txt', isDirectory: () => false, isFile: () => true },
      ] as fs.Dirent[];

      mockFsExtra.readdir.mockResolvedValue(mockEntries);
      mockFsExtra.stat.mockRejectedValue(new Error('Stat failed'));

      // Should still complete without throwing
      const result = await provider.getFileCompletions(context);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('file.txt');
    });
  });

  describe('edge cases', () => {
    it('should handle empty directory', async () => {
      mockFsExtra.readdir.mockResolvedValue([]);

      const result = await provider.getFileCompletions(context);

      expect(result).toHaveLength(0);
    });

    it('should handle directory with only hidden files', async () => {
      const mockEntries = [
        { name: '.hidden1', isDirectory: () => false, isFile: () => true },
        { name: '.hidden2', isDirectory: () => false, isFile: () => true },
      ] as fs.Dirent[];

      mockFsExtra.readdir.mockResolvedValue(mockEntries);

      const result = await provider.getFileCompletions(context);

      expect(result).toHaveLength(0); // Hidden files excluded by default
    });

    it('should handle files with no extension', async () => {
      const mockEntries = [
        { name: 'Makefile', isDirectory: () => false, isFile: () => true },
        { name: 'README', isDirectory: () => false, isFile: () => true },
      ] as fs.Dirent[];

      mockFsExtra.readdir.mockResolvedValue(mockEntries);

      const result = await provider.getFileCompletionsByExtension(context, ['.txt']);

      expect(result).toHaveLength(0);
    });

    it('should handle very long file names', async () => {
      const longFileName = 'very-long-file-name-that-exceeds-normal-length-limits-and-might-cause-issues.txt';
      const mockEntries = [
        { name: longFileName, isDirectory: () => false, isFile: () => true },
      ] as fs.Dirent[];

      mockFsExtra.readdir.mockResolvedValue(mockEntries);

      const result = await provider.getFileCompletions(context);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(longFileName);
    });

    it('should handle special characters in file names', async () => {
      const specialFileName = 'file with spaces & symbols!@#.txt';
      const mockEntries = [
        { name: specialFileName, isDirectory: () => false, isFile: () => true },
      ] as fs.Dirent[];

      mockFsExtra.readdir.mockResolvedValue(mockEntries);

      const result = await provider.getFileCompletions(context);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(specialFileName);
    });

    it('should handle concurrent cache requests', async () => {
      mockFsExtra.readdir.mockResolvedValue([]);

      // Make multiple concurrent requests
      const promises = [
        provider.getFileCompletions(context),
        provider.getFileCompletions(context),
        provider.getFileCompletions(context),
      ];

      const results = await Promise.all(promises);

      // All should return the same cached result
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);

      // FileSystem should only be called once due to caching
      expect(mockFsExtra.readdir).toHaveBeenCalledTimes(1);
    });

    it('should handle deep nested paths', async () => {
      context.currentWord = 'very/deep/nested/path/file';

      const mockEntries = [
        { name: 'file.txt', isDirectory: () => false, isFile: () => true },
      ] as fs.Dirent[];

      mockFsExtra.readdir.mockResolvedValue(mockEntries);

      const result = await provider.getFileCompletions(context);

      expect(mockFsExtra.readdir).toHaveBeenCalledWith(
        path.resolve('/test/workspace', 'very/deep/nested/path'),
        { withFileTypes: true }
      );
    });
  });
});