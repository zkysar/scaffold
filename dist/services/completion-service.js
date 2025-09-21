"use strict";
/**
 * Service for managing shell completion installation and generation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompletionService = void 0;
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs-extra"));
const models_1 = require("../models");
const command_registry_1 = require("../cli/completion/command-registry");
const template_service_1 = require("./template-service");
class CompletionService {
    configDir;
    cacheDir;
    templateService;
    constructor() {
        this.configDir = path.join(os.homedir(), '.scaffold');
        this.cacheDir = path.join(this.configDir, 'completion-cache');
        this.templateService = new template_service_1.TemplateService();
    }
    async detectShell() {
        const shell = process.env.SHELL || '';
        if (shell.includes('zsh')) {
            return models_1.ShellType.ZSH;
        }
        else if (shell.includes('fish')) {
            return models_1.ShellType.FISH;
        }
        else if (shell.includes('bash')) {
            return models_1.ShellType.BASH;
        }
        // Fallback: try to detect from parent process
        try {
            const ppid = process.ppid;
            if (ppid) {
                const { exec } = require('child_process');
                const result = await new Promise((resolve, reject) => {
                    exec(`ps -p ${ppid} -o comm=`, (error, stdout) => {
                        if (error)
                            reject(error);
                        else
                            resolve(stdout.trim());
                    });
                });
                if (result.includes('zsh'))
                    return models_1.ShellType.ZSH;
                if (result.includes('fish'))
                    return models_1.ShellType.FISH;
                if (result.includes('bash'))
                    return models_1.ShellType.BASH;
            }
        }
        catch (error) {
            // Ignore detection errors, fall back to bash
        }
        return models_1.ShellType.BASH; // Default fallback
    }
    async generateCompletionScript(shellType) {
        switch (shellType) {
            case models_1.ShellType.BASH:
                return this.generateBashScript();
            case models_1.ShellType.ZSH:
                return this.generateZshScript();
            case models_1.ShellType.FISH:
                return this.generateFishScript();
            default:
                throw new Error(`Unsupported shell type: ${shellType}`);
        }
    }
    async installCompletion(shellType, force = false) {
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
            const newConfig = {
                shellType: detectedShell,
                installedVersion: await this.getScaffoldVersion(),
                installPath,
                installDate: new Date(),
                isEnabled: true,
                isInstalled: true,
            };
            await this.saveCompletionConfig(newConfig);
            return newConfig;
        }
        catch (error) {
            throw new Error(`Failed to install completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async uninstallCompletion(shellType) {
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
        }
        catch (error) {
            throw new Error(`Failed to uninstall completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getCompletionStatus(shellType) {
        const detectedShell = shellType || await this.detectShell();
        try {
            const configPath = path.join(this.configDir, `completion-${detectedShell}.json`);
            if (await fs.pathExists(configPath)) {
                const config = await fs.readJson(configPath);
                // Verify installation is still valid
                if (config.installPath && await fs.pathExists(config.installPath)) {
                    return { ...config, isInstalled: true };
                }
            }
        }
        catch (error) {
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
    async generateCompletions(context) {
        const suggestions = [];
        const errors = [];
        try {
            // Parse command line to determine completion type
            const { command, subcommand, isOptionValue, isFlag } = this.parseCommandLine(context);
            if (isOptionValue) {
                // When completing an option value, only show value completions
                suggestions.push(...await this.getOptionValueCompletions(context));
            }
            else {
                // For all other cases, show mixed completions (commands/subcommands + flags)
                // Get command/subcommand completions
                const commandSuggestions = await this.getCommandCompletions(command, subcommand, context);
                // Get flag completions
                const flagSuggestions = await this.getOptionCompletions(command, subcommand, context);
                // If user is typing a flag (starts with -), show only flags
                if (isFlag) {
                    suggestions.push(...flagSuggestions);
                }
                else {
                    // Otherwise show both commands and flags
                    suggestions.push(...commandSuggestions);
                    suggestions.push(...flagSuggestions);
                }
            }
            return {
                completions: this.filterAndSortSuggestions(suggestions, context.currentWord).map(value => ({
                    value,
                    description: null,
                    type: 'command',
                    deprecated: false,
                })),
                cacheKey: null,
                cacheExpiry: null,
                errors: [],
            };
        }
        catch (error) {
            errors.push(error instanceof Error ? error.message : 'Unknown completion error');
            return {
                completions: [],
                cacheKey: null,
                cacheExpiry: null,
                errors,
            };
        }
    }
    async generateBashScript() {
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
            shellType: models_1.ShellType.BASH,
            content: script,
            filename: 'scaffold-completion.bash',
            installPath: await this.getInstallPath(models_1.ShellType.BASH),
        };
    }
    async generateZshScript() {
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
            shellType: models_1.ShellType.ZSH,
            content: script,
            filename: '_scaffold', // Use underscore prefix for zsh completion files
            installPath: await this.getInstallPath(models_1.ShellType.ZSH),
        };
    }
    async generateFishScript() {
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
            shellType: models_1.ShellType.FISH,
            content: script,
            filename: 'scaffold.fish',
            installPath: await this.getInstallPath(models_1.ShellType.FISH),
        };
    }
    async getInstallPath(shellType) {
        const homeDir = os.homedir();
        switch (shellType) {
            case models_1.ShellType.BASH:
                return path.join(homeDir, '.scaffold', 'completion-bash.sh');
            case models_1.ShellType.ZSH:
                return path.join(homeDir, '.scaffold', 'completions', '_scaffold');
            case models_1.ShellType.FISH:
                const fishDir = path.join(homeDir, '.config', 'fish', 'completions');
                await fs.ensureDir(fishDir);
                return path.join(fishDir, 'scaffold.fish');
            default:
                throw new Error(`Unsupported shell type: ${shellType}`);
        }
    }
    async writeCompletionScript(shellType, script, installPath) {
        await fs.ensureDir(path.dirname(installPath));
        await fs.writeFile(installPath, script, 'utf-8');
        // Make script executable for bash/zsh
        if (shellType !== models_1.ShellType.FISH) {
            await fs.chmod(installPath, 0o755);
        }
    }
    async addToShellConfig(shellType, installPath) {
        const homeDir = os.homedir();
        let configFile;
        let sourceCommand;
        switch (shellType) {
            case models_1.ShellType.BASH:
                configFile = path.join(homeDir, '.bashrc');
                sourceCommand = `source "${installPath}"`;
                break;
            case models_1.ShellType.ZSH:
                configFile = path.join(homeDir, '.zshrc');
                const completionDir = path.dirname(installPath);
                sourceCommand = `fpath=(${completionDir} $fpath)`;
                break;
            case models_1.ShellType.FISH:
                // Fish auto-loads from completions directory
                return;
            default:
                throw new Error(`Unsupported shell type: ${shellType}`);
        }
        // Check if already configured
        if (await fs.pathExists(configFile)) {
            const content = await fs.readFile(configFile, 'utf-8');
            // For zsh, check if fpath already contains our directory
            if (shellType === models_1.ShellType.ZSH) {
                const completionDir = path.dirname(installPath);
                if (content.includes(completionDir)) {
                    return; // Already configured
                }
                // Insert fpath before compinit
                const lines = content.split('\n');
                const compInitIndex = lines.findIndex(line => line.includes('compinit'));
                if (compInitIndex > 0) {
                    // Insert before compinit
                    lines.splice(compInitIndex, 0, '# Scaffold CLI completion', sourceCommand);
                    await fs.writeFile(configFile, lines.join('\n'), 'utf-8');
                }
                else {
                    // No compinit found, append to start of file
                    await fs.writeFile(configFile, `# Scaffold CLI completion\n${sourceCommand}\n\n${content}`, 'utf-8');
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
    async removeFromShellConfig(shellType, installPath) {
        const homeDir = os.homedir();
        let configFile;
        switch (shellType) {
            case models_1.ShellType.BASH:
                configFile = path.join(homeDir, '.bashrc');
                break;
            case models_1.ShellType.ZSH:
                configFile = path.join(homeDir, '.zshrc');
                break;
            case models_1.ShellType.FISH:
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
        const filteredLines = lines.filter(line => !line.includes(installPath) &&
            !line.includes('# Scaffold CLI completion'));
        await fs.writeFile(configFile, filteredLines.join('\n'), 'utf-8');
    }
    async saveCompletionConfig(config) {
        await this.ensureDirectoriesExist();
        const configPath = path.join(this.configDir, `completion-${config.shellType}.json`);
        await fs.writeJson(configPath, config, { spaces: 2 });
    }
    async removeCompletionConfig(shellType) {
        const configPath = path.join(this.configDir, `completion-${shellType}.json`);
        if (await fs.pathExists(configPath)) {
            await fs.remove(configPath);
        }
    }
    async getScaffoldVersion() {
        try {
            // Try to read version from package.json
            const packagePath = path.join(__dirname, '..', '..', 'package.json');
            if (await fs.pathExists(packagePath)) {
                const pkg = await fs.readJson(packagePath);
                return pkg.version || '1.0.0';
            }
        }
        catch (error) {
            // Ignore error, use default
        }
        return '1.0.0';
    }
    parseCommandLine(context) {
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
        const nonFlagWords = [];
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
    async getOptionCompletions(command, subcommand, context) {
        const registry = command_registry_1.CommandRegistry.getInstance();
        const commandPath = [];
        if (command)
            commandPath.push(command);
        if (subcommand)
            commandPath.push(subcommand);
        return registry.getCommandOptions(commandPath);
    }
    async getOptionValueCompletions(context) {
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
            }
            catch (error) {
                // If template loading fails, return empty array
                return [];
            }
        }
        return [];
    }
    async getCommandCompletions(command, subcommand, context) {
        const registry = command_registry_1.CommandRegistry.getInstance();
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
            return templates.map((t) => t.value);
        }
        // If we have both command and subcommand, get sub-subcommands
        const subSubcommands = registry.getSubcommands(`${command} ${subcommand}`);
        // Don't return empty array which causes fallback to main commands
        // Return empty array only if explicitly no completions are available
        return subSubcommands;
    }
    filterAndSortSuggestions(suggestions, currentWord) {
        if (!currentWord) {
            return suggestions.sort();
        }
        return suggestions
            .filter(suggestion => suggestion.startsWith(currentWord))
            .sort();
    }
    async getCompletionScript(shellType) {
        return this.generateCompletionScript(shellType);
    }
    async ensureDirectoriesExist() {
        await fs.ensureDir(this.configDir);
        await fs.ensureDir(this.cacheDir);
    }
}
exports.CompletionService = CompletionService;
//# sourceMappingURL=completion-service.js.map