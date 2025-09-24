/**
 * Project creation service - handles new project creation and template application
 */

import { randomUUID } from 'crypto';

import { injectable, inject } from 'tsyringe';

import type {
  ProjectManifest,
  Template,
  AppliedTemplate,
  HistoryEntry,
} from '@/models';

import type { IFileSystemService } from './file-system.service';
import { FileSystemService } from './file-system.service';
import type { ITemplateService } from './template-service';
import { TemplateService } from './template-service';
import type { IVariableSubstitutionService } from './variable-substitution.service';
import { VariableSubstitutionService } from './variable-substitution.service';

export interface IProjectCreationService {
  /**
   * Create a new project from templates
   */
  createProject(
    projectName: string,
    templateIds: string[],
    targetPath: string,
    variables?: Record<string, string>,
    dryRun?: boolean
  ): Promise<ProjectManifest>;

  /**
   * Initialize a new project manifest
   */
  initializeProjectManifest(
    projectName: string,
    templateSha: string
  ): ProjectManifest;

  /**
   * Ensure project directory structure exists
   */
  ensureProjectDirectory(projectPath: string): Promise<void>;
}

@injectable()
export class ProjectCreationService implements IProjectCreationService {
  constructor(
    @inject(TemplateService) private readonly templateService: ITemplateService,
    @inject(FileSystemService) private readonly fileService: IFileSystemService,
    @inject(VariableSubstitutionService) private readonly variableService: IVariableSubstitutionService
  ) {}

