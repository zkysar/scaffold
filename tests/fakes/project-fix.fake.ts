import type {
  IProjectFixService,
} from '@/services/project-fix.service';
import type {
  ValidationReport,
} from '@/models';

export class FakeProjectFixService implements IProjectFixService {
  private fixReports: Map<string, ValidationReport> = new Map();
  private shouldThrowError: string | null = null;
  private nextReturnValue: any = null;
  private fixedProjects: string[] = [];
  private dryRunProjects: string[] = [];

  reset(): void {
    this.fixReports.clear();
    this.shouldThrowError = null;
    this.nextReturnValue = null;
    this.fixedProjects = [];
  }

  setError(message: string): void {
    this.shouldThrowError = message;
  }

  setReturnValue(value: any): void {
    this.nextReturnValue = value;
  }

  setFixReport(projectPath: string, report: ValidationReport): void {
    this.fixReports.set(projectPath, report);
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

  async fixProject(
    projectPath: string,
    dryRun?: boolean
  ): Promise<ValidationReport> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    if (dryRun) {
      this.dryRunProjects.push(projectPath);
    } else {
      this.fixedProjects.push(projectPath);
    }

    if (this.fixReports.has(projectPath)) {
      return this.fixReports.get(projectPath)!;
    }

    // Return a default successful validation report after fixing
    return {
      id: 'validation-' + Date.now(),
      timestamp: new Date().toISOString(),
      projectPath,
      valid: true,
      errors: [],
      warnings: [],
      stats: {
        filesChecked: 10,
        foldersChecked: 5,
        templatesChecked: 1,
        errorsFound: 0,
        warningsFound: 0,
        executionTime: 100,
        rulesEvaluated: 10,
        errorCount: 0,
        warningCount: 0,
        duration: 100,
      },
    };
  }

  // Test helpers
  getFixedProjects(): string[] {
    return this.fixedProjects;
  }

  getDryRunProjects(): string[] {
    return this.dryRunProjects;
  }

  getStoredReports(): ValidationReport[] {
    return Array.from(this.fixReports.values());
  }
}