import type {
  IProjectManifestService,
} from '@/services/project-manifest.service';
import type {
  ProjectManifest,
} from '@/models';

export class FakeProjectManifestService implements IProjectManifestService {
  private manifests: Map<string, ProjectManifest> = new Map();
  private shouldThrowError: string | null = null;
  private nextReturnValue: any = null;

  reset(): void {
    this.manifests.clear();
    this.shouldThrowError = null;
    this.nextReturnValue = null;
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
    if (this.nextReturnValue !== null) {
      const value = this.nextReturnValue;
      this.nextReturnValue = null;
      return value;
    }
    return null;
  }

  async loadManifest(projectPath: string): Promise<ProjectManifest | null> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== undefined) return returnValue;

    return this.manifests.get(projectPath) || null;
  }

  async saveManifest(projectPath: string, manifest: ProjectManifest): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    this.manifests.set(projectPath, manifest);
  }

  async updateManifest(
    projectPath: string,
    updates: Partial<ProjectManifest>
  ): Promise<ProjectManifest> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    const existing = this.manifests.get(projectPath) || {
      version: '1.0.0',
      projectName: 'default-project',
      templates: [],
      variables: {},
      history: [],
    };

    const updated = { ...existing, ...updates };
    this.manifests.set(projectPath, updated);
    return updated;
  }

  async findManifest(
    startPath: string
  ): Promise<{ manifestPath: string; manifest: ProjectManifest } | null> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== undefined) return returnValue;

    // Check if we have a manifest for this path
    const manifest = this.manifests.get(startPath);
    if (manifest) {
      return {
        manifestPath: `${startPath}/.scaffold/manifest.json`,
        manifest,
      };
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