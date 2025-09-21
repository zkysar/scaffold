/**
 * Unit tests for completion configuration models
 * Tests model creation, validation, and type conversions
 */

import {
  CompletionConfig,
  CompletionContext,
  CompletionProvider,
  CommandMetadata,
  SubcommandMetadata,
  OptionMetadata,
  ArgumentMetadata,
} from '@/models/completion-config';

describe('CompletionConfig Model', () => {
  describe('CompletionConfig interface', () => {
    it('should create valid completion config with all properties', () => {
      const config: CompletionConfig = {
        shellType: 'bash',
        installedVersion: '1.2.3',
        installPath: '/home/user/.scaffold/completion-bash.sh',
        installDate: new Date('2023-01-01'),
        isEnabled: true,
        isInstalled: true,
      };

      expect(config.shellType).toBe('bash');
      expect(config.installedVersion).toBe('1.2.3');
      expect(config.installPath).toBe('/home/user/.scaffold/completion-bash.sh');
      expect(config.installDate).toEqual(new Date('2023-01-01'));
      expect(config.isEnabled).toBe(true);
      expect(config.isInstalled).toBe(true);
    });

    it('should create config with null values for uninstalled state', () => {
      const config: CompletionConfig = {
        shellType: 'zsh',
        installedVersion: null,
        installPath: null,
        installDate: null,
        isEnabled: false,
        isInstalled: false,
      };

      expect(config.shellType).toBe('zsh');
      expect(config.installedVersion).toBeNull();
      expect(config.installPath).toBeNull();
      expect(config.installDate).toBeNull();
      expect(config.isEnabled).toBe(false);
      expect(config.isInstalled).toBe(false);
    });

    it('should accept all valid shell types', () => {
      const bashConfig: CompletionConfig = {
        shellType: 'bash',
        installedVersion: null,
        installPath: null,
        installDate: null,
        isEnabled: false,
        isInstalled: false,
      };

      const zshConfig: CompletionConfig = {
        shellType: 'zsh',
        installedVersion: null,
        installPath: null,
        installDate: null,
        isEnabled: false,
        isInstalled: false,
      };

      const fishConfig: CompletionConfig = {
        shellType: 'fish',
        installedVersion: null,
        installPath: null,
        installDate: null,
        isEnabled: false,
        isInstalled: false,
      };

      expect(bashConfig.shellType).toBe('bash');
      expect(zshConfig.shellType).toBe('zsh');
      expect(fishConfig.shellType).toBe('fish');
    });

    it('should handle mixed enabled/installed states', () => {
      const partialConfig: CompletionConfig = {
        shellType: 'bash',
        installedVersion: '1.0.0',
        installPath: '/path/to/script',
        installDate: new Date(),
        isEnabled: false, // Installed but disabled
        isInstalled: true,
      };

      expect(partialConfig.isInstalled).toBe(true);
      expect(partialConfig.isEnabled).toBe(false);
    });
  });

  describe('CompletionContext interface', () => {
    it('should create valid completion context', () => {
      const envVars = new Map([
        ['HOME', '/home/user'],
        ['PATH', '/usr/bin:/bin'],
      ]);

      const context: CompletionContext = {
        currentWord: 'new',
        previousWord: 'scaffold',
        commandLine: ['scaffold', 'new'],
        cursorPosition: 12,
        environmentVars: envVars,
        currentDirectory: '/test/workspace',
      };

      expect(context.currentWord).toBe('new');
      expect(context.previousWord).toBe('scaffold');
      expect(context.commandLine).toEqual(['scaffold', 'new']);
      expect(context.cursorPosition).toBe(12);
      expect(context.environmentVars.get('HOME')).toBe('/home/user');
      expect(context.currentDirectory).toBe('/test/workspace');
    });

    it('should handle empty context', () => {
      const context: CompletionContext = {
        currentWord: '',
        previousWord: null,
        commandLine: ['scaffold'],
        cursorPosition: 8,
        environmentVars: new Map(),
        currentDirectory: process.cwd(),
      };

      expect(context.currentWord).toBe('');
      expect(context.previousWord).toBeNull();
      expect(context.commandLine).toEqual(['scaffold']);
      expect(context.environmentVars.size).toBe(0);
    });

    it('should handle complex command line scenarios', () => {
      const context: CompletionContext = {
        currentWord: '--template',
        previousWord: 'new',
        commandLine: ['scaffold', 'new', 'my-project', '--template'],
        cursorPosition: 35,
        environmentVars: new Map([['SHELL', '/bin/zsh']]),
        currentDirectory: '/projects',
      };

      expect(context.commandLine).toHaveLength(4);
      expect(context.currentWord.startsWith('--')).toBe(true);
      expect(context.environmentVars.get('SHELL')).toBe('/bin/zsh');
    });
  });

  describe('CompletionProvider interface', () => {
    let mockProvider: CompletionProvider;

    beforeEach(() => {
      mockProvider = {
        name: 'test-provider',
        priority: 100,
        canHandle: jest.fn(),
        getCompletions: jest.fn(),
        getCacheKey: jest.fn(),
        getCacheTTL: jest.fn(),
      };
    });

    it('should create provider with required properties', () => {
      expect(mockProvider.name).toBe('test-provider');
      expect(mockProvider.priority).toBe(100);
      expect(typeof mockProvider.canHandle).toBe('function');
      expect(typeof mockProvider.getCompletions).toBe('function');
    });

    it('should handle optional methods', () => {
      const minimalProvider: CompletionProvider = {
        name: 'minimal',
        priority: 1,
        canHandle: () => false,
        getCompletions: async () => [],
      };

      expect(minimalProvider.getCacheKey).toBeUndefined();
      expect(minimalProvider.getCacheTTL).toBeUndefined();
    });

    it('should implement provider interface correctly', async () => {
      const context: CompletionContext = {
        currentWord: 'test',
        previousWord: null,
        commandLine: ['scaffold'],
        cursorPosition: 0,
        environmentVars: new Map(),
        currentDirectory: '/test',
      };

      (mockProvider.canHandle as jest.Mock).mockReturnValue(true);
      (mockProvider.getCompletions as jest.Mock).mockResolvedValue(['test1', 'test2']);
      (mockProvider.getCacheKey as jest.Mock).mockReturnValue('cache-key');
      (mockProvider.getCacheTTL as jest.Mock).mockReturnValue(5000);

      const canHandle = mockProvider.canHandle(context);
      const completions = await mockProvider.getCompletions(context);
      const cacheKey = mockProvider.getCacheKey?.(context);
      const cacheTTL = mockProvider.getCacheTTL?.();

      expect(canHandle).toBe(true);
      expect(completions).toEqual(['test1', 'test2']);
      expect(cacheKey).toBe('cache-key');
      expect(cacheTTL).toBe(5000);
    });
  });

  describe('CommandMetadata interface', () => {
    it('should create valid command metadata', () => {
      const subcommand: SubcommandMetadata = {
        name: 'new',
        aliases: ['create'],
        subcommands: [],
        options: [],
        arguments: [],
        description: 'Create a new project',
        dynamicCompletionProvider: null,
      };

      const option: OptionMetadata = {
        long: '--template',
        short: '-t',
        description: 'Specify template',
        valueRequired: true,
        valueType: 'string',
        defaultValue: null,
        choices: null,
      };

      const command: CommandMetadata = {
        name: 'scaffold',
        subcommands: [subcommand],
        options: [option],
        description: 'Scaffold CLI tool',
      };

      expect(command.name).toBe('scaffold');
      expect(command.subcommands).toHaveLength(1);
      expect(command.options).toHaveLength(1);
      expect(command.subcommands[0]).toBe(subcommand);
      expect(command.options[0]).toBe(option);
    });

    it('should handle nested subcommands', () => {
      const nestedSubcommand: SubcommandMetadata = {
        name: 'list',
        aliases: ['ls'],
        subcommands: [],
        options: [],
        arguments: [],
        description: 'List templates',
        dynamicCompletionProvider: 'template-provider',
      };

      const templateSubcommand: SubcommandMetadata = {
        name: 'template',
        aliases: [],
        subcommands: [nestedSubcommand],
        options: [],
        arguments: [],
        description: 'Template management',
        dynamicCompletionProvider: null,
      };

      const command: CommandMetadata = {
        name: 'scaffold',
        subcommands: [templateSubcommand],
        options: [],
        description: 'Scaffold CLI',
      };

      expect(command.subcommands[0].subcommands).toHaveLength(1);
      expect(command.subcommands[0].subcommands[0].name).toBe('list');
      expect(command.subcommands[0].subcommands[0].dynamicCompletionProvider).toBe('template-provider');
    });
  });

  describe('SubcommandMetadata interface', () => {
    it('should create subcommand with all properties', () => {
      const argument: ArgumentMetadata = {
        name: 'project-name',
        required: true,
        variadic: false,
        completionType: 'static',
        completionProvider: null,
        choices: null,
      };

      const option: OptionMetadata = {
        long: '--force',
        short: '-f',
        description: 'Force overwrite',
        valueRequired: false,
        valueType: 'boolean',
        defaultValue: false,
        choices: null,
      };

      const subcommand: SubcommandMetadata = {
        name: 'new',
        aliases: ['create', 'init'],
        subcommands: [],
        options: [option],
        arguments: [argument],
        description: 'Create a new project',
        dynamicCompletionProvider: 'project-provider',
      };

      expect(subcommand.name).toBe('new');
      expect(subcommand.aliases).toEqual(['create', 'init']);
      expect(subcommand.options).toHaveLength(1);
      expect(subcommand.arguments).toHaveLength(1);
      expect(subcommand.dynamicCompletionProvider).toBe('project-provider');
    });

    it('should handle empty collections', () => {
      const subcommand: SubcommandMetadata = {
        name: 'clean',
        aliases: [],
        subcommands: [],
        options: [],
        arguments: [],
        description: 'Clean up',
        dynamicCompletionProvider: null,
      };

      expect(subcommand.aliases).toHaveLength(0);
      expect(subcommand.subcommands).toHaveLength(0);
      expect(subcommand.options).toHaveLength(0);
      expect(subcommand.arguments).toHaveLength(0);
    });
  });

  describe('OptionMetadata interface', () => {
    it('should create string option with choices', () => {
      const option: OptionMetadata = {
        long: '--shell',
        short: '-s',
        description: 'Target shell',
        valueRequired: true,
        valueType: 'string',
        defaultValue: 'bash',
        choices: ['bash', 'zsh', 'fish'],
      };

      expect(option.valueType).toBe('string');
      expect(option.choices).toEqual(['bash', 'zsh', 'fish']);
      expect(option.defaultValue).toBe('bash');
    });

    it('should create boolean flag option', () => {
      const option: OptionMetadata = {
        long: '--verbose',
        short: '-v',
        description: 'Enable verbose output',
        valueRequired: false,
        valueType: 'boolean',
        defaultValue: false,
        choices: null,
      };

      expect(option.valueType).toBe('boolean');
      expect(option.valueRequired).toBe(false);
      expect(option.choices).toBeNull();
    });

    it('should create number option', () => {
      const option: OptionMetadata = {
        long: '--port',
        short: '-p',
        description: 'Port number',
        valueRequired: true,
        valueType: 'number',
        defaultValue: 3000,
        choices: null,
      };

      expect(option.valueType).toBe('number');
      expect(option.defaultValue).toBe(3000);
    });

    it('should create path option', () => {
      const option: OptionMetadata = {
        long: '--config',
        short: '-c',
        description: 'Configuration file path',
        valueRequired: true,
        valueType: 'path',
        defaultValue: './config.json',
        choices: null,
      };

      expect(option.valueType).toBe('path');
      expect(option.defaultValue).toBe('./config.json');
    });

    it('should handle option without short form', () => {
      const option: OptionMetadata = {
        long: '--dry-run',
        short: null,
        description: 'Show what would be done',
        valueRequired: false,
        valueType: 'boolean',
        defaultValue: false,
        choices: null,
      };

      expect(option.short).toBeNull();
      expect(option.long).toBe('--dry-run');
    });

    it('should handle option without default value', () => {
      const option: OptionMetadata = {
        long: '--template',
        short: '-t',
        description: 'Template name',
        valueRequired: true,
        valueType: 'string',
        defaultValue: null,
        choices: null,
      };

      expect(option.defaultValue).toBeNull();
    });
  });

  describe('ArgumentMetadata interface', () => {
    it('should create required static argument', () => {
      const argument: ArgumentMetadata = {
        name: 'command',
        required: true,
        variadic: false,
        completionType: 'static',
        completionProvider: null,
        choices: ['new', 'template', 'check', 'fix'],
      };

      expect(argument.required).toBe(true);
      expect(argument.variadic).toBe(false);
      expect(argument.completionType).toBe('static');
      expect(argument.choices).toHaveLength(4);
    });

    it('should create optional variadic argument', () => {
      const argument: ArgumentMetadata = {
        name: 'files',
        required: false,
        variadic: true,
        completionType: 'path',
        completionProvider: null,
        choices: null,
      };

      expect(argument.required).toBe(false);
      expect(argument.variadic).toBe(true);
      expect(argument.completionType).toBe('path');
      expect(argument.choices).toBeNull();
    });

    it('should create dynamic completion argument', () => {
      const argument: ArgumentMetadata = {
        name: 'template-name',
        required: true,
        variadic: false,
        completionType: 'dynamic',
        completionProvider: 'template-completion-provider',
        choices: null,
      };

      expect(argument.completionType).toBe('dynamic');
      expect(argument.completionProvider).toBe('template-completion-provider');
    });

    it('should handle all completion types', () => {
      const staticArg: ArgumentMetadata = {
        name: 'static',
        required: true,
        variadic: false,
        completionType: 'static',
        completionProvider: null,
        choices: ['choice1', 'choice2'],
      };

      const dynamicArg: ArgumentMetadata = {
        name: 'dynamic',
        required: true,
        variadic: false,
        completionType: 'dynamic',
        completionProvider: 'provider',
        choices: null,
      };

      const pathArg: ArgumentMetadata = {
        name: 'path',
        required: true,
        variadic: false,
        completionType: 'path',
        completionProvider: null,
        choices: null,
      };

      expect(staticArg.completionType).toBe('static');
      expect(dynamicArg.completionType).toBe('dynamic');
      expect(pathArg.completionType).toBe('path');
    });
  });

  describe('Type validation and edge cases', () => {
    it('should handle Date serialization in completion config', () => {
      const config: CompletionConfig = {
        shellType: 'bash',
        installedVersion: '1.0.0',
        installPath: '/path',
        installDate: new Date('2023-01-01T12:00:00Z'),
        isEnabled: true,
        isInstalled: true,
      };

      // Simulate JSON serialization/deserialization
      const serialized = JSON.stringify(config);
      const deserialized = JSON.parse(serialized);

      expect(typeof deserialized.installDate).toBe('string');
      expect(new Date(deserialized.installDate)).toEqual(config.installDate);
    });

    it('should handle Map serialization in completion context', () => {
      const envVars = new Map([
        ['HOME', '/home/user'],
        ['SHELL', '/bin/bash'],
      ]);

      const context: CompletionContext = {
        currentWord: 'test',
        previousWord: null,
        commandLine: ['scaffold'],
        cursorPosition: 0,
        environmentVars: envVars,
        currentDirectory: '/test',
      };

      // Maps don't serialize to JSON directly
      expect(envVars.get('HOME')).toBe('/home/user');
      expect(envVars.size).toBe(2);
    });

    it('should handle unicode characters in completion data', () => {
      const context: CompletionContext = {
        currentWord: 'プロジェクト', // Japanese for "project"
        previousWord: 'scaffold',
        commandLine: ['scaffold', 'プロジェクト'],
        cursorPosition: 15,
        environmentVars: new Map([['LANG', 'ja_JP.UTF-8']]),
        currentDirectory: '/ユーザー/プロジェクト', // Japanese path
      };

      expect(context.currentWord).toBe('プロジェクト');
      expect(context.currentDirectory).toBe('/ユーザー/プロジェクト');
    });

    it('should handle empty and whitespace strings', () => {
      const context: CompletionContext = {
        currentWord: '',
        previousWord: '   ', // Only whitespace
        commandLine: ['scaffold', '', '   '],
        cursorPosition: 0,
        environmentVars: new Map(),
        currentDirectory: '',
      };

      expect(context.currentWord).toBe('');
      expect(context.previousWord).toBe('   ');
      expect(context.currentDirectory).toBe('');
    });

    it('should handle very long command lines', () => {
      const longArgs = Array.from({ length: 100 }, (_, i) => `arg${i}`);
      const context: CompletionContext = {
        currentWord: 'current',
        previousWord: 'arg99',
        commandLine: ['scaffold', ...longArgs, 'current'],
        cursorPosition: 1000,
        environmentVars: new Map(),
        currentDirectory: '/test',
      };

      expect(context.commandLine.length).toBe(102); // scaffold + 100 args + current
      expect(context.commandLine[101]).toBe('current');
    });

    it('should handle provider priority edge cases', () => {
      const highPriorityProvider: CompletionProvider = {
        name: 'high',
        priority: Number.MAX_SAFE_INTEGER,
        canHandle: () => true,
        getCompletions: async () => [],
      };

      const lowPriorityProvider: CompletionProvider = {
        name: 'low',
        priority: Number.MIN_SAFE_INTEGER,
        canHandle: () => true,
        getCompletions: async () => [],
      };

      expect(highPriorityProvider.priority).toBe(Number.MAX_SAFE_INTEGER);
      expect(lowPriorityProvider.priority).toBe(Number.MIN_SAFE_INTEGER);
    });
  });
});