/**
 * Project service facade - delegates to specialized services following SRP
 */

import type { ProjectManifest, ValidationReport } from '../models';
import type { ITemplateService } from './template-service';
import type { IFileSystemService } from './file-system.service';
import type { IConfigurationService } from './configuration.service';
import {
  ProjectCreationService,
  type IProjectCreationService,
} from './project-creation.service';
import {
  ProjectValidationService,
  type IProjectValidationService,
} from './project-validation.service';
import {
  ProjectFixService,
  type IProjectFixService,
} from './project-fix.service';
import {
  ProjectManifestService,
  type IProjectManifestService,
} from './project-manifest.service';
import {
  ProjectExtensionService,
  type IProjectExtensionService,
} from './project-extension.service';

export interface IProjectService {
  /**
   * Create a new project from a template
   */
  createProject(
    projectName: string,
    templateIds: string[],
    targetPath: string,
    variables?: Record<string, string>
  ): Promise<ProjectManifest>;

  /**
   * Validate project structure against applied templates
   */
  validateProject(projectPath: string): Promise<ValidationReport>;

  /**
   * Fix project structure issues based on validation report
   */
  fixProject(projectPath: string, dryRun?: boolean): Promise<ValidationReport>;

  /**
   * Extend existing project with additional templates
   */
  extendProject(
    projectPath: string,
    templateIds: string[],
    variables?: Record<string, string>
  ): Promise<ProjectManifest>;

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
   * Clean up temporary files and caches for a project
   */
  cleanProject(projectPath?: string): Promise<void>;
}

export class ProjectService implements IProjectService {
  private readonly creationService: IProjectCreationService;
  private readonly validationService: IProjectValidationService;
  private readonly fixService: IProjectFixService;
  private readonly manifestService: IProjectManifestService;
  private readonly extensionService: IProjectExtensionService;

  constructor(
    private readonly templateService: ITemplateService,
    private readonly fileService: IFileSystemService,
    private readonly configService?: IConfigurationService
  ) {
    // Initialize specialized services
    this.manifestService = new ProjectManifestService(this.fileService);
    this.creationService = new ProjectCreationService(
      this.templateService,
      this.fileService
    );
    this.validationService = new ProjectValidationService(
      this.templateService,
      this.fileService,
      this.manifestService.getProjectManifest.bind(this.manifestService)
    );
    this.fixService = new ProjectFixService(
      this.templateService,
      this.fileService,
      this.validationService,
      this.manifestService.getProjectManifest.bind(this.manifestService),
      this.manifestService.updateProjectManifest.bind(this.manifestService)
    );
    this.extensionService = new ProjectExtensionService(
      this.templateService,
      this.fileService,
      this.manifestService.getProjectManifest.bind(this.manifestService),
      this.manifestService.updateProjectManifest.bind(this.manifestService),
      this.manifestService.findNearestManifest.bind(this.manifestService)
    );
  }

  async createProject(
    projectName: string,
    templateIds: string[],
    targetPath: string,
    variables?: Record<string, string>
  ): Promise<ProjectManifest> {
    const manifest = await this.creationService.createProject(
      projectName,
      templateIds,
      targetPath,
      variables
    );

    // Save the manifest using the manifest service
    await this.manifestService.updateProjectManifest(targetPath, manifest);

    return manifest;
  }

  async validateProject(projectPath: string): Promise<ValidationReport> {
    return this.validationService.validateProject(projectPath);
  }

  async fixProject(
    projectPath: string,
    dryRun?: boolean
  ): Promise<ValidationReport> {
    return this.fixService.fixProject(projectPath, dryRun);
  }

  async extendProject(
    projectPath: string,
    templateIds: string[],
    variables?: Record<string, string>
  ): Promise<ProjectManifest> {
    return this.extensionService.extendProject(
      projectPath,
      templateIds,
      variables
    );
  }

  async loadProjectManifest(
    projectPath: string
  ): Promise<ProjectManifest | null> {
    return this.manifestService.loadProjectManifest(projectPath);
  }