  async createProject(
    projectName: string,
    templateIds: string[],
    targetPath: string,
    variables?: Record<string, string>,
    dryRun?: boolean
  ): Promise<ProjectManifest> {
    if (!projectName || typeof projectName !== 'string') {
      throw new Error('Project name must be a non-empty string');
    }

    if (!Array.isArray(templateIds) || templateIds.length === 0) {
      throw new Error('At least one template ID must be provided');
    }

    if (!targetPath || typeof targetPath !== 'string') {
      throw new Error('Target path must be a non-empty string');
    }

    const projectPath = targetPath;
    const allVariables = { ...(variables || {}), PROJECT_NAME: projectName };

    // Set dry-run mode on file service
    const originalDryRun = this.fileService.isDryRun;
    if (dryRun) {
      this.fileService.setDryRun(true);
    }

    try {
      // Validate all templates exist and collect them
      const templates: Template[] = [];
      const resolvedIdentifiers: string[] = [];
      for (const templateId of templateIds) {
        const template = await this.templateService.getTemplate(templateId);
        templates.push(template);
        // Track which identifier was used (could be alias or SHA)
        resolvedIdentifiers.push(templateId);
      }

      // Check for rootFolder conflicts between templates
      const rootFolders = new Set<string>();
      for (const template of templates) {
        const rootFolder = this.variableService.substituteInPath(
          template.rootFolder,
          allVariables
        );
        if (rootFolders.has(rootFolder)) {
          throw new Error(
            `Template conflict: Multiple templates use the same rootFolder '${rootFolder}'. Templates must use unique root folders.`
          );
        }
        rootFolders.add(rootFolder);
      }

      // Validate all required variables are provided
      for (const template of templates) {
        const validationResults =
          this.variableService.validateRequiredVariables(
            template,
            allVariables
          );
        const errors = validationResults.filter(
          r => !r.valid && r.severity === 'error'
        );
        if (errors.length > 0) {
          const errorMessages = errors.map(e => e.message).join('; ');
          throw new Error(
            `Template validation failed for '${template.name}': ${errorMessages}`
          );
        }
      }

      // Ensure project directory structure
      await this.ensureProjectDirectory(projectPath);

      // Initialize project manifest
      const manifest = this.initializeProjectManifest(
        projectName,
        templates[0].id
      );

      // Apply each template
      for (let i = 0; i < templates.length; i++) {
        const template = templates[i];
        const originalIdentifier = resolvedIdentifiers[i];
        await this.applyTemplate(template, projectPath, allVariables);

        // Track applied template in manifest
        const appliedTemplate: AppliedTemplate = {
          templateSha: template.id,
          templateAlias: template.aliases?.includes(originalIdentifier)
            ? originalIdentifier
            : undefined,
          name: template.name,
          version: template.version,
          rootFolder: this.variableService.substituteInPath(
            template.rootFolder,
            allVariables
          ),
          appliedBy: process.env.USER || 'unknown',
          appliedAt: new Date().toISOString(),
          status: 'active',
          conflicts: [],
        };
        manifest.templates.push(appliedTemplate);
      }

      // Store variables used
      manifest.variables = allVariables;

      // Create history entry
      const historyEntry: HistoryEntry = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        action: 'create',
        templates: templates.map(t => t.id),
        user: process.env.USER || 'unknown',
        changes: [
          {
            id: randomUUID(),
            type: 'added',
            path: projectPath,
            reason: 'Project created',
          },
        ],
      };
      manifest.history.push(historyEntry);

      // Update manifest with final timestamp
      manifest.updated = new Date().toISOString();

      return manifest;
    } catch (error) {
      throw new Error(
        `Failed to create project '${projectName}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      // Restore original dry-run mode
      this.fileService.setDryRun(originalDryRun);
    }
  }

  initializeProjectManifest(
    projectName: string,
    templateSha: string
  ): ProjectManifest {
    if (!projectName || typeof projectName !== 'string') {
      throw new Error('Project name must be a non-empty string');
    }

    if (!templateSha || typeof templateSha !== 'string') {
      throw new Error('Template SHA must be a non-empty string');
    }

    const now = new Date().toISOString();

    return {
      id: randomUUID(),
      version: '1.0.0',
      projectName,
      created: now,
      updated: now,
      templates: [],
      variables: {},
      history: [],
    };
  }

  async ensureProjectDirectory(projectPath: string): Promise<void> {
    if (!projectPath || typeof projectPath !== 'string') {
      throw new Error('Project path must be a non-empty string');
    }

    try {
      await this.fileService.ensureDirectory(projectPath);
      await this.fileService.ensureDirectory(
        this.fileService.resolvePath(projectPath, '.scaffold')
      );
    } catch (error) {
      throw new Error(
        `Failed to ensure project directory structure at '${projectPath}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Apply a template to a project directory
   */
  private async applyTemplate(
    template: Template,
    projectPath: string,
    variables: Record<string, string>
  ): Promise<void> {
    try {
      // Ensure rootFolder exists first
      const rootFolderPath = this.variableService.substituteInPath(
        template.rootFolder,
        variables
      );
      const fullRootFolderPath = this.fileService.resolvePath(
        projectPath,
        rootFolderPath
      );
      await this.fileService.createDirectory(fullRootFolderPath);

      // Create folders first
      for (const folder of template.folders) {
        // Paths are now relative to rootFolder, so prepend it
        const relativePath = this.variableService.substituteInPath(
          folder.path,
          variables
        );
        const folderPath =
          rootFolderPath === '.'
            ? relativePath
            : `${rootFolderPath}/${relativePath}`;
        const fullFolderPath = this.fileService.resolvePath(
          projectPath,
          folderPath
        );

        await this.fileService.createDirectory(fullFolderPath, {
          mode: folder.permissions
            ? parseInt(folder.permissions, 8)
            : undefined,
        });

        // Add .gitkeep if specified and directory is empty
        if (folder.gitkeep) {
          const gitkeepPath = this.fileService.resolvePath(
            fullFolderPath,
            '.gitkeep'
          );
          await this.fileService.createFile(gitkeepPath, '', {
            overwrite: false,
          });
        }
      }

      // Create files
      for (const file of template.files) {
        // Paths are now relative to rootFolder, so prepend it
        const relativePath = this.variableService.substituteInPath(
          file.path,
          variables
        );
        const filePath =
          rootFolderPath === '.'
            ? relativePath
            : `${rootFolderPath}/${relativePath}`;
        const fullFilePath = this.fileService.resolvePath(
          projectPath,
          filePath
        );

        let content = '';

        if (file.content) {
          // Use inline content
          content = file.content;
        } else if (file.sourcePath) {
          // Read from template source file
          const templatePath = await this.findTemplateBySHA(template.id);
          if (!templatePath) {
            throw new Error(
              `Template path not found for template '${template.id}'`
            );
          }

          const sourceFilePath = this.fileService.resolvePath(
            templatePath,
            'files',
            file.sourcePath
          );
          if (await this.fileService.exists(sourceFilePath)) {
            content = await this.fileService.readFile(sourceFilePath);
          }
        }

        // Apply variable substitution if enabled
        if (file.variables !== false && content) {
          content = this.variableService.substituteVariables(
            content,
            variables
          );
        }

        await this.fileService.createFile(fullFilePath, content, {
          mode: file.permissions ? parseInt(file.permissions, 8) : undefined,
          overwrite: true,
        });
      }
    } catch (error) {
      throw new Error(
        `Failed to apply template '${template.name}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Find template directory by ID
   */
  private async findTemplateBySHA(templateSha: string): Promise<string | null> {
    try {
      await this.templateService.getTemplate(templateSha);
      // The TemplateService should provide the path, but for now we'll reconstruct it
      // This is based on the pattern seen in TemplateService
      const templatesDir = this.fileService.resolvePath(
        process.env.HOME || process.env.USERPROFILE || '~',
        '.scaffold',
        'templates'
      );
      return this.fileService.resolvePath(templatesDir, templateSha);
    } catch (error) {
      return null;
    }
  }
}
