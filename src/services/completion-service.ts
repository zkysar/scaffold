/**
 * Service for managing shell completion installation and generation
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { injectable, inject } from 'tsyringe';
import type {
  CompletionConfig,
  CompletionContext,
  CompletionResult,
  CompletionItem,
  ShellCompletionScript,
} from '@/models';
import { ShellType } from '@/models';
import { CommandRegistry } from '@/cli/completion/command-registry';
import type { ITemplateService } from './template-service';
import { TemplateService } from './template-service';

export interface ICompletionService {
  /**
   * Detect the user's current shell type
   */
  detectShell(): Promise<ShellType>;

  /**
   * Generate shell-specific completion script
   */
  generateCompletionScript(shellType: ShellType): Promise<ShellCompletionScript>;

  /**
   * Install completion script in user's shell configuration
   */
  installCompletion(shellType?: ShellType, force?: boolean): Promise<CompletionConfig>;

  /**
   * Remove completion script from user's shell configuration
   */
  uninstallCompletion(shellType?: ShellType): Promise<void>;

  /**
   * Get current completion installation status
   */
  getCompletionStatus(shellType?: ShellType): Promise<CompletionConfig>;

  /**
   * Generate completion suggestions for given context
   */
  generateCompletions(context: CompletionContext): Promise<CompletionResult>;

  /**
   * Get shell completion script (legacy method for CLI compatibility)
   */
  getCompletionScript(shellType: ShellType): Promise<ShellCompletionScript>;
}

@injectable()
export class CompletionService implements ICompletionService {
  private readonly configDir: string;
  private readonly cacheDir: string;

  constructor(
    @inject(TemplateService) private readonly templateService: ITemplateService
  ) {
    this.configDir = path.join(os.homedir(), '.scaffold');
    this.cacheDir = path.join(this.configDir, 'completion-cache');
  }

  async detectShell(): Promise<ShellType> {
    const shell = process.env.SHELL || '';

    if (shell.includes('zsh')) {
      return ShellType.ZSH;
    } else if (shell.includes('fish')) {
      return ShellType.FISH;
    } else if (shell.includes('bash')) {
      return ShellType.BASH;
    }

    // Fallback: try to detect from parent process
    try {
      const ppid = process.ppid;
      if (ppid) {
        const { exec } = require('child_process');
        const result = await new Promise<string>((resolve, reject) => {
          exec(`ps -p ${ppid} -o comm=`, (error: Error | null, stdout: string) => {
            if (error) reject(error);
            else resolve(stdout.trim());
          });
        });

        if (result.includes('zsh')) return ShellType.ZSH;
        if (result.includes('fish')) return ShellType.FISH;
        if (result.includes('bash')) return ShellType.BASH;
      }
    } catch (error) {
      // Ignore detection errors, fall back to bash
    }

    return ShellType.BASH; // Default fallback
  }

  async generateCompletionScript(shellType: ShellType): Promise<ShellCompletionScript> {
    switch (shellType) {
      case ShellType.BASH:
        return this.generateBashScript();
      case ShellType.ZSH:
        return this.generateZshScript();
      case ShellType.FISH:
        return this.generateFishScript();
      default:
        throw new Error(`Unsupported shell type: ${shellType}`);
    }
  }