  async getProjectManifest(
    projectPath: string
  ): Promise<ProjectManifest | null> {
    return this.manifestService.getProjectManifest(projectPath);
  }

  async saveProjectManifest(
    projectPath: string,
    manifest: ProjectManifest
  ): Promise<void> {
    await this.manifestService.saveProjectManifest(projectPath, manifest);
  }

  async cleanProject(projectPath?: string): Promise<void> {
    const targetPath = projectPath || process.cwd();
    const resolvedPath = this.fileService.resolvePath(targetPath);

    try {
      const cleanupTasks: Array<{
        type: string;
        path: string;
        action: () => Promise<void>;
      }> = [];

      // 1. Clean up .scaffold-temp directory if it exists
      const scaffoldTempPath = this.fileService.resolvePath(
        resolvedPath,
        '.scaffold-temp'
      );
      if (await this.fileService.exists(scaffoldTempPath)) {
        cleanupTasks.push({
          type: 'temp-directory',
          path: scaffoldTempPath,
          action: async () => {
            await this.fileService.deletePath(scaffoldTempPath, {
              recursive: true,
              force: true,
            });
          },
        });
      }

      // 2. Find and clean up backup files (*.scaffold-backup)
      try {
        const entries = await this.fileService.readDirectory(resolvedPath);
        for (const entry of entries) {
          if (entry.endsWith('.scaffold-backup')) {
            const backupFilePath = this.fileService.resolvePath(
              resolvedPath,
              entry
            );
            cleanupTasks.push({
              type: 'backup-file',
              path: backupFilePath,
              action: async () => {
                await this.fileService.deletePath(backupFilePath, {
                  force: true,
                });
              },
            });
          }
        }
      } catch (error) {
        // Directory might not be readable or might not exist, which is acceptable
        // Only warn if this is a real error and not just "directory doesn't exist"
        if (await this.fileService.exists(resolvedPath)) {
          // Directory exists but couldn't read it - this might be a permission issue
          // We'll continue with other cleanup tasks
        }
      }

      // 3. Clean up any cached template data in global temp directory
      const globalTempPath = this.fileService.resolvePath(
        process.cwd(),
        '.scaffold-temp'
      );
      if (await this.fileService.exists(globalTempPath)) {
        cleanupTasks.push({
          type: 'global-temp',
          path: globalTempPath,
          action: async () => {
            await this.fileService.deletePath(globalTempPath, {
              recursive: true,
              force: true,
            });
          },
        });
      }

      // Execute cleanup tasks
      if (cleanupTasks.length === 0) {
        if (this.fileService.isDryRun) {
          console.log(
            '[DRY RUN] No temporary files or backup files found to clean'
          );
        }
        return;
      }

      if (this.fileService.isDryRun) {
        console.log(`[DRY RUN] Would clean ${cleanupTasks.length} items:`);
        for (const task of cleanupTasks) {
          console.log(`[DRY RUN]   - ${task.type}: ${task.path}`);
        }
        return;
      }

      // Check if we should log verbose output based on configuration
      const shouldLogVerbose =
        this.configService?.get<boolean>('preferences.verboseOutput') || false;

      if (shouldLogVerbose) {
        console.log(`Cleaning up ${cleanupTasks.length} temporary items...`);
      }

      for (const task of cleanupTasks) {
        try {
          if (shouldLogVerbose) {
            console.log(`  Cleaning ${task.type}: ${task.path}`);
          }
          await task.action();
        } catch (cleanupError) {
          // Log the error but continue with other cleanup tasks
          if (shouldLogVerbose) {
            console.log(
              `  Warning: Failed to clean ${task.type} at ${task.path}: ${cleanupError instanceof Error ? cleanupError.message : 'Unknown error'}`
            );
          }
        }
      }

      if (shouldLogVerbose) {
        console.log('Cleanup completed successfully');
      }
    } catch (error) {
      throw new Error(
        `Failed to clean project at '${resolvedPath}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
