/**
 * Unit tests for CompletionService
 * Tests shell detection, script generation, installation/uninstallation logic, and status checking
 */

import * as path from 'path';
import { FakeFileSystemService } from '@tests/fakes/file-system.fake';

// Mock fs-extra module with fake service
const fakeFileSystemService = new FakeFileSystemService();

jest.mock('fs-extra', () => ({
  pathExists: jest.fn().mockImplementation((path: string) => fakeFileSystemService.exists(path)),
  ensureDir: jest.fn().mockImplementation((path: string) => fakeFileSystemService.ensureDirectory(path)),
  writeFile: jest.fn().mockImplementation((path: string, content: string) => fakeFileSystemService.writeFile(path, content)),
  chmod: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockImplementation((path: string) => fakeFileSystemService.readFile(path)),
  appendFile: jest.fn().mockImplementation(async (path: string, content: string) => {
    const exists = await fakeFileSystemService.exists(path);
    if (exists) {
      const existing = await fakeFileSystemService.readFile(path);
      return fakeFileSystemService.writeFile(path, existing + content);
    } else {
      return fakeFileSystemService.writeFile(path, content);
    }
  }),
  remove: jest.fn().mockImplementation((path: string) => fakeFileSystemService.remove(path)),
  readJson: jest.fn().mockImplementation((path: string) => fakeFileSystemService.readJson(path)),
  writeJson: jest.fn().mockImplementation((path: string, data: any) => fakeFileSystemService.writeJson(path, data)),
}));

// Mock os.homedir
jest.mock('os', () => ({
  homedir: jest.fn().mockReturnValue('/mock/home'),
}));

import { CompletionService } from '@/services/completion-service';
import {
  ShellType,
  CompletionConfig,
  CompletionContext,
} from '@/models';

