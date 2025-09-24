/**
 * Project fix service - handles fixing project structure issues
 */

import { randomUUID } from 'crypto';
import { injectable, inject } from 'tsyringe';
import type {
  ValidationReport,
  ValidationError,
  ValidationWarning,
  ValidationStats,
  ProjectManifest,
  HistoryEntry,
} from '../models';
import type { ITemplateService } from './template-service';
import { TemplateService } from './template-service';
import type { IFileSystemService } from './file-system.service';
import { FileSystemService } from './file-system.service';
import type { IProjectValidationService } from './project-validation.service';
import { ProjectValidationService } from './project-validation.service';
import type { IVariableSubstitutionService } from './variable-substitution.service';
import { VariableSubstitutionService } from './variable-substitution.service';
import type { IProjectManifestService } from './project-manifest.service';
import { ProjectManifestService } from './project-manifest.service';

export interface IProjectFixService {
  /**
   * Fix project structure issues based on validation report
   */
  fixProject(projectPath: string, dryRun?: boolean): Promise<ValidationReport>;
}

@injectable()
export class ProjectFixService implements IProjectFixService {
  constructor(
    @inject(TemplateService) private readonly templateService: ITemplateService,
    @inject(FileSystemService) private readonly fileService: IFileSystemService,
    @inject(ProjectValidationService) private readonly validationService: IProjectValidationService,
    @inject(VariableSubstitutionService) private readonly variableService: IVariableSubstitutionService,
    @inject(ProjectManifestService) private readonly manifestService: IProjectManifestService
  ) {}