  async installCompletion(shellType?: ShellType, force = false): Promise<CompletionConfig> {
    const detectedShell = shellType || await this.detectShell();
    const config = await this.getCompletionStatus(detectedShell);

    if (config.isInstalled && !force) {
      throw new Error(`Completion already installed for ${detectedShell}. Use --force to reinstall.`);
    }

    await this.ensureDirectoriesExist();

    const script = await this.generateCompletionScript(detectedShell);
    const installPath = await this.getInstallPath(detectedShell);

    try {
      await this.writeCompletionScript(detectedShell, script.content, installPath);
      await this.addToShellConfig(detectedShell, installPath);

      const newConfig: CompletionConfig = {
        shellType: detectedShell,
        installedVersion: await this.getScaffoldVersion(),
        installPath,
        installDate: new Date(),
        isEnabled: true,
        isInstalled: true,
      };

      await this.saveCompletionConfig(newConfig);
      return newConfig;
    } catch (error) {
      throw new Error(`Failed to install completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uninstallCompletion(shellType?: ShellType): Promise<void> {
    const detectedShell = shellType || await this.detectShell();
    const config = await this.getCompletionStatus(detectedShell);

    if (!config.isInstalled) {
      console.log(`Completion not installed for ${detectedShell}`);
      return;
    }

    try {
      if (config.installPath) {
        await this.removeFromShellConfig(detectedShell, config.installPath);
        await fs.remove(config.installPath);
      }

      await this.removeCompletionConfig(detectedShell);
    } catch (error) {
      throw new Error(`Failed to uninstall completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCompletionStatus(shellType?: ShellType): Promise<CompletionConfig> {
    const detectedShell = shellType || await this.detectShell();

    try {
      const configPath = path.join(this.configDir, `completion-${detectedShell}.json`);

      if (await fs.pathExists(configPath)) {
        const config = await fs.readJson(configPath) as CompletionConfig;

        // Verify installation is still valid
        if (config.installPath && await fs.pathExists(config.installPath)) {
          return { ...config, isInstalled: true };
        }
      }
    } catch (error) {
      // Config file doesn't exist or is invalid
    }

    return {
      shellType: detectedShell,
      installedVersion: null,
      installPath: null,
      installDate: null,
      isEnabled: false,
      isInstalled: false,
    };
  }

  async generateCompletions(context: CompletionContext): Promise<CompletionResult> {
    const suggestions: string[] = [];
    const errors: string[] = [];

    try {
      // Parse command line to determine completion type
      const { command, subcommand, isOptionValue, isFlag } = this.parseCommandLine(context);

      if (isOptionValue) {
        // When completing an option value, only show value completions
        suggestions.push(...await this.getOptionValueCompletions(context));
      } else {
        // For all other cases, show mixed completions (commands/subcommands + flags)

        // Get command/subcommand completions
        const commandSuggestions = await this.getCommandCompletions(command, subcommand, context);

        // Get flag completions
        const flagSuggestions = await this.getOptionCompletions(command, subcommand, context);

        // If user is typing a flag (starts with -), show only flags
        if (isFlag) {
          suggestions.push(...flagSuggestions);
        } else {
          // Otherwise show both commands and flags
          suggestions.push(...commandSuggestions);
          suggestions.push(...flagSuggestions);
        }
      }

      return {
        completions: this.filterAndSortSuggestions(suggestions, context.currentWord).map(value => ({
          value,
          description: null,
          type: 'command' as const,
          deprecated: false,
        })),
        cacheKey: null,
        cacheExpiry: null,
        errors: [],
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown completion error');

      return {
        completions: [],
        cacheKey: null,
        cacheExpiry: null,
        errors,
      };
    }
  }

  private async generateBashScript(): Promise<ShellCompletionScript> {
    const script = `
_scaffold_completion() {
    local cur prev words cword
    _init_completion || return

    # Get completion from scaffold CLI
    local completion_result
    local exit_code
    completion_result=$(scaffold completion complete --line "$COMP_LINE" --point "$COMP_POINT" 2>/dev/null)
    exit_code=$?

    if [[ $exit_code -eq 0 ]]; then
        # Parse JSON output and extract values
        local suggestions=""
        while IFS= read -r line; do
            if [[ "$line" =~ \"value\":\"([^\"]+)\" ]]; then
                suggestions="$suggestions \${BASH_REMATCH[1]}"
            fi
        done <<< "$completion_result"

        # Use suggestions even if empty (no completions available)
        COMPREPLY=($(compgen -W "$suggestions" -- "$cur"))
    else
        # Only fallback if completion command itself failed
        local fallback="new template check fix extend clean completion config show help version"
        COMPREPLY=($(compgen -W "$fallback" -- "$cur"))
    fi
}

complete -F _scaffold_completion scaffold
`;

    return {
      shellType: ShellType.BASH,
      content: script,
      filename: 'scaffold-completion.bash',
      installPath: await this.getInstallPath(ShellType.BASH),
    };
  }

  private async generateZshScript(): Promise<ShellCompletionScript> {
    const script = `#compdef scaffold
# Scaffold CLI completion for zsh

_scaffold() {
    local -a completions
    local completion_json
    local current_line="$BUFFER"
    local cursor_pos="$CURSOR"

    # Get completions from scaffold CLI
    completion_json=$(scaffold completion complete --line "$current_line" --point "$cursor_pos" 2>/dev/null)

    if [[ $? -eq 0 ]]; then
        # Parse JSON output - each line is {"value":"..."}
        if [[ -n "$completion_json" ]]; then
            while IFS= read -r line; do
                # Extract the value field from JSON
                if [[ "$line" =~ '"value":"([^"]+)"' ]]; then
                    completions+=("$match[1]")
                fi
            done <<< "$completion_json"
        fi

        # Always use what we got from the completion command
        # Even if empty (no completions available)
        if (( $#completions > 0 )); then
            compadd -a completions
        fi
        return 0
    fi

    # Only fallback to basic commands if completion command itself failed
    completions=(new template check fix extend clean completion config show help version)
    compadd -a completions
}

_scaffold "$@"`;

    return {
      shellType: ShellType.ZSH,
      content: script,
      filename: '_scaffold',  // Use underscore prefix for zsh completion files
      installPath: await this.getInstallPath(ShellType.ZSH),
    };
  }

  private async generateFishScript(): Promise<ShellCompletionScript> {
    const script = `
function __scaffold_complete
    set -l cmdline (commandline -cp)
    set -l cursor (commandline -C)

    # Get completion from scaffold CLI
    set -l completion_result (scaffold completion complete --line "$cmdline" --point "$cursor" 2>/dev/null)
    set -l exit_code $status

    if test $exit_code -eq 0
        # Parse JSON output and extract values
        for line in $completion_result
            # Extract value field from JSON
            echo $line | string match -r '"value":"([^"]+)"' | tail -n 1
        end
    else
        # Only fallback if completion command itself failed
        echo new template check fix extend clean completion config show help version
    end
end

complete -c scaffold -f -a "(__scaffold_complete)"
`;

    return {
      shellType: ShellType.FISH,
      content: script,
      filename: 'scaffold.fish',
      installPath: await this.getInstallPath(ShellType.FISH),
    };
  }

  private async getInstallPath(shellType: ShellType): Promise<string> {
    const homeDir = os.homedir();

    switch (shellType) {
      case ShellType.BASH:
        return path.join(homeDir, '.scaffold', 'completion-bash.sh');
      case ShellType.ZSH:
        return path.join(homeDir, '.scaffold', 'completions', '_scaffold');
      case ShellType.FISH:
        const fishDir = path.join(homeDir, '.config', 'fish', 'completions');
        await fs.ensureDir(fishDir);
        return path.join(fishDir, 'scaffold.fish');
      default:
        throw new Error(`Unsupported shell type: ${shellType}`);
    }
  }

  private async writeCompletionScript(shellType: ShellType, script: string, installPath: string): Promise<void> {
    await fs.ensureDir(path.dirname(installPath));
    await fs.writeFile(installPath, script, 'utf-8');

    // Make script executable for bash/zsh
    if (shellType !== ShellType.FISH) {
      await fs.chmod(installPath, 0o755);
    }
  }

  private async addToShellConfig(shellType: ShellType, installPath: string): Promise<void> {
    const homeDir = os.homedir();
    let configFile: string;
    let sourceCommand: string;

    switch (shellType) {
      case ShellType.BASH:
        configFile = path.join(homeDir, '.bashrc');
        sourceCommand = `source "${installPath}"`;
        break;
      case ShellType.ZSH:
        configFile = path.join(homeDir, '.zshrc');
        const completionDir = path.dirname(installPath);
        sourceCommand = `fpath=(${completionDir} $fpath)`;
        break;
      case ShellType.FISH:
        // Fish auto-loads from completions directory
        return;
      default:
        throw new Error(`Unsupported shell type: ${shellType}`);
    }

    // Check if already configured
    if (await fs.pathExists(configFile)) {
      const content = await fs.readFile(configFile, 'utf-8');

      // For zsh, check if fpath already contains our directory
      if (shellType === ShellType.ZSH) {
        const completionDir = path.dirname(installPath);
        if (content.includes(completionDir)) {
          return; // Already configured
        }

        // Insert fpath before compinit
        const lines = content.split('\n');
        const compInitIndex = lines.findIndex(line => line.includes('compinit'));

        if (compInitIndex > 0) {
          // Insert before compinit
          lines.splice(compInitIndex, 0,
            '# Scaffold CLI completion',
            sourceCommand
          );
          await fs.writeFile(configFile, lines.join('\n'), 'utf-8');
        } else {
          // No compinit found, append to start of file
          await fs.writeFile(configFile,
            `# Scaffold CLI completion\n${sourceCommand}\n\n${content}`,
            'utf-8'
          );
        }
        return;
      }

      // For bash, check normally
      if (content.includes(installPath)) {
        return; // Already configured
      }
    }

    // Add source command for bash
    const comment = '# Scaffold CLI completion';
    const configLine = `${comment}\n${sourceCommand}\n`;
    await fs.appendFile(configFile, `\n${configLine}`);
  }

  private async removeFromShellConfig(shellType: ShellType, installPath: string): Promise<void> {
    const homeDir = os.homedir();
    let configFile: string;

    switch (shellType) {
      case ShellType.BASH:
        configFile = path.join(homeDir, '.bashrc');
        break;
      case ShellType.ZSH:
        configFile = path.join(homeDir, '.zshrc');
        break;
      case ShellType.FISH:
        // Fish auto-loads, just remove the file
        return;
      default:
        return;
    }

    if (!await fs.pathExists(configFile)) {
      return;
    }

    const content = await fs.readFile(configFile, 'utf-8');
    const lines = content.split('\n');
    const filteredLines = lines.filter(line =>
      !line.includes(installPath) &&
      !line.includes('# Scaffold CLI completion')
    );

    await fs.writeFile(configFile, filteredLines.join('\n'), 'utf-8');
  }

  private async saveCompletionConfig(config: CompletionConfig): Promise<void> {
    await this.ensureDirectoriesExist();
    const configPath = path.join(this.configDir, `completion-${config.shellType}.json`);
    await fs.writeJson(configPath, config, { spaces: 2 });
  }

  private async removeCompletionConfig(shellType: ShellType): Promise<void> {
    const configPath = path.join(this.configDir, `completion-${shellType}.json`);
    if (await fs.pathExists(configPath)) {
      await fs.remove(configPath);
    }
  }

  private async getScaffoldVersion(): Promise<string> {
    try {
      // Try to read version from package.json
      const packagePath = path.join(__dirname, '..', '..', 'package.json');
      if (await fs.pathExists(packagePath)) {
        const pkg = await fs.readJson(packagePath);
        return pkg.version || '1.0.0';
      }
    } catch (error) {
      // Ignore error, use default
    }
    return '1.0.0';
  }

  private parseCommandLine(context: CompletionContext): {
    command: string | null;
    subcommand: string | null;
    isOptionValue: boolean;
    isFlag: boolean;
  } {
    const { commandLine, cursorPosition } = context;
    const currentWord = context.currentWord;
    const previousWord = context.previousWord;

    // Check if we're completing a flag
    const isFlag = currentWord.startsWith('-');

    // Check if we're completing an option value
    // Only certain flags take values
    const flagsThatTakeValues = ['--shell', '--template', '--workspace'];
    const isOptionValue = previousWord !== null &&
                         flagsThatTakeValues.includes(previousWord) &&
                         !currentWord.startsWith('-');

    // Skip the 'scaffold' executable name if present
    let words = commandLine;
    if (commandLine[0] === 'scaffold') {
      words = commandLine.slice(1);
    }

    // Filter out flags and their values to find the actual commands
    const nonFlagWords: string[] = [];
    let skipNext = false;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      if (skipNext) {
        skipNext = false;
        continue;
      }

      if (word.startsWith('-')) {
        // This is a flag - check if it takes a value
        if (word === '--shell' || word === '--template' || word === '--workspace') {
          skipNext = true; // Skip the next word as it's the flag's value
        }
        continue;
      }

      // Don't include the current word if we're still typing it
      if (word !== currentWord) {
        nonFlagWords.push(word);
      }
    }

    // Extract command and subcommand from non-flag words
    let command = nonFlagWords[0] || null;
    let subcommand = nonFlagWords.length > 1 ? nonFlagWords[1] : null;

    return { command, subcommand, isOptionValue, isFlag };
  }

  private async getOptionCompletions(command: string | null, subcommand: string | null, context: CompletionContext): Promise<string[]> {
    const registry = CommandRegistry.getInstance();

    const commandPath: string[] = [];
    if (command) commandPath.push(command);
    if (subcommand) commandPath.push(subcommand);

    const allOptions = registry.getCommandOptions(commandPath);

    // Extract already-used flags from the command line
    const usedFlags = new Set<string>();
    for (const word of context.commandLine) {
      if (word.startsWith('-') && word !== context.currentWord) {
        usedFlags.add(word);
      }
    }

    // Filter out already-used flags
    return allOptions.filter(option => !usedFlags.has(option));
  }

  private async getOptionValueCompletions(context: CompletionContext): Promise<string[]> {
    const previousWord = context.previousWord;

    if (previousWord === '--shell') {
      return ['bash', 'zsh', 'fish'];
    }

    if (previousWord === '--template') {
      try {
        // Load available templates
        const library = await this.templateService.loadTemplates();
        // Return template names/IDs for completion
        return library.templates.map(template => template.name || template.id);
      } catch (error) {
        // If template loading fails, return empty array
        return [];
      }
    }

    return [];
  }

  private async getCommandCompletions(command: string | null, subcommand: string | null, context: CompletionContext): Promise<string[]> {
    const registry = CommandRegistry.getInstance();

    if (!command) {
      // Top-level commands
      return registry.getTopLevelCommands();
    }

    if (!subcommand) {
      // Get subcommands for the given command
      return registry.getSubcommands(command);
    }

    // Special handling for commands that take arguments after actions
    if (command === 'template' && ['delete', 'export'].includes(subcommand)) {
      // For template delete/export, we should provide template name completions
      // Import the template provider to get template names
      const { TemplateCompletionProvider } = require('./completion-providers/template-completion-provider');
      const { TemplateService } = require('./template-service');
      const templateProvider = new TemplateCompletionProvider(new TemplateService());
      const templates = await templateProvider.getTemplateCompletions(context);
      return templates.map((t: CompletionItem) => t.value);
    }

    // If we have both command and subcommand, get sub-subcommands
    const subSubcommands = registry.getSubcommands(`${command} ${subcommand}`);

    // Don't return empty array which causes fallback to main commands
    // Return empty array only if explicitly no completions are available
    return subSubcommands;
  }

  private filterAndSortSuggestions(suggestions: string[], currentWord: string): string[] {
    if (!currentWord) {
      return suggestions.sort();
    }

    return suggestions
      .filter(suggestion => suggestion.startsWith(currentWord))
      .sort();
  }

  async getCompletionScript(shellType: ShellType): Promise<ShellCompletionScript> {
    return this.generateCompletionScript(shellType);
  }

  private async ensureDirectoriesExist(): Promise<void> {
    await fs.ensureDir(this.configDir);
    await fs.ensureDir(this.cacheDir);
  }
}