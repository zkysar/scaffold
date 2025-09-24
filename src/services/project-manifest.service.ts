/**
 * Project manifest service - handles manifest CRUD operations
 */

import * as path from 'path';

import { injectable, inject } from 'tsyringe';

import { logger } from '@/lib/logger';
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

  async loadProjectManifest(
    projectPath: string
  ): Promise<ProjectManifest | null> {
    return this.getProjectManifest(projectPath);
  }

  async saveProjectManifest(
    projectPath: string,
    manifest: ProjectManifest
  ): Promise<void> {
    await this.updateProjectManifest(projectPath, manifest);
  }

  /**
   * Get project manifest from a project directory
   */
  async getProjectManifest(
    projectPath: string
  ): Promise<ProjectManifest | null> {
    if (!projectPath || typeof projectPath !== 'string') {
      throw new Error('Project path must be a non-empty string');
    }

    // First try the exact path provided
    const directManifestPath = this.fileService.resolvePath(
      projectPath,
      '.scaffold',
      'manifest.json'
    );

    try {
      if (await this.fileService.exists(directManifestPath)) {
        const manifestData =
          await this.fileService.readJson<ProjectManifest>(directManifestPath);
        return manifestData;
      }

      // If not found, search upward for the nearest manifest
      const nearestManifest = await this.findNearestManifest(projectPath);
      if (nearestManifest) {
        const manifestData = await this.fileService.readJson<ProjectManifest>(
          nearestManifest.manifestPath
        );
        return manifestData;
      }

      return null;
    } catch (error) {
      throw new Error(
        `Failed to read project manifest from '${projectPath}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update project manifest in a project directory
   */
  async updateProjectManifest(
    projectPath: string,
    manifest: ProjectManifest
  ): Promise<void> {
    if (!projectPath || typeof projectPath !== 'string') {
      throw new Error('Project path must be a non-empty string');
    }

    if (!manifest || typeof manifest !== 'object') {
      throw new Error('Manifest must be a valid object');
    }

    // Skip manifest writes in dry-run mode
    if (this.fileService.isDryRun) {
      logger.info(`[DRY RUN] Would update project manifest in: ${projectPath}`);
      return;
    }

    // Use the actual project root where the manifest exists
    // This ensures we update the correct manifest location
    const nearestManifest = await this.findNearestManifest(projectPath);
    const actualProjectPath = nearestManifest?.projectPath || projectPath;
    const manifestPath = this.fileService.resolvePath(
      actualProjectPath,
      '.scaffold',
      'manifest.json'
    );

    try {
      // Ensure the .scaffold directory exists
      await this.fileService.ensureDirectory(
        this.fileService.resolvePath(actualProjectPath, '.scaffold')
      );

      // Validate manifest structure before writing
      if (!manifest.version || !manifest.projectName) {
        throw new Error(
          'Manifest missing required fields: version, projectName'
        );
      }

      await this.fileService.writeJson(manifestPath, manifest, {
        spaces: 2,
        atomic: true,
        createParentDirs: true,
        overwrite: true,
      });
    } catch (error) {
      throw new Error(
        `Failed to write project manifest to '${actualProjectPath}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Find the nearest project manifest by searching upward from the given path
   */
  async findNearestManifest(
    startPath: string
  ): Promise<{ manifestPath: string; projectPath: string } | null> {
    let currentPath = this.fileService.resolvePath(startPath);

    // Limit search to prevent infinite loops (e.g., max 20 levels up)
    const maxLevels = 20;
    let level = 0;

    while (level < maxLevels) {
      const manifestPath = this.fileService.resolvePath(
        currentPath,
        '.scaffold',
        'manifest.json'
      );

      if (await this.fileService.exists(manifestPath)) {
        return { manifestPath, projectPath: currentPath };
      }

      // Check if we've reached the root
      const parentPath = path.dirname(currentPath);
      if (parentPath === currentPath) {
        break; // Reached root directory
      }

      currentPath = parentPath;
      level++;
    }

    return null;
  }
}
