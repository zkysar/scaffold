import type {
  IProjectCreationService,
} from '@/services/project-creation.service';
import type {
  ProjectManifest,
} from '@/models';

export class FakeProjectCreationService implements IProjectCreationService {
  private manifests: Map<string, ProjectManifest> = new Map();
  private shouldThrowError: string | null = null;
  private nextReturnValue: any = null;
  private createdProjects: Array<{
    projectName: string;
    templateIds: string[];
    targetPath: string;
    variables?: Record<string, string>;
  }> = [];

  reset(): void {
    this.manifests.clear();
    this.shouldThrowError = null;
    this.nextReturnValue = null;
    this.createdProjects = [];
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

  async createProject(
    projectName: string,
    templateIds: string[],
    targetPath: string,
    variables?: Record<string, string>
  ): Promise<ProjectManifest> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    this.createdProjects.push({ projectName, templateIds, targetPath, variables });

    const manifest: ProjectManifest = {
      version: '1.0.0',
      projectName,
      templates: templateIds.map(id => ({
        templateId: id,
        appliedAt: new Date().toISOString(),
        variables: variables || {},
      })),
      variables: variables || {},
      history: [
        {
          action: 'create',
          timestamp: new Date().toISOString(),
          templateIds,
          description: `Created project with templates: ${templateIds.join(', ')}`,
        },
      ],
    };

    this.manifests.set(targetPath, manifest);
    return manifest;
  }

  initializeProjectManifest(
    projectName: string,
    templateSha: string
  ): ProjectManifest {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    return {
      version: '1.0.0',
      projectName,
      templates: [
        {
          templateId: templateSha,
          appliedAt: new Date().toISOString(),
          variables: {},
        },
      ],
      variables: {},
      history: [
        {
          action: 'create',
          timestamp: new Date().toISOString(),
          templateIds: [templateSha],
          description: `Initialized project with template ${templateSha}`,
        },
      ],
    };
  }

  async ensureProjectDirectory(projectPath: string): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    // Fake implementation - just track that it was called
  }

  // Test helpers
  getCreatedProjects() {
    return this.createdProjects;
  }

  getManifest(path: string): ProjectManifest | undefined {
    return this.manifests.get(path);
  }
}