  async fixProject(
    projectPath: string,
    dryRun?: boolean
  ): Promise<ValidationReport> {
    if (!projectPath || typeof projectPath !== 'string') {
      throw new Error('Project path must be a non-empty string');
    }

    const startTime = Date.now();
    const reportId = randomUUID();
    const timestamp = new Date().toISOString();

    try {
      // Set dry-run mode on file service
      const originalDryRun = this.fileService.isDryRun;
      if (dryRun) {
        this.fileService.setDryRun(true);
      }

      try {
        // First, get validation report to see what needs fixing
        const validationReport =
          await this.validationService.validateProject(projectPath);

        if (validationReport.valid) {
          // Project is already valid, return the report
          return validationReport;
        }

        const manifest = await this.manifestService.getProjectManifest(projectPath);
        if (!manifest) {
          throw new Error(`No project manifest found at '${projectPath}'`);
        }

        // Find the actual project root where the manifest is located
        const nearestManifest =
          await this.validationService.findNearestManifest(projectPath);
        const actualProjectPath = nearestManifest?.projectPath || projectPath;

        const fixedErrors: ValidationError[] = [];
        const remainingErrors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [...validationReport.warnings];
        let filesFixed = 0;
        let foldersFixed = 0;

        // Process each error and try to fix it
        for (const error of validationReport.errors) {
          try {
            if (error.fix?.autoFix) {
              const fullPath = this.fileService.resolvePath(
                actualProjectPath,
                error.path
              );

              if (error.fix.action === 'create') {
                if (error.ruleId === 'required_folder') {
                  await this.fileService.createDirectory(fullPath);
                  foldersFixed++;
                } else if (error.ruleId === 'required_file') {
                  // Get the template to recreate the file properly
                  const template = await this.templateService.getTemplate(
                    error.templateSha
                  );
                  const file = template.files.find(f => {
                    const rootFolderPath =
                      this.variableService.substituteInPath(
                        template.rootFolder,
                        manifest.variables
                      );
                    const relativePath = this.variableService.substituteInPath(
                      f.path,
                      manifest.variables
                    );
                    const fullPath =
                      rootFolderPath === '.'
                        ? relativePath
                        : `${rootFolderPath}/${relativePath}`;
                    return fullPath === error.path;
                  });

                  let content = error.fix.content || '';

                  if (file) {
                    if (file.content) {
                      content = file.content;
                    } else if (file.sourcePath) {
                      // Read from template source file
                      const templatePath = await this.findTemplateBySHA(
                        template.id
                      );
                      if (templatePath) {
                        const sourceFilePath = this.fileService.resolvePath(
                          templatePath,
                          'files',
                          file.sourcePath
                        );
                        if (await this.fileService.exists(sourceFilePath)) {
                          content =
                            await this.fileService.readFile(sourceFilePath);
                        }
                      }
                    }

                    // Apply variable substitution if enabled
                    if (file.variables !== false && content) {
                      content = this.variableService.substituteVariables(
                        content,
                        manifest.variables
                      );
                    }
                  }

                  await this.fileService.createFile(fullPath, content, {
                    overwrite: true,
                  });
                  filesFixed++;
                }

                fixedErrors.push({ ...error, fixApplied: true });
              } else {
                // Cannot auto-fix this error
                remainingErrors.push(error);
              }
            } else {
              // Fix requires manual intervention
              remainingErrors.push(error);

              if (error.fix?.message) {
                warnings.push({
                  id: randomUUID(),
                  template: 'fix',
                  path: error.path,
                  message: `Manual fix required: ${error.fix.message}`,
                  suggestion: error.suggestion,
                });
              }
            }
          } catch (fixError) {
            // Failed to fix this error
            remainingErrors.push(error);
            warnings.push({
              id: randomUUID(),
              template: 'fix',
              path: error.path,
              message: `Failed to fix error: ${fixError instanceof Error ? fixError.message : 'Unknown error'}`,
              suggestion: 'Manual intervention required',
            });
          }
        }

        // Update project manifest with fix history
        // Only update manifest if not in dry-run mode and there were actual fixes
        if (
          !dryRun &&
          (fixedErrors.length > 0 ||
            remainingErrors.length !== validationReport.errors.length)
        ) {
          try {
            const historyEntry: HistoryEntry = {
              id: randomUUID(),
              timestamp: new Date().toISOString(),
              action: 'check',
              user: process.env.USER || 'unknown',
              changes: fixedErrors.map(error => ({
                id: randomUUID(),
                type: 'added' as const,
                path: error.path,
                reason: `Fixed: ${error.message}`,
              })),
            };

            manifest.history.push(historyEntry);
            manifest.updated = new Date().toISOString();
            await this.manifestService.updateProjectManifest(actualProjectPath, manifest);
          } catch (manifestError) {
            // If manifest update fails, add it as a warning but don't fail the entire fix operation
            warnings.push({
              id: randomUUID(),
              template: 'fix',
              path: '.scaffold/manifest.json',
              message: `Failed to update project manifest: ${manifestError instanceof Error ? manifestError.message : 'Unknown error'}`,
              suggestion: 'Check file permissions for .scaffold/manifest.json',
            });
          }
        }

        const executionTime = Date.now() - startTime;
        const stats: ValidationStats = {
          filesChecked: validationReport.stats?.filesChecked || 0,
          foldersChecked: validationReport.stats?.foldersChecked || 0,
          templatesChecked: validationReport.stats?.templatesChecked || 0,
          errorsFound: remainingErrors.length,
          warningsFound: warnings.length,
          executionTime,
          rulesEvaluated: 0,
          errorCount: remainingErrors.length,
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
          valid: remainingErrors.length === 0,
          errors: remainingErrors,
          warnings,
          suggestions: [
            fixedErrors.length > 0
              ? `Fixed ${fixedErrors.length} errors (${filesFixed} files, ${foldersFixed} folders)`
              : '',
            remainingErrors.length > 0
              ? `${remainingErrors.length} errors require manual attention`
              : '',
            dryRun ? 'This was a dry run - no changes were made' : '',
          ].filter(s => s.length > 0),
          stats,
        };
      } finally {
        // Restore original dry-run mode
        this.fileService.setDryRun(originalDryRun);
      }
    } catch (error) {
      throw new Error(
        `Failed to fix project at '${projectPath}': ${error instanceof Error ? error.message : 'Unknown error'}`
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
