import type {
  IProjectExtensionService,
} from '@/services/project-extension.service';
import type {
  ProjectManifest,
} from '@/models';

export class FakeProjectExtensionService implements IProjectExtensionService {
  private extendedProjects: Array<{
    projectPath: string;
    templateIds: string[];
    variables?: Record<string, string>;
  }> = [];
  private shouldThrowError: string | null = null;
  private nextReturnValue: any = null;

  reset(): void {
    this.extendedProjects = [];
    this.shouldThrowError = null;
    this.nextReturnValue = null;
  }

  setError(message: string): void {
    this.shouldThrowError = message;
  }

  setReturnValue(value: any): void {
    this.nextReturnValue = value;
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

  async extendProject(
    projectPath: string,
    templateIds: string[],
    variables?: Record<string, string>
  ): Promise<ProjectManifest> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    this.extendedProjects.push({ projectPath, templateIds, variables });

    const manifest: ProjectManifest = {
      id: 'project-' + Date.now(),
      version: '1.0.0',
      projectName: 'extended-project',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      templates: templateIds.map(id => ({
        templateSha: 'sha-' + id,
        name: id,
        version: '1.0.0',
        rootFolder: projectPath,
        appliedAt: new Date().toISOString(),
        status: 'active' as const,
        conflicts: [],
      })),
      variables: variables || {},
      history: [
        {
          id: 'history-' + Date.now(),
          action: 'extend' as const,
          timestamp: new Date().toISOString(),
          templates: templateIds,
          changes: [],
        },
      ],
    };

    return manifest;
  }

  // Test helpers
  getExtendedProjects() {
    return this.extendedProjects;
  }
}