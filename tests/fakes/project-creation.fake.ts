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
      id: 'project-' + Date.now(),
      version: '1.0.0',
      projectName,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      templates: templateIds.map(id => ({
        templateSha: id,
        name: 'Template Name',
        version: '1.0.0',
        rootFolder: projectName,
        appliedAt: new Date().toISOString(),
        status: 'active' as const,
        conflicts: [],
      })),
      variables: variables || {},
      history: [
        {
          id: 'history-' + Date.now(),
          action: 'create',
          timestamp: new Date().toISOString(),
          templates: templateIds,
          changes: [],
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
      id: 'project-' + Date.now(),
      version: '1.0.0',
      projectName,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      templates: [
        {
          templateSha: templateSha,
          name: 'Template Name',
          version: '1.0.0',
          rootFolder: projectName,
          appliedAt: new Date().toISOString(),
          status: 'active' as const,
          conflicts: [],
        },
      ],
      variables: {},
      history: [
        {
          id: 'history-' + Date.now(),
          action: 'create',
          timestamp: new Date().toISOString(),
          templates: [templateSha],
          changes: [],
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