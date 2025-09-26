/**
 * Project manifest service - handles manifest CRUD operations
 */

import { injectable, inject } from 'tsyringe';

import type { ProjectManifest } from '@/models';
import type { IFileSystemService } from '@/services/file-system.service';
import { FileSystemService } from '@/services/file-system.service';

export interface IProjectManifestService {
  /**
   * Load project manifest from directory (.scaffold/manifest.json)
   */
  loadProjectManifest(projectPath: string): Promise<ProjectManifest | null>;

  /**
   * Get project manifest from directory (.scaffold/manifest.json)
   */
  getProjectManifest(projectPath: string): Promise<ProjectManifest | null>;

  /**
   * Save project manifest to directory (.scaffold/manifest.json)
   */
  saveProjectManifest(
    projectPath: string,
    manifest: ProjectManifest
  ): Promise<void>;

  /**
   * Update project manifest in a project directory
   */
  updateProjectManifest(
    projectPath: string,
    manifest: ProjectManifest
  ): Promise<void>;

  /**
   * Find the nearest project manifest by searching upward from the given path
   */
  findNearestManifest(
    startPath: string
  ): Promise<{ manifestPath: string; projectPath: string } | null>;
}

@injectable()
export class ProjectManifestService implements IProjectManifestService {
  constructor(
    @inject(FileSystemService) private readonly fileService: IFileSystemService
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async loadProjectManifest(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    projectPath: string
  ): Promise<ProjectManifest | null> {
    throw new Error('Method not implemented');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async saveProjectManifest(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    projectPath: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    manifest: ProjectManifest
  ): Promise<void> {
    throw new Error('Method not implemented');
  }

  /**
   * Get project manifest from a project directory
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getProjectManifest(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    projectPath: string
  ): Promise<ProjectManifest | null> {
    throw new Error('Method not implemented');
  }

  /**
   * Update project manifest in a project directory
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateProjectManifest(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    projectPath: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    manifest: ProjectManifest
  ): Promise<void> {
    throw new Error('Method not implemented');
  }

  /**
   * Find the nearest project manifest by searching upward from the given path
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async findNearestManifest(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    startPath: string
  ): Promise<{ manifestPath: string; projectPath: string } | null> {
    throw new Error('Method not implemented');
  }
}
