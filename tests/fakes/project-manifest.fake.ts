import type {
  IProjectManifestService,
} from '@/services/project-manifest.service';
import type {
  ProjectManifest,
} from '@/models';

export class FakeProjectManifestService implements IProjectManifestService {
  private manifests: Map<string, ProjectManifest> = new Map();
  private shouldThrowError: string | null = null;
  private nextReturnValue: any = undefined;

  reset(): void {
    this.manifests.clear();
    this.shouldThrowError = null;
    this.nextReturnValue = undefined;
  }

  setError(message: string): void {
    this.shouldThrowError = message;
  }

  setReturnValue(value: any): void {
    this.nextReturnValue = value;
  }

  setManifest(projectPath: string, manifest: ProjectManifest): void {
    this.manifests.set(projectPath, manifest);
  }

  private checkError(): void {
    if (this.shouldThrowError) {
      const error = this.shouldThrowError;
      this.shouldThrowError = null;
      throw new Error(error);
    }
  }

  private checkReturnValue(): any {
    if (this.nextReturnValue !== undefined) {
      const value = this.nextReturnValue;
      this.nextReturnValue = undefined;
      return value;
    }
    return undefined;
  }

  async loadProjectManifest(projectPath: string): Promise<ProjectManifest | null> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== undefined) return returnValue;

    return this.manifests.get(projectPath) || null;
  }

  async getProjectManifest(projectPath: string): Promise<ProjectManifest | null> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== undefined) return returnValue;

    return this.manifests.get(projectPath) || null;
  }

  async saveProjectManifest(projectPath: string, manifest: ProjectManifest): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    this.manifests.set(projectPath, manifest);
  }

  async updateProjectManifest(
    projectPath: string,
    manifest: ProjectManifest
  ): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    this.manifests.set(projectPath, manifest);
  }

  async findNearestManifest(
    startPath: string
  ): Promise<{ manifestPath: string; projectPath: string } | null> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== undefined) return returnValue;

    // Check if we have a manifest for this path or any parent path
    let currentPath = startPath;
    while (currentPath && currentPath !== '/') {
      if (this.manifests.has(currentPath)) {
        return {
          manifestPath: `${currentPath}/.scaffold/manifest.json`,
          projectPath: currentPath,
        };
      }
      const parent = currentPath.split('/').slice(0, -1).join('/');
      currentPath = parent || '/';
    }

    return null;
  }

  // Test helpers
  getStoredManifests(): Map<string, ProjectManifest> {
    return new Map(this.manifests);
  }

  hasManifest(projectPath: string): boolean {
    return this.manifests.has(projectPath);
  }
}