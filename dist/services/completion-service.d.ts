/**
 * Service for managing shell completion installation and generation
 */
import type { CompletionConfig, CompletionContext, CompletionResult, ShellCompletionScript } from '../models';
import { ShellType } from '../models';
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
export declare class CompletionService implements ICompletionService {
    private readonly configDir;
    private readonly cacheDir;
    private readonly templateService;
    constructor();
    detectShell(): Promise<ShellType>;
    generateCompletionScript(shellType: ShellType): Promise<ShellCompletionScript>;
    installCompletion(shellType?: ShellType, force?: boolean): Promise<CompletionConfig>;
    uninstallCompletion(shellType?: ShellType): Promise<void>;
    getCompletionStatus(shellType?: ShellType): Promise<CompletionConfig>;
    generateCompletions(context: CompletionContext): Promise<CompletionResult>;
    private generateBashScript;
    private generateZshScript;
    private generateFishScript;
    private getInstallPath;
    private writeCompletionScript;
    private addToShellConfig;
    private removeFromShellConfig;
    private saveCompletionConfig;
    private removeCompletionConfig;
    private getScaffoldVersion;
    private parseCommandLine;
    private getOptionCompletions;
    private getOptionValueCompletions;
    private getCommandCompletions;
    private filterAndSortSuggestions;
    getCompletionScript(shellType: ShellType): Promise<ShellCompletionScript>;
    private ensureDirectoriesExist;
}
//# sourceMappingURL=completion-service.d.ts.map