/**
 * Contract tests for 'scaffold new' command
 * Tests MUST fail initially as no implementation exists yet (TDD)
 */

import { ScaffoldNewCommand } from '@/cli/commands/new';
import { createMockFileSystem, createMockConsole } from '@tests/helpers/cli-helpers';
import mockFs from 'mock-fs';

describe('scaffold new command contract', () => {
  let mockConsole: ReturnType<typeof createMockConsole>;

  beforeEach(() => {
    mockConsole = createMockConsole();
    // Replace global console with our mock
    Object.assign(console, mockConsole.mockConsole);
  });

  afterEach(() => {
    mockFs.restore();
    jest.restoreAllMocks();
  });

  describe('successful project creation', () => {
    it('should create project with default settings', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/test-project': {},
        '/home/.scaffold/templates': {
          'default.json': JSON.stringify({
            name: 'default',
            version: '1.0.0',
            folders: ['src', 'tests'],
            files: [
              { path: 'package.json', template: '{"name": "{{projectName}}"}' }
            ],
            variables: [
              { name: 'projectName', type: 'string', required: true }
            ],
            rules: { strict: true }
          })
        }
      });
      mockFs(mockFileSystem);

      // Act
      const command = new ScaffoldNewCommand();
      const result = await command.execute('test-project', {
        strict: true,
        'dry-run': false
      });

      // Assert
      expect(result.code).toBe(0);
      expect(result.message).toBe('Project created successfully at /test-project');
      expect(mockConsole.logs).toContain('Project created successfully at /test-project');
    });

    it('should create project with pre-selected templates', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/test-project': {},
        '/home/.scaffold/templates': {
          'react.json': JSON.stringify({
            name: 'react',
            version: '1.0.0',
            folders: ['src/components', 'public'],
            files: [
              { path: 'src/App.tsx', template: 'export default function App() {}' }
            ],
            variables: [],
            rules: { strict: true }
          }),
          'typescript.json': JSON.stringify({
            name: 'typescript',
            version: '1.0.0',
            folders: [],
            files: [
              { path: 'tsconfig.json', template: '{"compilerOptions": {}}' }
            ],
            variables: [],
            rules: { strict: true }
          })
        }
      });
      mockFs(mockFileSystem);

      // Act
      const command = new ScaffoldNewCommand();
      const result = await command.execute('test-project', {
        template: ['react', 'typescript'],
        strict: true,
        'dry-run': false
      });

      // Assert
      expect(result.code).toBe(0);
      expect(result.message).toBe('Project created successfully at /test-project');
    });

    it('should show what would be created in dry-run mode', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/test-project': {},
        '/home/.scaffold/templates': {
          'default.json': JSON.stringify({
            name: 'default',
            version: '1.0.0',
            folders: ['src'],
            files: [
              { path: 'README.md', template: '# {{projectName}}' }
            ],
            variables: [
              { name: 'projectName', type: 'string', required: true }
            ],
            rules: { strict: true }
          })
        }
      });
      mockFs(mockFileSystem);

      // Act
      const command = new ScaffoldNewCommand();
      const result = await command.execute('test-project', {
        strict: true,
        'dry-run': true
      });

      // Assert
      expect(result.code).toBe(0);
      expect(mockConsole.logs).toContain('DRY RUN: Would create project at /test-project');
      expect(mockConsole.logs).toContain('Would create folder: src');
      expect(mockConsole.logs).toContain('Would create file: README.md');
    });
  });

  describe('error scenarios', () => {
    it('should fail when project already exists (exit code 1)', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/existing-project': {
          'package.json': '{"name": "existing"}'
        }
      });
      mockFs(mockFileSystem);

      // Act
      const command = new ScaffoldNewCommand();
      const result = await command.execute('existing-project', {
        strict: true,
        'dry-run': false
      });

      // Assert
      expect(result.code).toBe(1);
      expect(result.message).toBe('Project already exists at /existing-project');
      expect(mockConsole.errors).toContain('Project already exists at /existing-project');
    });

    it('should fail when template not found (exit code 2)', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/test-project': {},
        '/home/.scaffold/templates': {}
      });
      mockFs(mockFileSystem);

      // Act
      const command = new ScaffoldNewCommand();
      const result = await command.execute('test-project', {
        template: ['nonexistent-template'],
        strict: true,
        'dry-run': false
      });

      // Assert
      expect(result.code).toBe(2);
      expect(result.message).toBe("Template 'nonexistent-template' not found");
      expect(mockConsole.errors).toContain("Template 'nonexistent-template' not found");
    });

    it('should fail when permission denied (exit code 3)', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/readonly-dir': mockFs.directory({
          mode: 0o444, // read-only
          items: {}
        })
      });
      mockFs(mockFileSystem);

      // Act
      const command = new ScaffoldNewCommand();
      const result = await command.execute('readonly-dir/test-project', {
        strict: true,
        'dry-run': false
      });

      // Assert
      expect(result.code).toBe(3);
      expect(result.message).toBe('Permission denied to create project at /readonly-dir/test-project');
      expect(mockConsole.errors).toContain('Permission denied to create project at /readonly-dir/test-project');
    });
  });

  describe('edge cases', () => {
    it('should handle relative project paths', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/current/dir': {},
        '/home/.scaffold/templates': {
          'default.json': JSON.stringify({
            name: 'default',
            version: '1.0.0',
            folders: [],
            files: [],
            variables: [],
            rules: { strict: true }
          })
        }
      });
      mockFs(mockFileSystem);

      // Mock process.cwd()
      jest.spyOn(process, 'cwd').mockReturnValue('/current/dir');

      // Act
      const command = new ScaffoldNewCommand();
      const result = await command.execute('./my-project', {
        strict: true,
        'dry-run': false
      });

      // Assert
      expect(result.code).toBe(0);
      expect(result.message).toBe('Project created successfully at /current/dir/my-project');
    });

    it('should handle empty project name', async () => {
      // Act
      const command = new ScaffoldNewCommand();
      const result = await command.execute('', {
        strict: true,
        'dry-run': false
      });

      // Assert
      expect(result.code).toBe(1);
      expect(result.message).toContain('Invalid project name');
    });

    it('should handle project name with invalid characters', async () => {
      // Act
      const command = new ScaffoldNewCommand();
      const result = await command.execute('project<>name', {
        strict: true,
        'dry-run': false
      });

      // Assert
      expect(result.code).toBe(1);
      expect(result.message).toContain('Invalid project name');
    });
  });

  describe('template variable handling', () => {
    it('should prompt for required template variables', async () => {
      // Arrange
      const mockFileSystem = createMockFileSystem({
        '/test-project': {},
        '/home/.scaffold/templates': {
          'custom.json': JSON.stringify({
            name: 'custom',
            version: '1.0.0',
            folders: [],
            files: [
              { path: 'config.json', template: '{"author": "{{authorName}}"}' }
            ],
            variables: [
              { name: 'authorName', type: 'string', required: true, prompt: 'Enter author name' }
            ],
            rules: { strict: true }
          })
        }
      });
      mockFs(mockFileSystem);

      // Mock inquirer prompt
      const mockPrompt = jest.fn().mockResolvedValue({ authorName: 'John Doe' });
      jest.doMock('inquirer', () => ({ prompt: mockPrompt }));

      // Act
      const command = new ScaffoldNewCommand();
      const result = await command.execute('test-project', {
        template: ['custom'],
        strict: true,
        'dry-run': false
      });

      // Assert
      expect(result.code).toBe(0);
      expect(mockPrompt).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'authorName',
          message: 'Enter author name',
          type: 'input'
        })
      ]);
    });
  });
});