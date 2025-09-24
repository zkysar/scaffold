/**
 * Project extension service - handles extending projects with additional templates
 */

import { randomUUID } from 'crypto';
import { injectable, inject } from 'tsyringe';
import type {
  ProjectManifest,
  Template,
  AppliedTemplate,
  HistoryEntry,
} from '@/models';
import type { ITemplateService } from '@/services/template-service';
import { TemplateService } from '@/services/template-service';
import type { IFileSystemService } from '@/services/file-system.service';
import { FileSystemService } from '@/services/file-system.service';
import type { IVariableSubstitutionService } from '@/services/variable-substitution.service';
import { VariableSubstitutionService } from '@/services/variable-substitution.service';
import type { IProjectManifestService } from '@/services/project-manifest.service';
import { ProjectManifestService } from '@/services/project-manifest.service';
import type { IProjectValidationService } from '@/services/project-validation.service';
import { ProjectValidationService } from '@/services/project-validation.service';

export interface IProjectExtensionService {
  /**
   * Extend existing project with additional templates
   */
  extendProject(
    projectPath: string,
    templateIds: string[],
    variables?: Record<string, string>
  ): Promise<ProjectManifest>;
}

@injectable()
export class ProjectExtensionService implements IProjectExtensionService {
  constructor(
    @inject(TemplateService) private readonly templateService: ITemplateService,
    @inject(FileSystemService) private readonly fileService: IFileSystemService,
    @inject(VariableSubstitutionService) private readonly variableService: IVariableSubstitutionService,
    @inject(ProjectManifestService) private readonly manifestService: IProjectManifestService,
    @inject(ProjectValidationService) private readonly validationService: IProjectValidationService
  ) {}

  async extendProject(
    projectPath: string,
    templateIds: string[],
    variables?: Record<string, string>
  ): Promise<ProjectManifest> {
    if (!projectPath || typeof projectPath !== 'string') {
      throw new Error('Project path must be a non-empty string');
    }

    if (!Array.isArray(templateIds) || templateIds.length === 0) {
      throw new Error('At least one template ID must be provided');
    }

    try {
      // Load existing project manifest
      const manifest = await this.manifestService.getProjectManifest(projectPath);
      if (!manifest) {
        throw new Error(
          `No project manifest found at '${projectPath}'. This directory is not a scaffold-managed project.`
        );
      }

      // Find the actual project root where the manifest is located
      const nearestManifest = await this.validationService.findNearestManifest(projectPath);
      const actualProjectPath = nearestManifest?.projectPath || projectPath;

      // Merge variables with existing ones
      const allVariables = {
        ...(manifest.variables || {}),
        ...(variables || {}),
      };

      // Validate all templates exist and collect them
      const templates: Template[] = [];
      const resolvedIdentifiers: string[] = [];
      for (const templateId of templateIds) {
        const template = await this.templateService.getTemplate(templateId);
        templates.push(template);
        // Track which identifier was used (could be alias or SHA)
        resolvedIdentifiers.push(templateId);
      }

      // Check for rootFolder conflicts with existing templates
      const existingRootFolders = new Set<string>();
      for (const appliedTemplate of manifest.templates) {
        if (appliedTemplate.status === 'active') {
          existingRootFolders.add(appliedTemplate.rootFolder);
        }
      }

      // Check for conflicts between new templates and existing ones
      const newRootFolders = new Set<string>();
      for (const template of templates) {
        const rootFolder = this.variableService.substituteInPath(
          template.rootFolder,
          allVariables
        );
        if (existingRootFolders.has(rootFolder)) {
          throw new Error(
            `Template conflict: Template '${template.name}' uses rootFolder '${rootFolder}' which is already used by an existing template in this project.`
          );
        }
        if (newRootFolders.has(rootFolder)) {
          throw new Error(
            `Template conflict: Multiple new templates use the same rootFolder '${rootFolder}'. Templates must use unique root folders.`
          );
        }
        newRootFolders.add(rootFolder);
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

      // Apply each new template
      for (let i = 0; i < templates.length; i++) {
        const template = templates[i];
        const originalIdentifier = resolvedIdentifiers[i];
        await this.applyTemplate(template, actualProjectPath, allVariables);

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

      // Update variables in manifest
      manifest.variables = allVariables;

      // Create history entry
      const historyEntry: HistoryEntry = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        action: 'extend',
        templates: templates.map(t => t.id),
        user: process.env.USER || 'unknown',
        changes: templates.map(template => ({
          id: randomUUID(),
          type: 'added',
          path: template.id,
          reason: 'Template extended to project',
        })),
      };
      manifest.history.push(historyEntry);

      // Update manifest with final timestamp
      manifest.updated = new Date().toISOString();

      // Save manifest
      await this.manifestService.updateProjectManifest(actualProjectPath, manifest);

      return manifest;
    } catch (error) {
      throw new Error(
        `Failed to extend project at '${projectPath}': ${error instanceof Error ? error.message : 'Unknown error'}`
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