describe('CompletionService', () => {
  let service: CompletionService;
  let fakeFileSystem: FakeFileSystemService;
  let originalEnv: NodeJS.ProcessEnv;
  let originalExec: any;
  let mockExecCallback: (error: Error | null, stdout: string, stderr: string) => void;

  beforeEach(() => {
    // Reset the fake file system
    fakeFileSystemService.reset();
    fakeFileSystem = fakeFileSystemService; // Make it accessible in test scope

    service = new CompletionService();
    originalEnv = { ...process.env };

    // Mock child_process.exec
    originalExec = require('child_process').exec;
    require('child_process').exec = (command: string, callback: any) => {
      mockExecCallback = callback;
      return {} as any;
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    if (originalExec) {
      require('child_process').exec = originalExec;
    }
    fakeFileSystemService.reset();
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

      // Setup the fake exec to return zsh
      setTimeout(() => {
        if (mockExecCallback) {
          mockExecCallback(null, 'zsh', '');
        }
      }, 0);

      const result = await service.detectShell();

      expect(result).toBe(ShellType.ZSH);

      delete (process as any).ppid;
    });

    it('should default to bash when detection fails', async () => {
      process.env.SHELL = '';
      Object.defineProperty(process, 'ppid', {
        value: 1234,
        configurable: true,
      });

      // Setup the fake exec to return an error
      setTimeout(() => {
        if (mockExecCallback) {
          mockExecCallback(new Error('Command failed'), '', '');
        }
      }, 0);

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
      // Setup fake package.json for version reading at the path the service expects
      // The service looks for package.json at path.join(__dirname, '..', '..', 'package.json')
      // which resolves to src/../package.json from the service's perspective
      const serviceDir = path.join(__dirname, '..', '..', '..', 'src', 'services');
      const packageJsonPath = path.join(serviceDir, '..', '..', 'package.json');
      fakeFileSystemService.setFile(packageJsonPath, JSON.stringify({ version: '1.2.3' }));

      // Setup default completion config files as not existing
      const bashConfigPath = path.join('/mock/home', '.scaffold', 'completion-bash.json');
      const zshConfigPath = path.join('/mock/home', '.scaffold', 'completion-zsh.json');
      const fishConfigPath = path.join('/mock/home', '.scaffold', 'completion-fish.json');

      // These files don't exist initially, so no need to set them
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

      // Verify that the script file was created
      const scriptExists = await fakeFileSystemService.exists(expectedInstallPath);
      expect(scriptExists).toBe(true);

      // Verify that the config file was created
      const configPath = path.join('/mock/home', '.scaffold', 'completion-bash.json');
      const configExists = await fakeFileSystemService.exists(configPath);
      expect(configExists).toBe(true);

      // Verify the script content contains completion logic
      const scriptContent = await fakeFileSystemService.readFile(expectedInstallPath);
      expect(scriptContent).toContain('_scaffold_completion');
    });

    it('should install completion for specific shell type', async () => {
      const result = await service.installCompletion(ShellType.ZSH);

      expect(result.shellType).toBe(ShellType.ZSH);
      expect(result.installPath).toContain('completions/_scaffold');
    });

    it('should throw error when already installed without force', async () => {
      // Setup existing completion config
      const configPath = path.join('/mock/home', '.scaffold', 'completion-bash.json');
      const existingConfig = {
        shellType: ShellType.BASH,
        installedVersion: '1.0.0',
        installPath: '/some/path',
        installDate: new Date(),
        isEnabled: true,
        isInstalled: true,
      };
      fakeFileSystem.setFile(configPath, JSON.stringify(existingConfig));
      fakeFileSystem.setFile('/some/path', '# existing completion script');

      await expect(
        service.installCompletion(ShellType.BASH, false)
      ).rejects.toThrow(
        'Completion already installed for bash. Use --force to reinstall.'
      );
    });

    it('should reinstall when force flag is true', async () => {
      // Setup existing completion config
      const configPath = path.join('/mock/home', '.scaffold', 'completion-bash.json');
      const existingConfig = {
        shellType: ShellType.BASH,
        installedVersion: '1.0.0',
        installPath: '/some/path',
        installDate: new Date(),
        isEnabled: true,
        isInstalled: true,
      };
      fakeFileSystem.setFile(configPath, JSON.stringify(existingConfig));
      fakeFileSystem.setFile('/some/path', '# existing completion script');

      const result = await service.installCompletion(ShellType.BASH, true);

      expect(result.isInstalled).toBe(true);

      // Verify the script was updated
      const expectedInstallPath = path.join('/mock/home', '.scaffold', 'completion-bash.sh');
      const scriptExists = await fakeFileSystem.exists(expectedInstallPath);
      expect(scriptExists).toBe(true);
    });

    it('should handle fish shell installation without chmod', async () => {
      const result = await service.installCompletion(ShellType.FISH);

      expect(result.shellType).toBe(ShellType.FISH);
      expect(result.installPath).toContain('.config/fish/completions');

      // Verify fish completion file was created
      const scriptExists = await fakeFileSystem.exists(result.installPath!);
      expect(scriptExists).toBe(true);
    });

    it('should handle installation errors gracefully', async () => {
      // Use the FakeFileSystemService error mechanism
      fakeFileSystem.setError('Write failed');

      await expect(service.installCompletion(ShellType.BASH)).rejects.toThrow(
        'Write failed'
      );
    });

    it('should handle missing HOME directory', async () => {
      // Mock os.homedir to return empty string
      const os = require('os');
      const originalHomedir = os.homedir;
      os.homedir = jest.fn().mockReturnValue('');

      const result = await service.installCompletion(ShellType.BASH);

      expect(result.installPath).toBe('.scaffold/completion-bash.sh');
      expect(result.isInstalled).toBe(true);

      // Restore original
      os.homedir = originalHomedir;
    });
  });

  describe('uninstallCompletion', () => {
    it('should uninstall completion successfully', async () => {
      const installPath = path.join('/mock/home', '.scaffold', 'completion-bash.sh');
      const configPath = path.join('/mock/home', '.scaffold', 'completion-bash.json');

      const config: CompletionConfig = {
        shellType: ShellType.BASH,
        installedVersion: '1.0.0',
        installPath,
        installDate: new Date(),
        isEnabled: true,
        isInstalled: true,
      };

      fakeFileSystem.setFile(configPath, JSON.stringify(config));
      fakeFileSystem.setFile(installPath, '# completion script');

      // Verify files exist before uninstall
      expect(await fakeFileSystem.exists(installPath)).toBe(true);
      expect(await fakeFileSystem.exists(configPath)).toBe(true);

      await service.uninstallCompletion(ShellType.BASH);

      // Verify the script file was removed
      const scriptExists = await fakeFileSystem.exists(installPath);
      expect(scriptExists).toBe(false);

      // Verify the config file was also removed
      const configExists = await fakeFileSystem.exists(configPath);
      expect(configExists).toBe(false);
    });

    it('should handle uninstalling when not installed', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const configPath = path.join('/mock/home', '.scaffold', 'completion-bash.json');

      const config: CompletionConfig = {
        shellType: ShellType.BASH,
        installedVersion: null,
        installPath: null,
        installDate: null,
        isEnabled: false,
        isInstalled: false,
      };

      fakeFileSystem.setFile(configPath, JSON.stringify(config));

      await service.uninstallCompletion(ShellType.BASH);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Completion not installed for bash'
      );

      consoleSpy.mockRestore();
    });

    it('should handle uninstallation errors', async () => {
      const installPath = '/some/path';
      const configPath = path.join('/mock/home', '.scaffold', 'completion-bash.json');

      const config: CompletionConfig = {
        shellType: ShellType.BASH,
        installedVersion: '1.0.0',
        installPath,
        installDate: new Date(),
        isEnabled: true,
        isInstalled: true,
      };

      fakeFileSystem.setFile(configPath, JSON.stringify(config));
      fakeFileSystem.setFile(installPath, '# completion script');

      // Set error on the fake filesystem service
      fakeFileSystem.setError('Remove failed');

      await expect(service.uninstallCompletion(ShellType.BASH)).rejects.toThrow(
        'Remove failed'
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

      const config: CompletionConfig = {
        shellType: ShellType.BASH,
        installedVersion: '1.0.0',
        installPath,
        installDate: new Date(),
        isEnabled: true,
        isInstalled: false, // This should be overridden to true
      };

      fakeFileSystem.setFile(configPath, JSON.stringify(config));
      fakeFileSystem.setFile(installPath, '# completion script');

      const result = await service.getCompletionStatus(ShellType.BASH);

      expect(result.isInstalled).toBe(true);
      expect(result.shellType).toBe(ShellType.BASH);
      expect(result.installPath).toBe(installPath);
    });

    it('should return not installed status when config file does not exist', async () => {
      // Don't set any files - config file doesn't exist

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

      const config: CompletionConfig = {
        shellType: ShellType.BASH,
        installedVersion: '1.0.0',
        installPath,
        installDate: new Date(),
        isEnabled: true,
        isInstalled: true,
      };

      // Set config file but not the install path
      fakeFileSystem.setFile(configPath, JSON.stringify(config));
      // Don't set the install path file

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
      // Create an invalid context that might cause parsing errors
      const invalidContext: CompletionContext = {
        ...context,
        commandLine: [], // Empty command line might cause parsing issues
      };

      const result = await service.generateCompletions(invalidContext);

      // The service should handle errors gracefully
      expect(result.completions).toBeDefined();
      expect(Array.isArray(result.completions)).toBe(true);
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
      // The service looks for package.json relative to its __dirname
      const serviceDir = path.join(__dirname, '..', '..', '..', 'src', 'services');
      const packagePath = path.join(serviceDir, '..', '..', 'package.json');
      fakeFileSystem.setFile(packagePath, JSON.stringify({ version: '2.1.0' }));

      const version = await (service as any).getScaffoldVersion();

      expect(version).toBe('2.1.0');
    });

    it('should use default version when package.json has no version', async () => {
      const serviceDir = path.join(__dirname, '..', '..', '..', 'src', 'services');
      const packagePath = path.join(serviceDir, '..', '..', 'package.json');
      fakeFileSystem.setFile(packagePath, JSON.stringify({}));

      const version = await (service as any).getScaffoldVersion();

      expect(version).toBe('1.0.0');
    });

    it('should handle package.json read errors', async () => {
      // Don't set package.json file - it doesn't exist

      const version = await (service as any).getScaffoldVersion();

      expect(version).toBe('1.0.0');
    });

    it('should ensure directories exist', async () => {
      await (service as any).ensureDirectoriesExist();

      // Verify directories were created
      const configDirExists = await fakeFileSystem.exists(path.join('/mock/home', '.scaffold'));
      const cacheDirExists = await fakeFileSystem.exists(path.join('/mock/home', '.scaffold', 'completion-cache'));

      expect(configDirExists).toBe(true);
      expect(cacheDirExists).toBe(true);
    });

    it('should handle shell configuration management', async () => {
      const bashrcPath = path.join('/mock/home', '.bashrc');
      fakeFileSystem.setFile(bashrcPath, 'existing content\n');

      const installPath = '/test/completion.sh';

      await (service as any).addToShellConfig(ShellType.BASH, installPath);

      // Verify the bashrc was updated with the source command
      const bashrcContent = await fakeFileSystem.readFile(bashrcPath);
      expect(bashrcContent).toContain('source "/test/completion.sh"');
    });

    it('should handle fish shell configuration correctly', async () => {
      await (service as any).addToShellConfig(ShellType.FISH, '/test/path');

      // Fish doesn't use shell config files, so no files should be modified
      // This test just ensures no errors are thrown
      expect(true).toBe(true); // Fish config doesn't modify files
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

      // Verify the fish completions directory was created
      const fishCompletionsDir = path.join('/mock/home', '.config', 'fish', 'completions');
      const dirExists = await fakeFileSystem.exists(fishCompletionsDir);
      expect(dirExists).toBe(true);
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

      // Setup the fake exec to return bash
      setTimeout(() => {
        if (mockExecCallback) {
          mockExecCallback(null, '/bin/bash', '');
        }
      }, 0);

      const result = await service.detectShell();

      expect(result).toBe(ShellType.BASH);

      delete (process as any).ppid;
    });

    it('should handle installation with different error conditions', async () => {
      // Use the FakeFileSystemService error mechanism
      fakeFileSystem.setError('Permission denied');

      // Since ensureDirectoriesExist is called outside the try-catch in installCompletion,
      // the error will be thrown directly without the wrapper message
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

      // Verify the config file was created
      const configPath = path.join('/mock/home', '.scaffold', 'completion-zsh.json');
      const configExists = await fakeFileSystem.exists(configPath);
      expect(configExists).toBe(true);

      // Verify the config content
      const savedConfig = await fakeFileSystem.readJson(configPath);
      expect(savedConfig.shellType).toBe(ShellType.ZSH);
      expect(savedConfig.installedVersion).toBe('1.0.0');
    });

    it('should handle removal of config files', async () => {
      const configPath = path.join('/mock/home', '.scaffold', 'completion-fish.json');
      fakeFileSystem.setFile(configPath, JSON.stringify({}));

      await (service as any).removeCompletionConfig(ShellType.FISH);

      // Verify the config file was removed
      const configExists = await fakeFileSystem.exists(configPath);
      expect(configExists).toBe(false);
    });

    it('should handle shell configuration file operations', async () => {
      const installPath = '/test/completion.sh';
      const configContent = `line1\n# Scaffold CLI completion\nsource "${installPath}"\nline2\n`;
      const bashrcPath = path.join('/mock/home', '.bashrc');

      fakeFileSystem.setFile(bashrcPath, configContent);

      await (service as any).removeFromShellConfig(ShellType.BASH, installPath);

      // Verify the shell config was updated
      const updatedContent = await fakeFileSystem.readFile(bashrcPath);
      expect(updatedContent).toBe('line1\nline2\n');
      expect(updatedContent).not.toContain('Scaffold CLI completion');
      expect(updatedContent).not.toContain(installPath);
    });

    it('should handle missing shell config files', async () => {
      // Don't create a shell config file - it doesn't exist

      await (service as any).removeFromShellConfig(
        ShellType.BASH,
        '/test/path'
      );

      // Should not throw an error and should handle gracefully
      expect(true).toBe(true); // No errors thrown
    });
  });
});
