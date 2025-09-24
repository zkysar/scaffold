/**
 * Project validation service - handles project structure validation
 */

import { randomUUID } from 'crypto';
import * as path from 'path';

import { injectable, inject } from 'tsyringe';

import { shortSHA } from '@/lib/sha';
import type {
  ValidationReport,
  ValidationError,
  ValidationWarning,
  ValidationStats,
} from '@/models';
import type { IFileSystemService } from '@/services/file-system.service';
import { FileSystemService } from '@/services/file-system.service';
import type { IProjectManifestService } from '@/services/project-manifest.service';
import { ProjectManifestService } from '@/services/project-manifest.service';
import type { ITemplateService } from '@/services/template-service';
import { TemplateService } from '@/services/template-service';

export interface IProjectValidationService {
  /**
   * Validate project structure against applied templates
   */
  validateProject(projectPath: string): Promise<ValidationReport>;

  /**
   * Find the nearest project manifest by searching upward from the given path
   */
  findNearestManifest(
    startPath: string
  ): Promise<{ manifestPath: string; projectPath: string } | null>;
}

@injectable()
export class ProjectValidationService implements IProjectValidationService {
  constructor(
    @inject(TemplateService) private readonly templateService: ITemplateService,
    @inject(FileSystemService) private readonly fileService: IFileSystemService,
    @inject(VariableSubstitutionService)
    private readonly variableService: IVariableSubstitutionService,
    @inject(ProjectManifestService)
    private readonly manifestService: IProjectManifestService
  ) {}

