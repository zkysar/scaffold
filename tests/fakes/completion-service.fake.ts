import type {
  ICompletionService,
} from '@/services/completion-service';
import type {
  CompletionConfig,
  CompletionContext,
  CompletionResult,
  ShellCompletionScript,
  ShellType,
} from '@/models';

export class FakeCompletionService implements ICompletionService {
  private completionConfigs: Map<ShellType, CompletionConfig> = new Map();
  private shouldThrowError: string | null = null;
  private nextReturnValue: any = null;
  private detectedShell: ShellType = 'bash' as ShellType;

  reset(): void {
    this.completionConfigs.clear();
    this.shouldThrowError = null;
    this.nextReturnValue = null;
    this.detectedShell = 'bash' as ShellType;
  }

  setError(message: string): void {
    this.shouldThrowError = message;
  }

  setReturnValue(value: any): void {
    this.nextReturnValue = value;
  }

  setDetectedShell(shell: ShellType): void {
    this.detectedShell = shell;
  }

  setCompletionConfig(shell: ShellType, config: CompletionConfig): void {
    this.completionConfigs.set(shell, config);
  }

  private checkError(): void {
    if (this.shouldThrowError) {
      const error = this.shouldThrowError;
      this.shouldThrowError = null;
      throw new Error(error);
    }
  }

  private checkReturnValue(): any {
    if (this.nextReturnValue !== null) {
      const value = this.nextReturnValue;
      this.nextReturnValue = null;
      return value;
    }
    return null;
  }

  async detectShell(): Promise<ShellType> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    return this.detectedShell;
  }

  async generateCompletionScript(shellType: ShellType): Promise<ShellCompletionScript> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    return {
      shellType,
      content: `# Fake completion script for ${shellType}`,
      installInstructions: `Add to your ${shellType} config`,
    };
  }

  async installCompletion(shellType?: ShellType, force?: boolean): Promise<CompletionConfig> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    const shell = shellType || this.detectedShell;
    const config: CompletionConfig = {
      shellType: shell,
      installedVersion: '1.0.0',
      installPath: `/fake/path/completion.${shell}`,
      installDate: new Date(),
      isEnabled: true,
      isInstalled: true,
    };

    this.completionConfigs.set(shell, config);
    return config;
  }

  async uninstallCompletion(shellType?: ShellType): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    const shell = shellType || this.detectedShell;
    this.completionConfigs.delete(shell);
  }

  async getCompletionStatus(shellType?: ShellType): Promise<CompletionConfig> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    const shell = shellType || this.detectedShell;
    return this.completionConfigs.get(shell) || {
      shellType: shell,
      installedVersion: null,
      installPath: null,
      installDate: null,
      isEnabled: false,
      isInstalled: false,
    };
  }

  async generateCompletions(context: CompletionContext): Promise<CompletionResult> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    return {
      suggestions: [],
      hasMore: false,
    };
  }

  async getCompletionScript(shellType: ShellType): Promise<ShellCompletionScript> {
    return this.generateCompletionScript(shellType);
  }

  // Test helpers
  getStoredConfigs(): Map<ShellType, CompletionConfig> {
    return new Map(this.completionConfigs);
  }
}