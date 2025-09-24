import type {
  IProjectValidationService,
} from '@/services/project-validation.service';
import type {
  ValidationReport,
  ValidationError,
  ValidationWarning,
} from '@/models';

export class FakeProjectValidationService implements IProjectValidationService {
  private validationReports: Map<string, ValidationReport> = new Map();
  private shouldThrowError: string | null = null;
  private nextReturnValue: any = null;

  reset(): void {
    this.validationReports.clear();
    this.shouldThrowError = null;
    this.nextReturnValue = null;
  }

  setError(message: string): void {
    this.shouldThrowError = message;
  }

  setReturnValue(value: any): void {
    this.nextReturnValue = value;
  }

  setValidationReport(projectPath: string, report: ValidationReport): void {
    this.validationReports.set(projectPath, report);
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

  async validateProject(projectPath: string): Promise<ValidationReport> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    if (this.validationReports.has(projectPath)) {
      return this.validationReports.get(projectPath)!;
    }

    // Return a default valid report
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

  async findNearestManifest(
    startPath: string
  ): Promise<{ manifestPath: string; projectPath: string } | null> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== undefined) return returnValue;

    // Default behavior - return null (no manifest found)
    return null;
  }

  // Test helpers
  createError(path: string, message: string): ValidationError {
    return {
      id: 'error-' + Date.now(),
      severity: 'error',
      templateSha: 'test-template-sha',
      ruleId: 'test-rule',
      path,
      expected: 'expected-value',
      actual: 'actual-value',
      message,
    };
  }

  createWarning(path: string, message: string): ValidationWarning {
    return {
      id: 'warning-' + Date.now(),
      template: 'test-template',
      path,
      message,
    };
  }

  getStoredReports(): ValidationReport[] {
    return Array.from(this.validationReports.values());
  }
}