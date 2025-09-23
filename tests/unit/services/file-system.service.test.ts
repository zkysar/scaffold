/**
 * Comprehensive unit tests for FileSystemService
 * Tests all public methods with error scenarios, edge cases, and options
 */

import mockFs from 'mock-fs';
import * as path from 'path';
import * as fs from 'fs-extra';
import { FileSystemService, type BackupInfo, type FileOperationOptions, type CopyOptions, type DeleteOptions, type JsonWriteOptions } from '../../../src/services/file-system.service';
import { createMockConsole } from '../../helpers/test-utils';

describe('FileSystemService', () => {
  let fileSystemService: FileSystemService;
  let mockConsole: ReturnType<typeof createMockConsole>;

  beforeEach(() => {
    // Create fresh service instance
    fileSystemService = new FileSystemService();

    // Setup mock console to capture dry-run output
    mockConsole = createMockConsole();
    jest.spyOn(console, 'log').mockImplementation(mockConsole.mockConsole.log);
    jest.spyOn(console, 'warn').mockImplementation(mockConsole.mockConsole.warn);
    jest.spyOn(console, 'error').mockImplementation(mockConsole.mockConsole.error);

    // Default mock filesystem structure
    mockFs({
      '/test': {
        'existing-file.txt': 'existing content',
        'existing-file.json': JSON.stringify({ test: 'data', number: 42 }),
        'empty-dir': {},
        'dir-with-files': {
          'file1.txt': 'content 1',
          'file2.txt': 'content 2',
          'subdir': {
            'nested-file.txt': 'nested content'
          }
        },
        'read-only-file.txt': mockFs.file({
          content: 'read only content',
          mode: 0o444
        }),
        'symlink-file.txt': mockFs.symlink({ path: '/test/existing-file.txt' }),
        'special-chars': {
          'file with spaces.txt': 'spaces content',
          'file-with-unicode-文件.txt': 'unicode content',
          'file!@#$%^&*().txt': 'special chars content'
        }
      },
      '/long-path': Array.from({ length: 50 }, (_, i) => `very-long-directory-name-${i}`).reduce((acc, dir) => {
        acc[dir] = {};
        return acc[dir];
      }, {} as any)
    });
  });

  afterEach(() => {
    mockFs.restore();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('constructor and initialization', () => {
    it('should initialize with correct default values', () => {
      expect(fileSystemService).toBeInstanceOf(FileSystemService);
      expect(fileSystemService.isDryRun).toBe(false);
    });

    it('should set backup and temp directories correctly', () => {
      const service = new FileSystemService();
      expect(service).toBeDefined();
      // Directories are private, but constructor should not throw
    });
  });

  describe('isDryRun and setDryRun', () => {
    it('should start with dry-run disabled', () => {
      expect(fileSystemService.isDryRun).toBe(false);
    });

    it('should enable dry-run mode', () => {
      fileSystemService.setDryRun(true);
      expect(fileSystemService.isDryRun).toBe(true);
    });

    it('should disable dry-run mode', () => {
      fileSystemService.setDryRun(true);
      fileSystemService.setDryRun(false);
      expect(fileSystemService.isDryRun).toBe(false);
    });
  });

  describe('exists and existsSync', () => {
    it('should return true for existing files', async () => {
      expect(await fileSystemService.exists('/test/existing-file.txt')).toBe(true);
      expect(fileSystemService.existsSync('/test/existing-file.txt')).toBe(true);
    });

    it('should return true for existing directories', async () => {
      expect(await fileSystemService.exists('/test/empty-dir')).toBe(true);
      expect(fileSystemService.existsSync('/test/empty-dir')).toBe(true);
    });

    it('should return false for non-existent paths', async () => {
      expect(await fileSystemService.exists('/test/non-existent.txt')).toBe(false);
      expect(fileSystemService.existsSync('/test/non-existent.txt')).toBe(false);
    });

    it('should handle relative paths', async () => {
      expect(await fileSystemService.exists('tests')).toBe(false); // Not in mock fs
    });

    it('should handle special characters in paths', async () => {
      expect(await fileSystemService.exists('/test/special-chars/file with spaces.txt')).toBe(true);
      expect(await fileSystemService.exists('/test/special-chars/file-with-unicode-文件.txt')).toBe(true);
    });
  });

  describe('createDirectory', () => {
    it('should create directory successfully', async () => {
      await fileSystemService.createDirectory('/test/new-dir');
      expect(await fileSystemService.exists('/test/new-dir')).toBe(true);
      expect(await fileSystemService.isDirectory('/test/new-dir')).toBe(true);
    });

    it('should create nested directories', async () => {
      await fileSystemService.createDirectory('/test/deep/nested/dir');
      expect(await fileSystemService.exists('/test/deep/nested/dir')).toBe(true);
      expect(await fileSystemService.isDirectory('/test/deep/nested/dir')).toBe(true);
    });

    it('should handle existing directory without error', async () => {
      await expect(fileSystemService.createDirectory('/test/empty-dir')).resolves.not.toThrow();
    });

    it('should respect mode option', async () => {
      await fileSystemService.createDirectory('/test/mode-dir', { mode: 0o755 });
      expect(await fileSystemService.exists('/test/mode-dir')).toBe(true);
    });

    it('should work in dry-run mode', async () => {
      fileSystemService.setDryRun(true);
      await fileSystemService.createDirectory('/test/dry-run-dir');

      expect(mockConsole.logs).toContain('[DRY RUN] Would create directory: /test/dry-run-dir');
      expect(await fileSystemService.exists('/test/dry-run-dir')).toBe(false);
    });

    it('should throw enhanced error on failure', async () => {
      // Mock fs.ensureDir to throw
      const mockEnsureDir = jest.spyOn(fs, 'ensureDir');
      (mockEnsureDir as any).mockRejectedValueOnce(new Error('Permission denied'));

      await expect(fileSystemService.createDirectory('/test/failed-dir')).rejects.toThrow('Failed to create directory');
    });

    it('should handle very long paths', async () => {
      const longPath = '/test/' + 'a'.repeat(200);
      await fileSystemService.createDirectory(longPath);
      expect(await fileSystemService.exists(longPath)).toBe(true);
    });

    it('should handle special characters in directory names', async () => {
      await fileSystemService.createDirectory('/test/dir with spaces');
      await fileSystemService.createDirectory('/test/dir-with-unicode-目录');
      await fileSystemService.createDirectory('/test/dir!@#$%^&*()');

      expect(await fileSystemService.exists('/test/dir with spaces')).toBe(true);
      expect(await fileSystemService.exists('/test/dir-with-unicode-目录')).toBe(true);
      expect(await fileSystemService.exists('/test/dir!@#$%^&*()')).toBe(true);
    });
  });

  describe('createFile', () => {
    it('should create file with content', async () => {
      await fileSystemService.createFile('/test/new-file.txt', 'test content');

      expect(await fileSystemService.exists('/test/new-file.txt')).toBe(true);
      expect(await fileSystemService.readFile('/test/new-file.txt')).toBe('test content');
    });

    it('should create parent directories by default', async () => {
      await fileSystemService.createFile('/test/new-dir/new-file.txt', 'content');

      expect(await fileSystemService.exists('/test/new-dir')).toBe(true);
      expect(await fileSystemService.exists('/test/new-dir/new-file.txt')).toBe(true);
    });

    it('should respect createParentDirs option', async () => {
      await expect(
        fileSystemService.createFile('/test/missing-dir/file.txt', 'content', { createParentDirs: false })
      ).rejects.toThrow();
    });

    it('should respect overwrite option', async () => {
      // First, try without overwrite (should fail)
      await expect(
        fileSystemService.createFile('/test/existing-file.txt', 'new content', { overwrite: false })
      ).rejects.toThrow('File already exists and overwrite is disabled');

      // Then with overwrite (should succeed)
      await fileSystemService.createFile('/test/existing-file.txt', 'new content', { overwrite: true });
      expect(await fileSystemService.readFile('/test/existing-file.txt')).toBe('new content');
    });

    it('should respect mode option', async () => {
      await fileSystemService.createFile('/test/mode-file.txt', 'content', { mode: 0o644 });
      expect(await fileSystemService.exists('/test/mode-file.txt')).toBe(true);
    });

    it('should use atomic write when requested', async () => {
      await fileSystemService.createFile('/test/atomic-file.txt', 'atomic content', { atomic: true });
      expect(await fileSystemService.readFile('/test/atomic-file.txt')).toBe('atomic content');
    });

    it('should work in dry-run mode', async () => {
      fileSystemService.setDryRun(true);
      await fileSystemService.createFile('/test/dry-file.txt', 'content');

      expect(mockConsole.logs).toContain('[DRY RUN] Would create file: /test/dry-file.txt');
      expect(await fileSystemService.exists('/test/dry-file.txt')).toBe(false);
    });

    it('should handle special characters in filename', async () => {
      await fileSystemService.createFile('/test/file with spaces.txt', 'content');
      await fileSystemService.createFile('/test/file-unicode-文件.txt', 'unicode content');

      expect(await fileSystemService.readFile('/test/file with spaces.txt')).toBe('content');
      expect(await fileSystemService.readFile('/test/file-unicode-文件.txt')).toBe('unicode content');
    });

    it('should throw enhanced error on failure', async () => {
      // Mock writeFile to simulate permission error
      const mockWriteFile = jest.spyOn(fs, 'writeFile');
      (mockWriteFile as any).mockRejectedValueOnce(Object.assign(new Error('Permission denied'), { code: 'EACCES' }));

      await expect(
        fileSystemService.createFile('/test/permission-denied.txt', 'content')
      ).rejects.toThrow('Failed to create file');
    });
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      const content = await fileSystemService.readFile('/test/existing-file.txt');
      expect(content).toBe('existing content');
    });

    it('should support different encodings', async () => {
      // Create a file with specific content
      await fileSystemService.createFile('/test/encoding-test.txt', 'test content');

      const utf8Content = await fileSystemService.readFile('/test/encoding-test.txt', 'utf8');
      const asciiContent = await fileSystemService.readFile('/test/encoding-test.txt', 'ascii');

      expect(utf8Content).toBe('test content');
      expect(asciiContent).toBe('test content');
    });

    it('should use utf8 encoding by default', async () => {
      const content = await fileSystemService.readFile('/test/existing-file.txt');
      expect(typeof content).toBe('string');
    });

    it('should throw error for non-existent file', async () => {
      await expect(
        fileSystemService.readFile('/test/non-existent.txt')
      ).rejects.toThrow('File does not exist');
    });

    it('should throw enhanced error on read failure', async () => {
      // Mock readFile to simulate permission error
      const mockReadFile = jest.spyOn(fs, 'readFile');
      (mockReadFile as any).mockRejectedValueOnce(Object.assign(new Error('Permission denied'), { code: 'EACCES' }));

      await expect(
        fileSystemService.readFile('/test/existing-file.txt')
      ).rejects.toThrow('Failed to read file');
    });

    it('should handle files with special characters', async () => {
      const content = await fileSystemService.readFile('/test/special-chars/file with spaces.txt');
      expect(content).toBe('spaces content');

      const unicodeContent = await fileSystemService.readFile('/test/special-chars/file-with-unicode-文件.txt');
      expect(unicodeContent).toBe('unicode content');
    });
  });

  describe('writeFile', () => {
    it('should write file content', async () => {
      await fileSystemService.writeFile('/test/write-test.txt', 'written content');
      expect(await fileSystemService.readFile('/test/write-test.txt')).toBe('written content');
    });

    it('should create parent directories by default', async () => {
      await fileSystemService.writeFile('/test/new-write-dir/file.txt', 'content');
      expect(await fileSystemService.exists('/test/new-write-dir')).toBe(true);
      expect(await fileSystemService.readFile('/test/new-write-dir/file.txt')).toBe('content');
    });

    it('should respect createParentDirs option', async () => {
      await expect(
        fileSystemService.writeFile('/test/missing-write-dir/file.txt', 'content', { createParentDirs: false })
      ).rejects.toThrow();
    });

    it('should respect overwrite option', async () => {
      await expect(
        fileSystemService.writeFile('/test/existing-file.txt', 'new content', { overwrite: false })
      ).rejects.toThrow('File already exists and overwrite is disabled');

      await fileSystemService.writeFile('/test/existing-file.txt', 'overwritten', { overwrite: true });
      expect(await fileSystemService.readFile('/test/existing-file.txt')).toBe('overwritten');
    });

    it('should respect mode option', async () => {
      await fileSystemService.writeFile('/test/mode-write.txt', 'content', { mode: 0o755 });
      expect(await fileSystemService.exists('/test/mode-write.txt')).toBe(true);
    });

    it('should use atomic write when requested', async () => {
      await fileSystemService.writeFile('/test/atomic-write.txt', 'atomic content', { atomic: true });
      expect(await fileSystemService.readFile('/test/atomic-write.txt')).toBe('atomic content');
    });

    it('should work in dry-run mode', async () => {
      fileSystemService.setDryRun(true);
      await fileSystemService.writeFile('/test/dry-write.txt', 'content');

      expect(mockConsole.logs).toContain('[DRY RUN] Would write file: /test/dry-write.txt');
      expect(await fileSystemService.exists('/test/dry-write.txt')).toBe(false);
    });

    it('should handle atomic write failures with cleanup', async () => {
      // Mock fs.move to fail during atomic write
      const mockMove = jest.spyOn(fs, 'move');
      (mockMove as any).mockRejectedValueOnce(new Error('Move failed'));

      await expect(
        fileSystemService.writeFile('/test/atomic-fail.txt', 'content', { atomic: true })
      ).rejects.toThrow('Failed to write file');
    });
  });

  describe('readJson and writeJson', () => {
    it('should read JSON file', async () => {
      const data = await fileSystemService.readJson('/test/existing-file.json');
      expect(data).toEqual({ test: 'data', number: 42 });
    });

    it('should read JSON with type parameter', async () => {
      interface TestData {
        test: string;
        number: number;
      }
      const data = await fileSystemService.readJson<TestData>('/test/existing-file.json');
      expect(data.test).toBe('data');
      expect(data.number).toBe(42);
    });

    it('should throw error for non-existent JSON file', async () => {
      await expect(
        fileSystemService.readJson('/test/missing.json')
      ).rejects.toThrow('JSON file does not exist');
    });

    it('should throw error for invalid JSON', async () => {
      await fileSystemService.createFile('/test/invalid.json', 'not json content');

      await expect(
        fileSystemService.readJson('/test/invalid.json')
      ).rejects.toThrow('Failed to read JSON file');
    });

    it('should write JSON file with default formatting', async () => {
      const data = { name: 'test', value: 123, nested: { prop: 'value' } };
      await fileSystemService.writeJson('/test/write-test.json', data);

      const content = await fileSystemService.readFile('/test/write-test.json');
      expect(JSON.parse(content)).toEqual(data);
      expect(content).toContain('  '); // Should have 2-space indentation by default
    });

    it('should respect spaces option', async () => {
      const data = { test: 'value' };
      await fileSystemService.writeJson('/test/spaces-test.json', data, { spaces: 4 });

      const content = await fileSystemService.readFile('/test/spaces-test.json');
      expect(content).toContain('    '); // Should have 4-space indentation
    });

    it('should respect replacer option', async () => {
      const data = { password: 'secret', username: 'user' };
      const replacer = (key: string, value: any) => key === 'password' ? '[REDACTED]' : value;

      await fileSystemService.writeJson('/test/replacer-test.json', data, { replacer });

      const parsed = await fileSystemService.readJson('/test/replacer-test.json');
      expect(parsed.password).toBe('[REDACTED]');
      expect(parsed.username).toBe('user');
    });

    it('should respect overwrite option for JSON', async () => {
      await expect(
        fileSystemService.writeJson('/test/existing-file.json', { new: 'data' }, { overwrite: false })
      ).rejects.toThrow('JSON file already exists and overwrite is disabled');

      await fileSystemService.writeJson('/test/existing-file.json', { new: 'data' }, { overwrite: true });
      const data = await fileSystemService.readJson('/test/existing-file.json');
      expect(data).toEqual({ new: 'data' });
    });

    it('should use atomic write for JSON when requested', async () => {
      const data = { atomic: true };
      await fileSystemService.writeJson('/test/atomic-json.json', data, { atomic: true });
      expect(await fileSystemService.readJson('/test/atomic-json.json')).toEqual(data);
    });

    it('should work in dry-run mode for JSON', async () => {
      fileSystemService.setDryRun(true);
      await fileSystemService.writeJson('/test/dry-json.json', { test: 'data' });

      expect(mockConsole.logs).toContain('[DRY RUN] Would write JSON to: /test/dry-json.json');
      expect(await fileSystemService.exists('/test/dry-json.json')).toBe(false);
    });

    it('should handle atomic JSON write failures', async () => {
      // Mock fs.move to fail
      const mockMove = jest.spyOn(fs, 'move');
      (mockMove as any).mockRejectedValueOnce(new Error('Move failed'));

      await expect(
        fileSystemService.writeJson('/test/atomic-json-fail.json', { data: 'test' }, { atomic: true })
      ).rejects.toThrow('Failed to write JSON file');
    });
  });

  describe('stat, isDirectory, isFile, isSymlink', () => {
    it('should get file stats', async () => {
      const stats = await fileSystemService.stat('/test/existing-file.txt');
      expect(stats).toBeDefined();
      expect(stats.isFile()).toBe(true);
      expect(stats.isDirectory()).toBe(false);
    });

    it('should identify directories correctly', async () => {
      expect(await fileSystemService.isDirectory('/test/empty-dir')).toBe(true);
      expect(await fileSystemService.isDirectory('/test/existing-file.txt')).toBe(false);
      expect(await fileSystemService.isDirectory('/test/non-existent')).toBe(false);
    });

    it('should identify files correctly', async () => {
      expect(await fileSystemService.isFile('/test/existing-file.txt')).toBe(true);
      expect(await fileSystemService.isFile('/test/empty-dir')).toBe(false);
      expect(await fileSystemService.isFile('/test/non-existent')).toBe(false);
    });

    it('should identify symbolic links correctly', async () => {
      expect(await fileSystemService.isSymlink('/test/symlink-file.txt')).toBe(true);
      expect(await fileSystemService.isSymlink('/test/existing-file.txt')).toBe(false);
      expect(await fileSystemService.isSymlink('/test/non-existent')).toBe(false);
    });

    it('should throw enhanced error for stat on non-existent path', async () => {
      await expect(
        fileSystemService.stat('/test/non-existent')
      ).rejects.toThrow('Failed to get stats for');
    });

    it('should handle permission errors gracefully for type checks', async () => {
      // These should return false rather than throw for inaccessible paths
      expect(await fileSystemService.isDirectory('/root/inaccessible')).toBe(false);
      expect(await fileSystemService.isFile('/root/inaccessible')).toBe(false);
      expect(await fileSystemService.isSymlink('/root/inaccessible')).toBe(false);
    });
  });

  describe('readDirectory', () => {
    it('should read directory contents', async () => {
      const contents = await fileSystemService.readDirectory('/test/dir-with-files');
      expect(contents).toContain('file1.txt');
      expect(contents).toContain('file2.txt');
      expect(contents).toContain('subdir');
    });

    it('should read empty directory', async () => {
      const contents = await fileSystemService.readDirectory('/test/empty-dir');
      expect(contents).toEqual([]);
    });

    it('should throw error for non-existent directory', async () => {
      await expect(
        fileSystemService.readDirectory('/test/non-existent-dir')
      ).rejects.toThrow('Directory does not exist');
    });

    it('should throw error for path that is not a directory', async () => {
      await expect(
        fileSystemService.readDirectory('/test/existing-file.txt')
      ).rejects.toThrow('Path is not a directory');
    });

    it('should handle directories with special characters', async () => {
      const contents = await fileSystemService.readDirectory('/test/special-chars');
      expect(contents).toContain('file with spaces.txt');
      expect(contents).toContain('file-with-unicode-文件.txt');
      expect(contents).toContain('file!@#$%^&*().txt');
    });
  });

  describe('copyPath', () => {
    it('should copy file to new location', async () => {
      await fileSystemService.copyPath('/test/existing-file.txt', '/test/copied-file.txt');

      expect(await fileSystemService.exists('/test/copied-file.txt')).toBe(true);
      expect(await fileSystemService.readFile('/test/copied-file.txt')).toBe('existing content');
    });

    it('should copy directory recursively', async () => {
      await fileSystemService.copyPath('/test/dir-with-files', '/test/copied-dir');

      expect(await fileSystemService.exists('/test/copied-dir')).toBe(true);
      expect(await fileSystemService.exists('/test/copied-dir/file1.txt')).toBe(true);
      expect(await fileSystemService.exists('/test/copied-dir/subdir/nested-file.txt')).toBe(true);
      expect(await fileSystemService.readFile('/test/copied-dir/file1.txt')).toBe('content 1');
    });

    it('should create parent directories by default', async () => {
      await fileSystemService.copyPath('/test/existing-file.txt', '/test/new-copy-dir/copied.txt');

      expect(await fileSystemService.exists('/test/new-copy-dir')).toBe(true);
      expect(await fileSystemService.exists('/test/new-copy-dir/copied.txt')).toBe(true);
    });

    it('should respect createParentDirs option', async () => {
      await expect(
        fileSystemService.copyPath('/test/existing-file.txt', '/test/missing-copy-dir/file.txt', { createParentDirs: false })
      ).rejects.toThrow();
    });

    it('should respect copy options', async () => {
      const options: CopyOptions = {
        overwrite: true,
        preserveTimestamps: true,
        dereference: false
      };

      await fileSystemService.copyPath('/test/existing-file.txt', '/test/options-copy.txt', options);
      expect(await fileSystemService.exists('/test/options-copy.txt')).toBe(true);
    });

    it('should use filter option', async () => {
      const filter = (src: string, dest: string) => !src.includes('file2.txt');

      await fileSystemService.copyPath('/test/dir-with-files', '/test/filtered-copy', { filter });

      expect(await fileSystemService.exists('/test/filtered-copy/file1.txt')).toBe(true);
      expect(await fileSystemService.exists('/test/filtered-copy/file2.txt')).toBe(false);
    });

    it('should work in dry-run mode', async () => {
      fileSystemService.setDryRun(true);
      await fileSystemService.copyPath('/test/existing-file.txt', '/test/dry-copy.txt');

      expect(mockConsole.logs).toContain('[DRY RUN] Would copy: /test/existing-file.txt -> /test/dry-copy.txt');
      expect(await fileSystemService.exists('/test/dry-copy.txt')).toBe(false);
    });

    it('should throw error for non-existent source', async () => {
      await expect(
        fileSystemService.copyPath('/test/non-existent.txt', '/test/destination.txt')
      ).rejects.toThrow('Source path does not exist');
    });

    it('should throw enhanced error on copy failure', async () => {
      // Mock fs.copy to fail
      const mockCopy = jest.spyOn(fs, 'copy');
      (mockCopy as any).mockRejectedValueOnce(new Error('Copy failed'));

      await expect(
        fileSystemService.copyPath('/test/existing-file.txt', '/test/copy-fail.txt')
      ).rejects.toThrow('Failed to copy');
    });
  });

  describe('deletePath', () => {
    it('should delete file', async () => {
      // Create a file to delete
      await fileSystemService.createFile('/test/to-delete.txt', 'content');

      await fileSystemService.deletePath('/test/to-delete.txt');
      expect(await fileSystemService.exists('/test/to-delete.txt')).toBe(false);
    });

    it('should delete empty directory', async () => {
      await fileSystemService.createDirectory('/test/to-delete-dir');

      await fileSystemService.deletePath('/test/to-delete-dir');
      expect(await fileSystemService.exists('/test/to-delete-dir')).toBe(false);
    });

    it('should delete directory recursively when option is set', async () => {
      await fileSystemService.deletePath('/test/dir-with-files', { recursive: true });
      expect(await fileSystemService.exists('/test/dir-with-files')).toBe(false);
    });

    it('should fail to delete non-empty directory without recursive option', async () => {
      await expect(
        fileSystemService.deletePath('/test/dir-with-files', { recursive: false })
      ).rejects.toThrow('Failed to delete');
    });

    it('should respect force option for non-existent paths', async () => {
      // Should not throw with force option
      await fileSystemService.deletePath('/test/non-existent', { force: true });

      // Should throw without force option
      await expect(
        fileSystemService.deletePath('/test/non-existent-2', { force: false })
      ).rejects.toThrow('Path does not exist');
    });

    it('should retry on failure with maxRetries option', async () => {
      // Create a file first
      await fileSystemService.createFile('/test/retry-delete.txt', 'content');

      // Mock unlink to fail first few times
      let callCount = 0;
      const mockUnlink = jest.spyOn(fs, 'unlink');
      (mockUnlink as any).mockImplementation(async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Temporary failure');
        }
        return undefined as any;
      });

      await fileSystemService.deletePath('/test/retry-delete.txt', { maxRetries: 3 });

      expect(callCount).toBe(3);
    });

    it('should work in dry-run mode', async () => {
      fileSystemService.setDryRun(true);
      await fileSystemService.deletePath('/test/existing-file.txt');

      expect(mockConsole.logs).toContain('[DRY RUN] Would delete: /test/existing-file.txt');
      expect(await fileSystemService.exists('/test/existing-file.txt')).toBe(true);
    });

    it('should throw enhanced error with helpful suggestions', async () => {
      await expect(
        fileSystemService.deletePath('/test/dir-with-files')
      ).rejects.toThrow('For directories, use recursive option');
    });
  });

  describe('move', () => {
    it('should move file to new location', async () => {
      await fileSystemService.createFile('/test/move-source.txt', 'move content');

      await fileSystemService.move('/test/move-source.txt', '/test/move-dest.txt');

      expect(await fileSystemService.exists('/test/move-source.txt')).toBe(false);
      expect(await fileSystemService.exists('/test/move-dest.txt')).toBe(true);
      expect(await fileSystemService.readFile('/test/move-dest.txt')).toBe('move content');
    });

    it('should move directory', async () => {
      await fileSystemService.createDirectory('/test/move-source-dir');
      await fileSystemService.createFile('/test/move-source-dir/file.txt', 'content');

      await fileSystemService.move('/test/move-source-dir', '/test/move-dest-dir');

      expect(await fileSystemService.exists('/test/move-source-dir')).toBe(false);
      expect(await fileSystemService.exists('/test/move-dest-dir')).toBe(true);
      expect(await fileSystemService.exists('/test/move-dest-dir/file.txt')).toBe(true);
    });

    it('should create parent directories by default', async () => {
      await fileSystemService.createFile('/test/move-file.txt', 'content');

      await fileSystemService.move('/test/move-file.txt', '/test/new-move-dir/moved.txt');

      expect(await fileSystemService.exists('/test/new-move-dir')).toBe(true);
      expect(await fileSystemService.exists('/test/new-move-dir/moved.txt')).toBe(true);
    });

    it('should respect overwrite option', async () => {
      await fileSystemService.createFile('/test/move-src.txt', 'source');
      await fileSystemService.createFile('/test/move-target.txt', 'target');

      await expect(
        fileSystemService.move('/test/move-src.txt', '/test/move-target.txt', { overwrite: false })
      ).rejects.toThrow('Destination already exists and overwrite is disabled');

      await fileSystemService.move('/test/move-src.txt', '/test/move-target.txt', { overwrite: true });
      expect(await fileSystemService.readFile('/test/move-target.txt')).toBe('source');
    });

    it('should work in dry-run mode', async () => {
      fileSystemService.setDryRun(true);
      await fileSystemService.move('/test/existing-file.txt', '/test/dry-move.txt');

      expect(mockConsole.logs).toContain('[DRY RUN] Would move: /test/existing-file.txt -> /test/dry-move.txt');
      expect(await fileSystemService.exists('/test/existing-file.txt')).toBe(true);
      expect(await fileSystemService.exists('/test/dry-move.txt')).toBe(false);
    });

    it('should throw error for non-existent source', async () => {
      await expect(
        fileSystemService.move('/test/non-existent.txt', '/test/destination.txt')
      ).rejects.toThrow('Source path does not exist');
    });
  });

  describe('ensureDirectory', () => {
    it('should create directory if it does not exist', async () => {
      await fileSystemService.ensureDirectory('/test/ensure-dir');
      expect(await fileSystemService.exists('/test/ensure-dir')).toBe(true);
      expect(await fileSystemService.isDirectory('/test/ensure-dir')).toBe(true);
    });

    it('should not fail if directory already exists', async () => {
      await fileSystemService.ensureDirectory('/test/empty-dir');
      expect(await fileSystemService.isDirectory('/test/empty-dir')).toBe(true);
    });

    it('should create nested directories', async () => {
      await fileSystemService.ensureDirectory('/test/ensure/deep/nested');
      expect(await fileSystemService.exists('/test/ensure/deep/nested')).toBe(true);
    });

    it('should work in dry-run mode', async () => {
      fileSystemService.setDryRun(true);
      await fileSystemService.ensureDirectory('/test/dry-ensure');

      expect(mockConsole.logs).toContain('[DRY RUN] Would ensure directory: /test/dry-ensure');
      expect(await fileSystemService.exists('/test/dry-ensure')).toBe(false);
    });

    it('should throw enhanced error on failure', async () => {
      const mockEnsureDir = jest.spyOn(fs, 'ensureDir');
      (mockEnsureDir as any).mockRejectedValueOnce(new Error('Permission denied'));

      await expect(
        fileSystemService.ensureDirectory('/test/ensure-fail')
      ).rejects.toThrow('Failed to ensure directory');
    });
  });

  describe('path utilities', () => {
    it('should resolve paths correctly', () => {
      const resolved = fileSystemService.resolvePath('test', 'file.txt');
      expect(path.isAbsolute(resolved)).toBe(true);
      expect(resolved.endsWith(path.join('test', 'file.txt'))).toBe(true);
    });

    it('should calculate relative paths', () => {
      const rel = fileSystemService.relativePath('/a/b/c', '/a/b/d');
      expect(rel).toBe('../d');
    });

    it('should normalize paths', () => {
      expect(fileSystemService.normalizePath('/test/./path/../file.txt')).toBe('/test/file.txt');
      expect(fileSystemService.normalizePath('test\\path\\file.txt')).toBe('test/path/file.txt');
    });

    it('should handle empty path segments in resolve', () => {
      const resolved = fileSystemService.resolvePath('', 'test', '', 'file.txt');
      expect(resolved.endsWith(path.join('test', 'file.txt'))).toBe(true);
    });

    it('should handle edge cases in path utilities', () => {
      expect(fileSystemService.relativePath('/same/path', '/same/path')).toBe('');
      expect(fileSystemService.normalizePath('')).toBe('.');
      expect(fileSystemService.normalizePath('/')).toBe('/');
    });
  });

  describe('backup and restore functionality', () => {
    it('should create backup of single file', async () => {
      const backupId = await fileSystemService.backup(['/test/existing-file.txt'], 'Test backup');

      expect(typeof backupId).toBe('string');
      expect(backupId.length).toBeGreaterThan(0);

      const backups = await fileSystemService.listBackups();
      expect(backups).toHaveLength(1);
      expect(backups[0].id).toBe(backupId);
      expect(backups[0].description).toBe('Test backup');
    });

    it('should create backup of multiple paths', async () => {
      const paths = ['/test/existing-file.txt', '/test/dir-with-files'];
      const backupId = await fileSystemService.backup(paths);

      const backups = await fileSystemService.listBackups();
      expect(backups).toHaveLength(1);
      expect(backups[0].paths).toEqual(paths.map(p => fileSystemService.resolvePath(p)));
    });

    it('should restore from backup', async () => {
      // Create backup
      const originalContent = await fileSystemService.readFile('/test/existing-file.txt');
      const backupId = await fileSystemService.backup(['/test/existing-file.txt']);

      // Modify original file
      await fileSystemService.writeFile('/test/existing-file.txt', 'modified content', { overwrite: true });
      expect(await fileSystemService.readFile('/test/existing-file.txt')).toBe('modified content');

      // Restore from backup
      await fileSystemService.restore(backupId);
      expect(await fileSystemService.readFile('/test/existing-file.txt')).toBe(originalContent);
    });

    it('should list backups in reverse chronological order', async () => {
      const backup1 = await fileSystemService.backup(['/test/existing-file.txt'], 'First backup');

      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const backup2 = await fileSystemService.backup(['/test/dir-with-files'], 'Second backup');

      const backups = await fileSystemService.listBackups();
      expect(backups).toHaveLength(2);
      expect(backups[0].id).toBe(backup2); // Most recent first
      expect(backups[1].id).toBe(backup1);
    });

    it('should delete backup', async () => {
      const backupId = await fileSystemService.backup(['/test/existing-file.txt']);

      await fileSystemService.deleteBackup(backupId);

      const backups = await fileSystemService.listBackups();
      expect(backups).toHaveLength(0);
    });

    it('should work in dry-run mode for backup operations', async () => {
      fileSystemService.setDryRun(true);

      const backupId = await fileSystemService.backup(['/test/existing-file.txt']);
      expect(mockConsole.logs.some(log => log.includes('[DRY RUN] Would create backup'))).toBe(true);

      await fileSystemService.restore(backupId);
      expect(mockConsole.logs.some(log => log.includes('[DRY RUN] Would restore from backup'))).toBe(true);

      await fileSystemService.deleteBackup(backupId);
      expect(mockConsole.logs.some(log => log.includes('[DRY RUN] Would delete backup'))).toBe(true);
    });

    it('should handle missing backup for restore', async () => {
      await expect(
        fileSystemService.restore('non-existent-backup-id')
      ).rejects.toThrow('Backup does not exist');
    });

    it('should handle missing backup for delete', async () => {
      await expect(
        fileSystemService.deleteBackup('non-existent-backup-id')
      ).rejects.toThrow('Backup does not exist');
    });

    it('should handle corrupted backup metadata', async () => {
      // Create a backup first
      const backupId = await fileSystemService.backup(['/test/existing-file.txt']);

      // Corrupt the backup metadata
      const backupDir = path.resolve(process.cwd(), '.scaffold-temp', 'backups');
      const infoPath = path.join(backupDir, backupId, 'info.json');
      await fileSystemService.writeFile(infoPath, 'invalid json', { overwrite: true });

      await expect(
        fileSystemService.restore(backupId)
      ).rejects.toThrow('Failed to restore from backup');
    });

    it('should handle backup failure and cleanup', async () => {
      // Mock copyPath to fail
      jest.spyOn(fileSystemService, 'copyPath').mockRejectedValueOnce(new Error('Copy failed'));

      await expect(
        fileSystemService.backup(['/test/existing-file.txt'])
      ).rejects.toThrow('Failed to create backup');
    });

    it('should return empty array when no backups exist', async () => {
      const backups = await fileSystemService.listBackups();
      expect(backups).toEqual([]);
    });

    it('should skip non-existent paths in backup gracefully', async () => {
      const backupId = await fileSystemService.backup(['/test/existing-file.txt', '/test/non-existent.txt']);

      // Should succeed and only backup existing files
      const backups = await fileSystemService.listBackups();
      expect(backups).toHaveLength(1);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle very long file paths', async () => {
      const longPath = '/test/' + 'a'.repeat(200) + '.txt';
      await fileSystemService.createFile(longPath, 'long path content');
      expect(await fileSystemService.readFile(longPath)).toBe('long path content');
    });

    it('should handle files with no extension', async () => {
      await fileSystemService.createFile('/test/no-extension', 'content');
      expect(await fileSystemService.readFile('/test/no-extension')).toBe('content');
    });

    it('should handle empty file content', async () => {
      await fileSystemService.createFile('/test/empty-file.txt', '');
      expect(await fileSystemService.readFile('/test/empty-file.txt')).toBe('');
    });

    it('should handle binary-like content', async () => {
      const binaryContent = '\x00\x01\x02\x03\xFF';
      await fileSystemService.createFile('/test/binary-file', binaryContent);
      expect(await fileSystemService.readFile('/test/binary-file')).toBe(binaryContent);
    });

    it('should handle concurrent operations safely', async () => {
      // Create multiple files concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        fileSystemService.createFile(`/test/concurrent-${i}.txt`, `content ${i}`)
      );

      await Promise.all(promises);

      // Verify all files were created
      for (let i = 0; i < 10; i++) {
        expect(await fileSystemService.exists(`/test/concurrent-${i}.txt`)).toBe(true);
        expect(await fileSystemService.readFile(`/test/concurrent-${i}.txt`)).toBe(`content ${i}`);
      }
    });

    it('should provide helpful error messages with context', async () => {
      try {
        await fileSystemService.readFile('/test/non-existent.txt');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Failed to read file');
        expect(error.operation).toBe('readFile');
        expect(error.path).toContain('/test/non-existent.txt');
      }
    });
  });

  describe('atomic operations', () => {
    it('should handle writeFileAtomic success', async () => {
      await fileSystemService.createFile('/test/atomic-success.txt', 'atomic content', { atomic: true });
      expect(await fileSystemService.readFile('/test/atomic-success.txt')).toBe('atomic content');
    });

    it('should support atomic writes for JSON files', async () => {
      const data = { test: 'atomic JSON' };
      await fileSystemService.writeJson('/test/atomic-json.json', data, { atomic: true });
      expect(await fileSystemService.readJson('/test/atomic-json.json')).toEqual(data);
    });

    it('should support atomic file writes', async () => {
      await fileSystemService.writeFile('/test/atomic-write.txt', 'atomic content', { atomic: true });
      expect(await fileSystemService.readFile('/test/atomic-write.txt')).toBe('atomic content');
    });
  });
});