import type {
  IProjectFixService,
} from '@/services/project-fix.service';
import type {
  ValidationReport,
  FixReport,
} from '@/models';

export class FakeProjectFixService implements IProjectFixService {
  private fixReports: Map<string, FixReport> = new Map();
  private shouldThrowError: string | null = null;
  private nextReturnValue: any = null;
  private fixedProjects: string[] = [];

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

  setFixReport(projectPath: string, report: FixReport): void {
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
    validationReport: ValidationReport,
    autoOnly?: boolean
  ): Promise<FixReport> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    this.fixedProjects.push(projectPath);

    if (this.fixReports.has(projectPath)) {
      return this.fixReports.get(projectPath)!;
    }

    // Return a default successful fix report
    return {
      id: 'fix-' + Date.now(),
      timestamp: new Date().toISOString(),
      projectPath,
      validationReportId: validationReport.id,
      fixes: validationReport.errors.filter(e => e.autoFixable || !autoOnly).map(error => ({
        path: error.path,
        action: 'fixed',
        description: `Fixed: ${error.message}`,
        success: true,
      })),
      skipped: autoOnly ? validationReport.errors.filter(e => !e.autoFixable).map(error => ({
        path: error.path,
        reason: 'Manual fix required',
      })) : [],
      failed: [],
      stats: {
        totalIssues: validationReport.errors.length,
        fixedIssues: validationReport.errors.filter(e => e.autoFixable || !autoOnly).length,
        skippedIssues: autoOnly ? validationReport.errors.filter(e => !e.autoFixable).length : 0,
        failedFixes: 0,
        duration: 50,
      },
    };
  }

  // Test helpers
  getFixedProjects(): string[] {
    return this.fixedProjects;
  }

  getStoredReports(): FixReport[] {
    return Array.from(this.fixReports.values());
  }
}