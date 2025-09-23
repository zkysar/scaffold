import type {
  IConfigurationService,
} from '@/services/configuration.service';
import type {
  Configuration,
  ConfigurationLevel,
} from '@/models';

export class FakeConfigurationService implements IConfigurationService {
  private configurations: Map<string, Configuration> = new Map();
  private shouldThrowError: string | null = null;
  private nextReturnValue: any = null;

  reset(): void {
    this.configurations.clear();
    this.shouldThrowError = null;
    this.nextReturnValue = null;
  }

  setError(message: string): void {
    this.shouldThrowError = message;
  }

  setReturnValue(value: any): void {
    this.nextReturnValue = value;
  }

  setConfiguration(level: ConfigurationLevel, config: Configuration): void {
    this.configurations.set(level, config);
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

  async loadConfiguration(level: ConfigurationLevel): Promise<Configuration> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    return this.configurations.get(level) || {
      level,
      settings: {},
      overrides: {},
    };
  }

  async saveConfiguration(
    level: ConfigurationLevel,
    config: Configuration
  ): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    this.configurations.set(level, config);
  }

  async getMergedConfiguration(projectPath?: string): Promise<Configuration> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    // Merge configurations in order: global -> workspace -> project
    const global = this.configurations.get('global') || { level: 'global', settings: {}, overrides: {} };
    const workspace = this.configurations.get('workspace') || { level: 'workspace', settings: {}, overrides: {} };
    const project = this.configurations.get('project') || { level: 'project', settings: {}, overrides: {} };

    return {
      level: 'project',
      settings: {
        ...global.settings,
        ...workspace.settings,
        ...project.settings,
      },
      overrides: {
        ...global.overrides,
        ...workspace.overrides,
        ...project.overrides,
      },
    };
  }

  async getSetting<T = any>(key: string, projectPath?: string): Promise<T | undefined> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== undefined) return returnValue;

    const config = await this.getMergedConfiguration(projectPath);
    return config.settings[key] as T;
  }

  async setSetting<T = any>(
    key: string,
    value: T,
    level: ConfigurationLevel
  ): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    const config = this.configurations.get(level) || {
      level,
      settings: {},
      overrides: {},
    };

    config.settings[key] = value;
    this.configurations.set(level, config);
  }

  // Test helpers
  getStoredConfigurations(): Map<string, Configuration> {
    return new Map(this.configurations);
  }
}