  async validateProject(projectPath: string): Promise<ValidationReport> {
    if (!projectPath || typeof projectPath !== 'string') {
      throw new Error('Project path must be a non-empty string');
    }

    const startTime = Date.now();
    const reportId = randomUUID();
    const timestamp = new Date().toISOString();

    try {
      // Load project manifest and find the actual project root
      const manifest =
        await this.manifestService.getProjectManifest(projectPath);
      if (!manifest) {
        throw new Error(
          `No project manifest found at '${projectPath}'. This directory is not a scaffold-managed project.`
        );
      }

      // Find the actual project root where the manifest is located
      const nearestManifest = await this.findNearestManifest(projectPath);
      const actualProjectPath = nearestManifest?.projectPath || projectPath;

      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      let filesChecked = 0;
      let foldersChecked = 0;
      let templatesChecked = 0;

      // Validate each applied template
      for (const appliedTemplate of manifest.templates) {
        if (appliedTemplate.status !== 'active') {
          continue;
        }

        templatesChecked++;

        try {
          const template = await this.templateService.getTemplate(
            appliedTemplate.templateSha
          );

          // Check required folders exist
          for (const folder of template.folders) {
            foldersChecked++;
            // Paths are now relative to rootFolder, so prepend it
            const rootFolderPath = this.variableService.substituteInPath(
              template.rootFolder,
              manifest.variables
            );
            const relativePath = this.variableService.substituteInPath(
              folder.path,
              manifest.variables
            );
            const folderPath =
              rootFolderPath === '.'
                ? relativePath
                : `${rootFolderPath}/${relativePath}`;
            const fullFolderPath = this.fileService.resolvePath(
              actualProjectPath,
              folderPath
            );

            if (!(await this.fileService.exists(fullFolderPath))) {
              errors.push({
                id: randomUUID(),
                severity: 'error',
                templateSha: template.id,
                ruleId: 'required_folder',
                path: folderPath,
                expected: 'Directory to exist',
                actual: 'Directory does not exist',
                message: `Required directory '${folderPath}' does not exist`,
                fix: {
                  action: 'create',
                  autoFix: true,
                },
              });
            } else if (!(await this.fileService.isDirectory(fullFolderPath))) {
              errors.push({
                id: randomUUID(),
                severity: 'error',
                templateSha: template.id,
                ruleId: 'required_folder',
                path: folderPath,
                expected: 'Path to be a directory',
                actual: 'Path exists but is not a directory',
                message: `Path '${folderPath}' exists but is not a directory`,
                fix: {
                  action: 'delete',
                  message: 'Remove the file and create directory',
                  autoFix: false,
                },
              });
            }
          }

          // Check required files exist
          for (const file of template.files) {
            filesChecked++;
            // Paths are now relative to rootFolder, so prepend it
            const rootFolderPath = this.variableService.substituteInPath(
              template.rootFolder,
              manifest.variables
            );
            const relativePath = this.variableService.substituteInPath(
              file.path,
              manifest.variables
            );
            const filePath =
              rootFolderPath === '.'
                ? relativePath
                : `${rootFolderPath}/${relativePath}`;
            const fullFilePath = this.fileService.resolvePath(
              actualProjectPath,
              filePath
            );

            if (!(await this.fileService.exists(fullFilePath))) {
              errors.push({
                id: randomUUID(),
                severity: 'error',
                templateSha: template.id,
                ruleId: 'required_file',
                path: filePath,
                expected: 'File to exist',
                actual: 'File does not exist',
                message: `Required file '${filePath}' does not exist`,
                fix: {
                  action: 'create',
                  content: file.content || '',
                  autoFix: true,
                },
              });
            } else if (!(await this.fileService.isFile(fullFilePath))) {
              errors.push({
                id: randomUUID(),
                severity: 'error',
                templateSha: template.id,
                ruleId: 'required_file',
                path: filePath,
                expected: 'Path to be a file',
                actual: 'Path exists but is not a file',
                message: `Path '${filePath}' exists but is not a file`,
                fix: {
                  action: 'delete',
                  message: 'Remove the directory and create file',
                  autoFix: false,
                },
              });
            }
          }

          // Check template rules
          for (const rule of template.rules.rules) {
            // Rules targets are also relative to rootFolder now
            const rootFolderPath = this.variableService.substituteInPath(
              template.rootFolder,
              manifest.variables
            );
            const relativeTarget = this.variableService.substituteInPath(
              rule.target,
              manifest.variables
            );
            const rulePath =
              rootFolderPath === '.'
                ? relativeTarget
                : `${rootFolderPath}/${relativeTarget}`;
            const fullRulePath = this.fileService.resolvePath(
              actualProjectPath,
              rulePath
            );

            if (
              rule.type === 'required_file' &&
              !(await this.fileService.exists(fullRulePath))
            ) {
              const validationError: ValidationError = {
                id: randomUUID(),
                severity: rule.severity === 'error' ? 'error' : 'critical',
                templateSha: template.id,
                ruleId: rule.id,
                path: rulePath,
                expected: rule.description,
                actual: 'File does not exist',
                message: `Rule '${rule.name}' failed: ${rule.description}`,
                fix: rule.fix,
              };

              if (rule.severity === 'error') {
                errors.push(validationError);
              }
            } else if (
              rule.type === 'required_folder' &&
              !(await this.fileService.exists(fullRulePath))
            ) {
              const validationError: ValidationError = {
                id: randomUUID(),
                severity: rule.severity === 'error' ? 'error' : 'critical',
                templateSha: template.id,
                ruleId: rule.id,
                path: rulePath,
                expected: rule.description,
                actual: 'Folder does not exist',
                message: `Rule '${rule.name}' failed: ${rule.description}`,
                fix: rule.fix,
              };

              if (rule.severity === 'error') {
                errors.push(validationError);
              }
            } else if (
              rule.type === 'forbidden_file' &&
              (await this.fileService.exists(fullRulePath))
            ) {
              const validationError: ValidationError = {
                id: randomUUID(),
                severity: rule.severity === 'error' ? 'error' : 'critical',
                templateSha: template.id,
                ruleId: rule.id,
                path: rulePath,
                expected: 'File should not exist',
                actual: 'File exists',
                message: `Rule '${rule.name}' failed: ${rule.description}`,
                fix: rule.fix,
              };

              if (rule.severity === 'error') {
                errors.push(validationError);
              } else {
                warnings.push({
                  id: randomUUID(),
                  template: template.name,
                  path: rulePath,
                  message: rule.description,
                  suggestion: 'Consider removing this file',
                });
              }
            }
          }
        } catch (error) {
          // Template not found or invalid
          warnings.push({
            id: randomUUID(),
            template: appliedTemplate.name,
            path: shortSHA(appliedTemplate.templateSha),
            message: `Template '${shortSHA(appliedTemplate.templateSha)}' could not be loaded`,
            suggestion:
              error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Check for extra files if strictMode is enabled in any template
      const hasStrictTemplate = manifest.templates.some(
        async appliedTemplate => {
          try {
            const template = await this.templateService.getTemplate(
              appliedTemplate.templateSha
            );
            return template.rules.strictMode;
          } catch {
            return false;
          }
        }
      );

      if (hasStrictTemplate) {
        warnings.push({
          id: randomUUID(),
          template: 'system',
          path: actualProjectPath,
          message: 'Strict mode validation for extra files not yet implemented',
          suggestion: 'Extra file detection will be added in future versions',
        });
      }

      const executionTime = Date.now() - startTime;
      const stats: ValidationStats = {
        filesChecked,
        foldersChecked,
        templatesChecked,
        errorsFound: errors.length,
        warningsFound: warnings.length,
        executionTime,
        rulesEvaluated: 0, // Will be implemented when rule evaluation is added
        errorCount: errors.length,
        warningCount: warnings.length,
        duration: executionTime,
      };

      return {
        id: reportId,
        timestamp,
        projectId: manifest.id,
        projectName: manifest.projectName,
        projectPath: actualProjectPath,
        templates: manifest.templates
          .filter(t => t.status === 'active')
          .map(t => t.templateSha),
        valid: errors.length === 0,
        errors,
        warnings,
        suggestions: [],
        stats,
      };
    } catch (error) {
      throw new Error(
        `Failed to validate project at '${projectPath}': ${error instanceof Error ? error.message : 'Unknown error'}`
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
