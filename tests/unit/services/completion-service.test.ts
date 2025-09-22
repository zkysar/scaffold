/**
 * Unit tests for CompletionService
 * Tests shell detection, script generation, installation/uninstallation logic, and status checking
 */

import * as path from 'path';
import { CompletionService } from '../../../src/services/completion-service';
import {
  ShellType,
  CompletionConfig,
  CompletionContext,
} from '../../../src/models';

// Mock fs-extra
jest.mock('fs-extra');
// Mock child_process
jest.mock('child_process');
// Mock os.homedir
jest.mock('os');

import * as fs from 'fs-extra';
import { exec } from 'child_process';
import * as os from 'os';

const mockFs = fs as any;
const mockExec = exec as any;
const mockOs = os as any;

describe('CompletionService', () => {
  let service: CompletionService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock os.homedir BEFORE creating service
    mockOs.homedir.mockReturnValue('/mock/home');

    service = new CompletionService();
    originalEnv = { ...process.env };

    // Setup default mock behaviors
    mockFs.pathExists.mockResolvedValue(false);
    mockFs.ensureDir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.chmod.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('');
    mockFs.appendFile.mockResolvedValue(undefined);
    mockFs.remove.mockResolvedValue(undefined);
    mockFs.readJson.mockResolvedValue({});
    mockFs.writeJson.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('detectShell', () => {
    it('should detect zsh from SHELL environment variable', async () => {
      process.env.SHELL = '/usr/local/bin/zsh';

      const result = await service.detectShell();

      expect(result).toBe(ShellType.ZSH);
    });

    it('should detect bash from SHELL environment variable', async () => {
      process.env.SHELL = '/bin/bash';

      const result = await service.detectShell();

      expect(result).toBe(ShellType.BASH);
    });

    it('should detect fish from SHELL environment variable', async () => {
      process.env.SHELL = '/usr/local/bin/fish';

      const result = await service.detectShell();

      expect(result).toBe(ShellType.FISH);
    });

    it('should fallback to parent process detection when SHELL is empty', async () => {
      process.env.SHELL = '';
      // Mock process.ppid property
      Object.defineProperty(process, 'ppid', {
        value: 1234,
        configurable: true,
      });

      mockExec.mockImplementation((command: any, callback: any) => {
        if (typeof callback === 'function') {
          callback(null, 'zsh', '');
        }
        return {} as any;
      });

      const result = await service.detectShell();

      expect(result).toBe(ShellType.ZSH);
      expect(mockExec).toHaveBeenCalledWith(
        'ps -p 1234 -o comm=',
        expect.any(Function)
      );

      delete (process as any).ppid;
    });

    it('should default to bash when detection fails', async () => {
      process.env.SHELL = '';
      Object.defineProperty(process, 'ppid', {
        value: 1234,
        configurable: true,
      });

      mockExec.mockImplementation((command: any, callback: any) => {
        if (typeof callback === 'function') {
          callback(new Error('Command failed'), '', '');
        }
        return {} as any;
      });

      const result = await service.detectShell();

      expect(result).toBe(ShellType.BASH);

      delete (process as any).ppid;
    });

    it('should default to bash when no parent process ID', async () => {
      process.env.SHELL = '';
      Object.defineProperty(process, 'ppid', {
        value: undefined,
        configurable: true,
      });

      const result = await service.detectShell();

      expect(result).toBe(ShellType.BASH);

      delete (process as any).ppid;
    });
  });

  describe('generateCompletionScript', () => {
    it('should generate bash completion script', async () => {
      const result = await service.generateCompletionScript(ShellType.BASH);

      expect(result.shellType).toBe(ShellType.BASH);
      expect(result.content).toContain('_scaffold_completion');
      expect(result.content).toContain(
        'complete -F _scaffold_completion scaffold'
      );
      expect(result.filename).toBe('scaffold-completion.bash');
      expect(result.installPath).toContain('.scaffold/completion-bash.sh');
    });

    it('should generate zsh completion script', async () => {
      const result = await service.generateCompletionScript(ShellType.ZSH);

      expect(result.shellType).toBe(ShellType.ZSH);
      expect(result.content).toContain('#compdef scaffold');
      expect(result.content).toContain('_scaffold');
      expect(result.filename).toBe('_scaffold');
      expect(result.installPath).toContain('.scaffold/completions/_scaffold');
    });

    it('should generate fish completion script', async () => {
      const result = await service.generateCompletionScript(ShellType.FISH);

      expect(result.shellType).toBe(ShellType.FISH);
      expect(result.content).toContain('function __scaffold_complete');
      expect(result.content).toContain('complete -c scaffold');
      expect(result.filename).toBe('scaffold.fish');
      expect(result.installPath).toContain(
        '.config/fish/completions/scaffold.fish'
      );
    });

    it('should throw error for unsupported shell type', async () => {
      await expect(
        service.generateCompletionScript('unsupported' as ShellType)
      ).rejects.toThrow('Unsupported shell type: unsupported');
    });
  });

  describe('installCompletion', () => {
    beforeEach(() => {
      // Mock successful version reading
      mockFs.pathExists.mockImplementation((filePath: any) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('package.json')) {
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      });

      mockFs.readJson.mockImplementation((filePath: any) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('package.json')) {
          return Promise.resolve({ version: '1.2.3' });
        }
        if (pathStr.includes('completion-')) {
          return Promise.resolve({
            shellType: ShellType.BASH,
            installedVersion: null,
            installPath: null,
            installDate: null,
            isEnabled: false,
            isInstalled: false,
          });
        }
        return Promise.resolve({});
      });
    });

    it('should install completion successfully for bash', async () => {
      const expectedInstallPath = path.join(
        '/mock/home',
        '.scaffold',
        'completion-bash.sh'
      );

      process.env.SHELL = '/bin/bash';

      const result = await service.installCompletion();

      expect(result.shellType).toBe(ShellType.BASH);
      expect(result.installPath).toBe(expectedInstallPath);
      expect(result.isInstalled).toBe(true);
      expect(result.isEnabled).toBe(true);
      expect(result.installedVersion).toBe('1.2.3');

      expect(mockFs.ensureDir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(mockFs.chmod).toHaveBeenCalledWith(expectedInstallPath, 0o755);
      expect(mockFs.writeJson).toHaveBeenCalled();
    });

    it('should install completion for specific shell type', async () => {
      const result = await service.installCompletion(ShellType.ZSH);

      expect(result.shellType).toBe(ShellType.ZSH);
      expect(result.installPath).toContain('completions/_scaffold');
    });

    it('should throw error when already installed without force', async () => {
      mockFs.readJson.mockImplementation((filePath: any) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('completion-')) {
          return Promise.resolve({
            shellType: ShellType.BASH,
            installedVersion: '1.0.0',
            installPath: '/some/path',
            installDate: new Date(),
            isEnabled: true,
            isInstalled: true,
          });
        }
        return Promise.resolve({ version: '1.2.3' });
      });

      mockFs.pathExists.mockImplementation((filePath: any) => {
        return Promise.resolve(true);
      });

      await expect(
        service.installCompletion(ShellType.BASH, false)
      ).rejects.toThrow(
        'Completion already installed for bash. Use --force to reinstall.'
      );
    });

    it('should reinstall when force flag is true', async () => {
      mockFs.readJson.mockImplementation((filePath: any) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('completion-')) {
          return Promise.resolve({
            shellType: ShellType.BASH,
            installedVersion: '1.0.0',
            installPath: '/some/path',
            installDate: new Date(),
            isEnabled: true,
            isInstalled: true,
          });
        }
        return Promise.resolve({ version: '1.2.3' });
      });

      mockFs.pathExists.mockImplementation((filePath: any) => {
        return Promise.resolve(true);
      });

      const result = await service.installCompletion(ShellType.BASH, true);

      expect(result.isInstalled).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle fish shell installation without chmod', async () => {
      const result = await service.installCompletion(ShellType.FISH);

      expect(result.shellType).toBe(ShellType.FISH);
      expect(result.installPath).toContain('.config/fish/completions');
      expect(mockFs.chmod).not.toHaveBeenCalled();
    });

    it('should handle installation errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));

      await expect(service.installCompletion(ShellType.BASH)).rejects.toThrow(
        'Failed to install completion: Write failed'
      );
    });

    it('should handle missing HOME directory', async () => {
      mockOs.homedir.mockReturnValue('');

      const result = await service.installCompletion(ShellType.BASH);

      expect(result.installPath).toBe('.scaffold/completion-bash.sh');
      expect(result.isInstalled).toBe(true);
    });
  });

  describe('uninstallCompletion', () => {
    it('should uninstall completion successfully', async () => {
      const installPath = '/home/user/.scaffold/completion-bash.sh';

      mockFs.readJson.mockResolvedValue({
        shellType: ShellType.BASH,
        installedVersion: '1.0.0',
        installPath,
        installDate: new Date(),
        isEnabled: true,
        isInstalled: true,
      } as CompletionConfig);

      mockFs.pathExists.mockResolvedValue(true);

      await service.uninstallCompletion(ShellType.BASH);

      expect(mockFs.remove).toHaveBeenCalledWith(installPath);
    });

    it('should handle uninstalling when not installed', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockFs.readJson.mockResolvedValue({
        shellType: ShellType.BASH,
        installedVersion: null,
        installPath: null,
        installDate: null,
        isEnabled: false,
        isInstalled: false,
      } as CompletionConfig);

      await service.uninstallCompletion(ShellType.BASH);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Completion not installed for bash'
      );
      expect(mockFs.remove).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle uninstallation errors', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJson.mockResolvedValue({
        shellType: ShellType.BASH,
        installedVersion: '1.0.0',
        installPath: '/some/path',
        installDate: new Date(),
        isEnabled: true,
        isInstalled: true,
      } as CompletionConfig);

      mockFs.remove.mockRejectedValue(new Error('Remove failed'));

      await expect(service.uninstallCompletion(ShellType.BASH)).rejects.toThrow(
        'Failed to uninstall completion: Remove failed'
      );
    });
  });

  describe('getCompletionStatus', () => {
    it('should return installed status when config exists and file is present', async () => {
      const configPath = path.join(
        '/mock/home',
        '.scaffold',
        'completion-bash.json'
      );
      const installPath = '/mock/home/.scaffold/completion-bash.sh';

      mockFs.pathExists.mockImplementation((filePath: any) => {
        const pathStr = filePath.toString();
        return Promise.resolve(
          pathStr === configPath || pathStr === installPath
        );
      });

      mockFs.readJson.mockResolvedValue({
        shellType: ShellType.BASH,
        installedVersion: '1.0.0',
        installPath,
        installDate: new Date(),
        isEnabled: true,
        isInstalled: false, // This should be overridden to true
      } as CompletionConfig);

      const result = await service.getCompletionStatus(ShellType.BASH);

      expect(result.isInstalled).toBe(true);
      expect(result.shellType).toBe(ShellType.BASH);
      expect(result.installPath).toBe(installPath);
    });

    it('should return not installed status when config file does not exist', async () => {
      mockFs.pathExists.mockResolvedValue(false);

      const result = await service.getCompletionStatus(ShellType.BASH);

      expect(result.isInstalled).toBe(false);
      expect(result.shellType).toBe(ShellType.BASH);
      expect(result.installedVersion).toBeNull();
      expect(result.installPath).toBeNull();
    });

    it('should return not installed when install path does not exist', async () => {
      const configPath = path.join(
        '/mock/home',
        '.scaffold',
        'completion-bash.json'
      );
      const installPath = '/nonexistent/path';

      mockFs.pathExists.mockImplementation((filePath: any) => {
        const pathStr = filePath.toString();
        return Promise.resolve(pathStr === configPath);
      });

      mockFs.readJson.mockResolvedValue({
        shellType: ShellType.BASH,
        installedVersion: '1.0.0',
        installPath,
        installDate: new Date(),
        isEnabled: true,
        isInstalled: true,
      } as CompletionConfig);

      const result = await service.getCompletionStatus(ShellType.BASH);

      expect(result.isInstalled).toBe(false);
    });

    it('should detect shell when not specified', async () => {
      process.env.SHELL = '/usr/local/bin/zsh';

      const result = await service.getCompletionStatus();

      expect(result.shellType).toBe(ShellType.ZSH);
    });
  });

  describe('generateCompletions', () => {
    let context: CompletionContext;

    beforeEach(() => {
      context = {
        currentWord: '',
        previousWord: null,
        commandLine: ['scaffold'],
        cursorPosition: 8,
        environmentVars: new Map(),
        currentDirectory: '/test/dir',
      };
    });

    it('should generate command completions for empty input', async () => {
      const result = await service.generateCompletions(context);

      expect(result.completions.length).toBeGreaterThan(7);
      expect(result.completions.map(c => c.value)).toContain('new');
      expect(result.completions.map(c => c.value)).toContain('template');
      expect(result.completions.map(c => c.value)).toContain('completion');
      expect(result.errors).toHaveLength(0);
    });

    it('should generate option completions for flags', async () => {
      context.currentWord = '--';
      context.commandLine = ['scaffold', 'new'];

      const result = await service.generateCompletions(context);

      expect(result.completions.some(c => c.value === '--help')).toBe(true);
      expect(result.completions.some(c => c.value === '--template')).toBe(true);
    });

    it('should generate subcommand completions', async () => {
      context.commandLine = ['scaffold', 'template'];
      context.currentWord = '';

      const result = await service.generateCompletions(context);

      expect(result.completions.map(c => c.value)).toContain('list');
      expect(result.completions.map(c => c.value)).toContain('create');
      expect(result.completions.map(c => c.value)).toContain('delete');
    });

    it('should generate option value completions for shell flag', async () => {
      context.previousWord = '--shell';
      context.currentWord = '';

      const result = await service.generateCompletions(context);

      expect(result.completions.map(c => c.value)).toContain('bash');
      expect(result.completions.map(c => c.value)).toContain('zsh');
      expect(result.completions.map(c => c.value)).toContain('fish');
    });

    it('should filter completions by current word', async () => {
      context.currentWord = 'te';

      const result = await service.generateCompletions(context);

      expect(result.completions.map(c => c.value)).toContain('template');
      expect(result.completions.map(c => c.value)).not.toContain('new');
    });

    it('should handle completion errors gracefully', async () => {
      // Mock an error scenario
      jest.spyOn(service as any, 'parseCommandLine').mockImplementation(() => {
        throw new Error('Parsing failed');
      });

      const result = await service.generateCompletions(context);

      expect(result.completions).toHaveLength(0);
      expect(result.errors).toContain('Parsing failed');
    });
  });

  describe('getCompletionScript', () => {
    it('should return generated completion script', async () => {
      const result = await service.getCompletionScript(ShellType.BASH);

      expect(result.shellType).toBe(ShellType.BASH);
      expect(result.content).toContain('_scaffold_completion');
    });
  });

  describe('comprehensive edge cases', () => {
    it('should handle script generation for all shell types correctly', async () => {
      const bashScript = await service.generateCompletionScript(ShellType.BASH);
      const zshScript = await service.generateCompletionScript(ShellType.ZSH);
      const fishScript = await service.generateCompletionScript(ShellType.FISH);

      expect(bashScript.content).toContain('_scaffold_completion()');
      expect(bashScript.content).toContain('_init_completion');
      expect(bashScript.content).toContain('scaffold completion complete');

      expect(zshScript.content).toContain('#compdef scaffold');
      expect(zshScript.content).toContain('_scaffold()');
      expect(zshScript.content).toContain('scaffold completion complete');

      expect(fishScript.content).toContain('function __scaffold_complete');
      expect(fishScript.content).toContain('scaffold completion complete');
    });

    it('should handle version reading from package.json', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJson.mockResolvedValue({ version: '2.1.0' });

      const version = await (service as any).getScaffoldVersion();

      expect(version).toBe('2.1.0');
    });

    it('should use default version when package.json has no version', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJson.mockResolvedValue({});

      const version = await (service as any).getScaffoldVersion();

      expect(version).toBe('1.0.0');
    });

    it('should handle package.json read errors', async () => {
      mockFs.pathExists.mockResolvedValue(false);

      const version = await (service as any).getScaffoldVersion();

      expect(version).toBe('1.0.0');
    });

    it('should ensure directories exist', async () => {
      await (service as any).ensureDirectoriesExist();

      expect(mockFs.ensureDir).toHaveBeenCalledWith(
        path.join('/mock/home', '.scaffold')
      );
      expect(mockFs.ensureDir).toHaveBeenCalledWith(
        path.join('/mock/home', '.scaffold', 'completion-cache')
      );
    });

    it('should handle shell configuration management', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue('existing content\n');

      const installPath = '/test/completion.sh';

      await (service as any).addToShellConfig(ShellType.BASH, installPath);

      expect(mockFs.appendFile).toHaveBeenCalledWith(
        path.join('/mock/home', '.bashrc'),
        expect.stringContaining('source "/test/completion.sh"')
      );
    });

    it('should handle fish shell configuration correctly', async () => {
      await (service as any).addToShellConfig(ShellType.FISH, '/test/path');

      expect(mockFs.appendFile).not.toHaveBeenCalled();
    });

    it('should handle install path generation for fish shell', async () => {
      const installPath = await (service as any).getInstallPath(ShellType.FISH);

      expect(installPath).toBe(
        path.join(
          '/mock/home',
          '.config',
          'fish',
          'completions',
          'scaffold.fish'
        )
      );
      expect(mockFs.ensureDir).toHaveBeenCalledWith(
        path.join('/mock/home', '.config', 'fish', 'completions')
      );
    });

    it('should parse command line correctly', () => {
      const context: CompletionContext = {
        currentWord: 'test',
        previousWord: '--flag',
        commandLine: ['scaffold', 'new', '--flag', 'test'],
        cursorPosition: 20,
        environmentVars: new Map(),
        currentDirectory: '/test',
      };

      const result = (service as any).parseCommandLine(context);

      expect(result.command).toBe('new');
      expect(result.subcommand).toBe(null);
      expect(result.isFlag).toBe(false);
      expect(result.isOptionValue).toBe(false);
    });

    it('should filter and sort suggestions correctly', () => {
      const suggestions = ['template', 'new', 'test', 'check'];
      const currentWord = 'te';

      const result = (service as any).filterAndSortSuggestions(
        suggestions,
        currentWord
      );

      expect(result).toEqual(['template', 'test']);
    });

    it('should handle various shell detection scenarios', async () => {
      // Ensure exec is mocked to prevent hanging if fallback is triggered
      mockExec.mockImplementation((command: any, callback: any) => {
        if (typeof callback === 'function') {
          callback(null, 'bash', '');
        }
        return {} as any;
      });

      // Test different shell paths
      process.env.SHELL = '/opt/homebrew/bin/zsh';
      expect(await service.detectShell()).toBe(ShellType.ZSH);

      process.env.SHELL = '/usr/bin/bash';
      expect(await service.detectShell()).toBe(ShellType.BASH);

      process.env.SHELL = '/usr/local/bin/fish';
      expect(await service.detectShell()).toBe(ShellType.FISH);

      process.env.SHELL = '/bin/sh';
      expect(await service.detectShell()).toBe(ShellType.BASH);
    });

    it('should handle completion generation for different subcommands', async () => {
      const context: CompletionContext = {
        currentWord: '',
        previousWord: null,
        commandLine: ['scaffold', 'completion'],
        cursorPosition: 20,
        environmentVars: new Map(),
        currentDirectory: '/test',
      };

      const result = await service.generateCompletions(context);

      const values = result.completions.map(c => c.value);
      expect(values).toContain('install');
      expect(values).toContain('uninstall');
      expect(values).toContain('status');
      expect(values).toContain('script');
    });

    it('should handle error scenarios in shell detection', async () => {
      process.env.SHELL = '';
      Object.defineProperty(process, 'ppid', {
        value: 5678,
        configurable: true,
      });

      mockExec.mockImplementation((command: any, callback: any) => {
        if (typeof callback === 'function') {
          callback(null, '/bin/bash', '');
        }
        return {} as any;
      });

      const result = await service.detectShell();

      expect(result).toBe(ShellType.BASH);
      expect(mockExec).toHaveBeenCalledWith(
        'ps -p 5678 -o comm=',
        expect.any(Function)
      );

      delete (process as any).ppid;
    });

    it('should handle installation with different error conditions', async () => {
      mockFs.ensureDir.mockRejectedValue(new Error('Permission denied'));

      await expect(service.installCompletion(ShellType.BASH)).rejects.toThrow(
        'Permission denied'
      );
    });

    it('should handle config file operations', async () => {
      const config: CompletionConfig = {
        shellType: ShellType.ZSH,
        installedVersion: '1.0.0',
        installPath: '/test/path',
        installDate: new Date(),
        isEnabled: true,
        isInstalled: true,
      };

      await (service as any).saveCompletionConfig(config);

      expect(mockFs.ensureDir).toHaveBeenCalled();
      expect(mockFs.writeJson).toHaveBeenCalledWith(
        path.join('/mock/home', '.scaffold', 'completion-zsh.json'),
        config,
        { spaces: 2 }
      );
    });

    it('should handle removal of config files', async () => {
      mockFs.pathExists.mockResolvedValue(true);

      await (service as any).removeCompletionConfig(ShellType.FISH);

      expect(mockFs.remove).toHaveBeenCalledWith(
        path.join('/mock/home', '.scaffold', 'completion-fish.json')
      );
    });

    it('should handle shell configuration file operations', async () => {
      const installPath = '/test/completion.sh';
      const configContent = `line1\n# Scaffold CLI completion\nsource "${installPath}"\nline2\n`;

      mockFs.readFile.mockResolvedValue(configContent);
      mockFs.pathExists.mockResolvedValue(true);

      await (service as any).removeFromShellConfig(ShellType.BASH, installPath);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join('/mock/home', '.bashrc'),
        'line1\nline2\n',
        'utf-8'
      );
    });

    it('should handle missing shell config files', async () => {
      mockFs.pathExists.mockResolvedValue(false);

      await (service as any).removeFromShellConfig(
        ShellType.BASH,
        '/test/path'
      );

      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });
  });
});
