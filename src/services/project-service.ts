/**
 * Project service for project creation, validation, and management
 */

import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';
import type {
  ProjectManifest,
  ValidationReport,
  ValidationError,
  ValidationWarning,
  ValidationStats,
  Template,
  TemplateVariable,
  AppliedTemplate,
  HistoryEntry,
  ChangeRecord,
} from '../models';
import type { ITemplateService } from './template-service';
import type { IFileSystemService } from './file-system.service';
import type { IConfigurationService } from './configuration.service';
import { VariableSubstitutionService } from './variable-substitution.service';

export interface IProjectService {
  /**
   * Create a new project from a template
   */
  createProject(projectName: string, templateIds: string[], targetPath: string, variables?: Record<string, string>): Promise<ProjectManifest>;

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
  extendProject(projectPath: string, templateIds: string[], variables?: Record<string, string>): Promise<ProjectManifest>;

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
  saveProjectManifest(projectPath: string, manifest: ProjectManifest): Promise<void>;

  /**
   * Clean up temporary files and caches for a project
   */
  cleanProject(projectPath?: string): Promise<void>;
}

export class ProjectService implements IProjectService {
  private readonly variableService: VariableSubstitutionService;

  constructor(
    private readonly templateService: ITemplateService,
    private readonly fileService: IFileSystemService,
    private readonly configService?: IConfigurationService,
  ) {
    this.variableService = new VariableSubstitutionService(this.fileService);
  }

  async createProject(projectName: string, templateIds: string[], targetPath: string, variables?: Record<string, string>): Promise<ProjectManifest> {
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

    try {
      // Validate all templates exist and collect them
      const templates: Template[] = [];
      for (const templateId of templateIds) {
        const template = await this.templateService.getTemplate(templateId);
        templates.push(template);
      }

      // Check for rootFolder conflicts between templates
      const rootFolders = new Set<string>();
      for (const template of templates) {
        const rootFolder = this.variableService.substituteInPath(template.rootFolder, allVariables);
        if (rootFolders.has(rootFolder)) {
          throw new Error(`Template conflict: Multiple templates use the same rootFolder '${rootFolder}'. Templates must use unique root folders.`);
        }
        rootFolders.add(rootFolder);
      }

      // Validate all required variables are provided
      for (const template of templates) {
        const validationResults = this.variableService.validateRequiredVariables(template, allVariables);
        const errors = validationResults.filter(r => !r.valid && r.severity === 'error');
        if (errors.length > 0) {
          const errorMessages = errors.map(e => e.message).join('; ');
          throw new Error(`Template validation failed for '${template.name}': ${errorMessages}`);
        }
      }

      // Ensure project directory structure
      await this.ensureProjectDirectory(projectPath);

      // Initialize project manifest
      const manifest = this.initializeProjectManifest(projectName, templateIds[0]);

      // Apply each template
      for (const template of templates) {
        await this.applyTemplate(template, projectPath, allVariables);

        // Track applied template in manifest
        const appliedTemplate: AppliedTemplate = {
          templateId: template.id,
          name: template.name,
          version: template.version,
          rootFolder: this.variableService.substituteInPath(template.rootFolder, allVariables),
          appliedBy: process.env.USER || 'unknown',
          appliedAt: new Date().toISOString(),
          status: 'active',
          conflicts: []
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
        templates: templateIds,
        user: process.env.USER || 'unknown',
        changes: [{
          id: randomUUID(),
          type: 'added',
          path: projectPath,
          reason: 'Project created'
        }]
      };
      manifest.history.push(historyEntry);

      // Update manifest with final timestamp
      manifest.updated = new Date().toISOString();

      // Save manifest
      await this.updateProjectManifest(projectPath, manifest);

      return manifest;
    } catch (error) {
      throw new Error(`Failed to create project '${projectName}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateProject(projectPath: string): Promise<ValidationReport> {
    if (!projectPath || typeof projectPath !== 'string') {
      throw new Error('Project path must be a non-empty string');
    }

    const startTime = Date.now();
    const reportId = randomUUID();
    const timestamp = new Date().toISOString();

    try {
      // Load project manifest and find the actual project root
      const manifest = await this.getProjectManifest(projectPath);
      if (!manifest) {
        throw new Error(`No project manifest found at '${projectPath}'. This directory is not a scaffold-managed project.`);
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
          const template = await this.templateService.getTemplate(appliedTemplate.templateId);

          // Check required folders exist
          for (const folder of template.folders) {
            foldersChecked++;
            const folderPath = this.variableService.substituteInPath(folder.path, manifest.variables);
            const fullFolderPath = this.fileService.resolvePath(actualProjectPath, folderPath);

            if (!await this.fileService.exists(fullFolderPath)) {
              errors.push({
                id: randomUUID(),
                severity: 'error',
                templateId: template.id,
                ruleId: 'required_folder',
                path: folderPath,
                expected: 'Directory to exist',
                actual: 'Directory does not exist',
                message: `Required directory '${folderPath}' does not exist`,
                fix: {
                  action: 'create',
                  autoFix: true
                }
              });
            } else if (!await this.fileService.isDirectory(fullFolderPath)) {
              errors.push({
                id: randomUUID(),
                severity: 'error',
                templateId: template.id,
                ruleId: 'required_folder',
                path: folderPath,
                expected: 'Path to be a directory',
                actual: 'Path exists but is not a directory',
                message: `Path '${folderPath}' exists but is not a directory`,
                fix: {
                  action: 'delete',
                  message: 'Remove the file and create directory',
                  autoFix: false
                }
              });
            }
          }

          // Check required files exist
          for (const file of template.files) {
            filesChecked++;
            const filePath = this.variableService.substituteInPath(file.path, manifest.variables);
            const fullFilePath = this.fileService.resolvePath(actualProjectPath, filePath);

            if (!await this.fileService.exists(fullFilePath)) {
              errors.push({
                id: randomUUID(),
                severity: 'error',
                templateId: template.id,
                ruleId: 'required_file',
                path: filePath,
                expected: 'File to exist',
                actual: 'File does not exist',
                message: `Required file '${filePath}' does not exist`,
                fix: {
                  action: 'create',
                  content: file.content || '',
                  autoFix: true
                }
              });
            } else if (!await this.fileService.isFile(fullFilePath)) {
              errors.push({
                id: randomUUID(),
                severity: 'error',
                templateId: template.id,
                ruleId: 'required_file',
                path: filePath,
                expected: 'Path to be a file',
                actual: 'Path exists but is not a file',
                message: `Path '${filePath}' exists but is not a file`,
                fix: {
                  action: 'delete',
                  message: 'Remove the directory and create file',
                  autoFix: false
                }
              });
            }
          }

          // Check template rules
          for (const rule of template.rules.rules) {
            const rulePath = this.variableService.substituteInPath(rule.target, manifest.variables);
            const fullRulePath = this.fileService.resolvePath(actualProjectPath, rulePath);

            if (rule.type === 'required_file' && !await this.fileService.exists(fullRulePath)) {
              const validationError: ValidationError = {
                id: randomUUID(),
                severity: rule.severity === 'error' ? 'error' : 'critical',
                templateId: template.id,
                ruleId: rule.id,
                path: rulePath,
                expected: rule.description,
                actual: 'File does not exist',
                message: `Rule '${rule.name}' failed: ${rule.description}`,
                fix: rule.fix
              };

              if (rule.severity === 'error') {
                errors.push(validationError);
              }
            } else if (rule.type === 'required_folder' && !await this.fileService.exists(fullRulePath)) {
              const validationError: ValidationError = {
                id: randomUUID(),
                severity: rule.severity === 'error' ? 'error' : 'critical',
                templateId: template.id,
                ruleId: rule.id,
                path: rulePath,
                expected: rule.description,
                actual: 'Folder does not exist',
                message: `Rule '${rule.name}' failed: ${rule.description}`,
                fix: rule.fix
              };

              if (rule.severity === 'error') {
                errors.push(validationError);
              }
            } else if (rule.type === 'forbidden_file' && await this.fileService.exists(fullRulePath)) {
              const validationError: ValidationError = {
                id: randomUUID(),
                severity: rule.severity === 'error' ? 'error' : 'critical',
                templateId: template.id,
                ruleId: rule.id,
                path: rulePath,
                expected: 'File should not exist',
                actual: 'File exists',
                message: `Rule '${rule.name}' failed: ${rule.description}`,
                fix: rule.fix
              };

              if (rule.severity === 'error') {
                errors.push(validationError);
              } else {
                warnings.push({
                  id: randomUUID(),
                  template: template.name,
                  path: rulePath,
                  message: rule.description,
                  suggestion: 'Consider removing this file'
                });
              }
            }
          }
        } catch (error) {
          // Template not found or invalid
          warnings.push({
            id: randomUUID(),
            template: appliedTemplate.name,
            path: appliedTemplate.templateId,
            message: `Template '${appliedTemplate.templateId}' could not be loaded`,
            suggestion: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Check for extra files if strictMode is enabled in any template
      const hasStrictTemplate = manifest.templates.some(async (appliedTemplate) => {
        try {
          const template = await this.templateService.getTemplate(appliedTemplate.templateId);
          return template.rules.strictMode;
        } catch {
          return false;
        }
      });

      if (hasStrictTemplate) {
        warnings.push({
          id: randomUUID(),
          template: 'system',
          path: actualProjectPath,
          message: 'Strict mode validation for extra files not yet implemented',
          suggestion: 'Extra file detection will be added in future versions'
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
        duration: executionTime
      };

      return {
        id: reportId,
        timestamp,
        projectId: manifest.id,
        projectName: manifest.projectName,
        projectPath: actualProjectPath,
        templates: manifest.templates.filter(t => t.status === 'active').map(t => t.templateId),
        valid: errors.length === 0,
        errors,
        warnings,
        suggestions: [],
        stats
      };
    } catch (error) {
      throw new Error(`Failed to validate project at '${projectPath}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async fixProject(projectPath: string, dryRun?: boolean): Promise<ValidationReport> {
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
        const validationReport = await this.validateProject(projectPath);

        if (validationReport.valid) {
          // Project is already valid, return the report
          return validationReport;
        }

        const manifest = await this.getProjectManifest(projectPath);
        if (!manifest) {
          throw new Error(`No project manifest found at '${projectPath}'`);
        }

        // Find the actual project root where the manifest is located
        const nearestManifest = await this.findNearestManifest(projectPath);
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
              const fullPath = this.fileService.resolvePath(actualProjectPath, error.path);

              if (error.fix.action === 'create') {
                if (error.ruleId === 'required_folder') {
                  await this.fileService.createDirectory(fullPath);
                  foldersFixed++;
                } else if (error.ruleId === 'required_file') {
                  // Get the template to recreate the file properly
                  const template = await this.templateService.getTemplate(error.templateId);
                  const file = template.files.find(f =>
                    this.variableService.substituteInPath(f.path, manifest.variables) === error.path
                  );

                  let content = error.fix.content || '';

                  if (file) {
                    if (file.content) {
                      content = file.content;
                    } else if (file.sourcePath) {
                      // Read from template source file
                      const templatePath = await this.findTemplateById(template.id);
                      if (templatePath) {
                        const sourceFilePath = this.fileService.resolvePath(templatePath, 'files', file.sourcePath);
                        if (await this.fileService.exists(sourceFilePath)) {
                          content = await this.fileService.readFile(sourceFilePath);
                        }
                      }
                    }

                    // Apply variable substitution if enabled
                    if (file.variables !== false && content) {
                      content = this.variableService.substituteVariables(content, manifest.variables);
                    }
                  }

                  await this.fileService.createFile(fullPath, content, { overwrite: true });
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
                  suggestion: error.suggestion
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
              suggestion: 'Manual intervention required'
            });
          }
        }

        // Update project manifest with fix history
        if (!dryRun && (fixedErrors.length > 0 || remainingErrors.length !== validationReport.errors.length)) {
          const historyEntry: HistoryEntry = {
            id: randomUUID(),
            timestamp: new Date().toISOString(),
            action: 'check',
            user: process.env.USER || 'unknown',
            changes: fixedErrors.map(error => ({
              id: randomUUID(),
              type: 'added' as const,
              path: error.path,
              reason: `Fixed: ${error.message}`
            }))
          };

          manifest.history.push(historyEntry);
          manifest.updated = new Date().toISOString();
          await this.updateProjectManifest(actualProjectPath, manifest);
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
          duration: executionTime
        };

        return {
          id: reportId,
          timestamp,
          projectId: manifest.id,
          projectName: manifest.projectName,
          projectPath: actualProjectPath,
          templates: manifest.templates.filter(t => t.status === 'active').map(t => t.templateId),
          valid: remainingErrors.length === 0,
          errors: remainingErrors,
          warnings,
          suggestions: [
            fixedErrors.length > 0 ? `Fixed ${fixedErrors.length} errors (${filesFixed} files, ${foldersFixed} folders)` : '',
            remainingErrors.length > 0 ? `${remainingErrors.length} errors require manual attention` : '',
            dryRun ? 'This was a dry run - no changes were made' : ''
          ].filter(s => s.length > 0),
          stats
        };
      } finally {
        // Restore original dry-run mode
        this.fileService.setDryRun(originalDryRun);
      }
    } catch (error) {
      throw new Error(`Failed to fix project at '${projectPath}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async extendProject(projectPath: string, templateIds: string[], variables?: Record<string, string>): Promise<ProjectManifest> {
    if (!projectPath || typeof projectPath !== 'string') {
      throw new Error('Project path must be a non-empty string');
    }

    if (!Array.isArray(templateIds) || templateIds.length === 0) {
      throw new Error('At least one template ID must be provided');
    }

    try {
      // Load existing project manifest
      const manifest = await this.getProjectManifest(projectPath);
      if (!manifest) {
        throw new Error(`No project manifest found at '${projectPath}'. This directory is not a scaffold-managed project.`);
      }

      // Find the actual project root where the manifest is located
      const nearestManifest = await this.findNearestManifest(projectPath);
      const actualProjectPath = nearestManifest?.projectPath || projectPath;

      // Merge variables with existing ones
      const allVariables = { ...(manifest.variables || {}), ...(variables || {}) };

      // Validate all templates exist and collect them
      const templates: Template[] = [];
      for (const templateId of templateIds) {
        const template = await this.templateService.getTemplate(templateId);
        templates.push(template);
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
        const rootFolder = this.variableService.substituteInPath(template.rootFolder, allVariables);
        if (existingRootFolders.has(rootFolder)) {
          throw new Error(`Template conflict: Template '${template.name}' uses rootFolder '${rootFolder}' which is already used by an existing template in this project.`);
        }
        if (newRootFolders.has(rootFolder)) {
          throw new Error(`Template conflict: Multiple new templates use the same rootFolder '${rootFolder}'. Templates must use unique root folders.`);
        }
        newRootFolders.add(rootFolder);
      }

      // Validate all required variables are provided
      for (const template of templates) {
        const validationResults = this.variableService.validateRequiredVariables(template, allVariables);
        const errors = validationResults.filter(r => !r.valid && r.severity === 'error');
        if (errors.length > 0) {
          const errorMessages = errors.map(e => e.message).join('; ');
          throw new Error(`Template validation failed for '${template.name}': ${errorMessages}`);
        }
      }

      // Apply each new template
      for (const template of templates) {
        await this.applyTemplate(template, actualProjectPath, allVariables);

        // Track applied template in manifest
        const appliedTemplate: AppliedTemplate = {
          templateId: template.id,
          name: template.name,
          version: template.version,
          rootFolder: this.variableService.substituteInPath(template.rootFolder, allVariables),
          appliedBy: process.env.USER || 'unknown',
          appliedAt: new Date().toISOString(),
          status: 'active',
          conflicts: []
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
        templates: templateIds,
        user: process.env.USER || 'unknown',
        changes: templateIds.map(templateId => ({
          id: randomUUID(),
          type: 'added',
          path: templateId,
          reason: 'Template extended to project'
        }))
      };
      manifest.history.push(historyEntry);

      // Update manifest with final timestamp
      manifest.updated = new Date().toISOString();

      // Save manifest
      await this.updateProjectManifest(actualProjectPath, manifest);

      return manifest;
    } catch (error) {
      throw new Error(`Failed to extend project at '${projectPath}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async loadProjectManifest(projectPath: string): Promise<ProjectManifest | null> {
    return this.getProjectManifest(projectPath);
  }

  async saveProjectManifest(projectPath: string, manifest: ProjectManifest): Promise<void> {
    await this.updateProjectManifest(projectPath, manifest);
  }

  async cleanProject(projectPath?: string): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * Find the nearest project manifest by searching upward from the given path
   */
  private async findNearestManifest(startPath: string): Promise<{ manifestPath: string; projectPath: string } | null> {
    let currentPath = this.fileService.resolvePath(startPath);

    // Limit search to prevent infinite loops (e.g., max 20 levels up)
    const maxLevels = 20;
    let level = 0;

    while (level < maxLevels) {
      const manifestPath = this.fileService.resolvePath(currentPath, '.scaffold', 'manifest.json');

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

  /**
   * Get project manifest from a project directory
   */
  async getProjectManifest(projectPath: string): Promise<ProjectManifest | null> {
    if (!projectPath || typeof projectPath !== 'string') {
      throw new Error('Project path must be a non-empty string');
    }

    // First try the exact path provided
    const directManifestPath = this.fileService.resolvePath(projectPath, '.scaffold', 'manifest.json');

    try {
      if (await this.fileService.exists(directManifestPath)) {
        const manifestData = await this.fileService.readJson<ProjectManifest>(directManifestPath);
        return manifestData;
      }

      // If not found, search upward for the nearest manifest
      const nearestManifest = await this.findNearestManifest(projectPath);
      if (nearestManifest) {
        const manifestData = await this.fileService.readJson<ProjectManifest>(nearestManifest.manifestPath);
        return manifestData;
      }

      return null;
    } catch (error) {
      throw new Error(`Failed to read project manifest from '${projectPath}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update project manifest in a project directory
   */
  async updateProjectManifest(projectPath: string, manifest: ProjectManifest): Promise<void> {
    if (!projectPath || typeof projectPath !== 'string') {
      throw new Error('Project path must be a non-empty string');
    }

    if (!manifest || typeof manifest !== 'object') {
      throw new Error('Manifest must be a valid object');
    }

    // Use the actual project root where the manifest exists
    // This ensures we update the correct manifest location
    const nearestManifest = await this.findNearestManifest(projectPath);
    const actualProjectPath = nearestManifest?.projectPath || projectPath;
    const manifestPath = this.fileService.resolvePath(actualProjectPath, '.scaffold', 'manifest.json');

    try {
      await this.fileService.writeJson(manifestPath, manifest, {
        spaces: 2,
        atomic: true,
        createParentDirs: true
      });
    } catch (error) {
      throw new Error(`Failed to write project manifest to '${actualProjectPath}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initialize a new project manifest
   */
  initializeProjectManifest(projectName: string, templateId: string): ProjectManifest {
    if (!projectName || typeof projectName !== 'string') {
      throw new Error('Project name must be a non-empty string');
    }

    if (!templateId || typeof templateId !== 'string') {
      throw new Error('Template ID must be a non-empty string');
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
      history: []
    };
  }

  /**
   * Ensure project directory structure exists
   */
  async ensureProjectDirectory(projectPath: string): Promise<void> {
    if (!projectPath || typeof projectPath !== 'string') {
      throw new Error('Project path must be a non-empty string');
    }

    try {
      await this.fileService.ensureDirectory(projectPath);
      await this.fileService.ensureDirectory(this.fileService.resolvePath(projectPath, '.scaffold'));
    } catch (error) {
      throw new Error(`Failed to ensure project directory structure at '${projectPath}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Apply a template to a project directory
   */
  private async applyTemplate(template: Template, projectPath: string, variables: Record<string, string>): Promise<void> {
    try {
      // Ensure rootFolder exists first
      const rootFolderPath = this.variableService.substituteInPath(template.rootFolder, variables);
      const fullRootFolderPath = this.fileService.resolvePath(projectPath, rootFolderPath);
      await this.fileService.createDirectory(fullRootFolderPath);

      // Create folders first
      for (const folder of template.folders) {
        const folderPath = this.variableService.substituteInPath(folder.path, variables);
        const fullFolderPath = this.fileService.resolvePath(projectPath, folderPath);

        await this.fileService.createDirectory(fullFolderPath, {
          mode: folder.permissions ? parseInt(folder.permissions, 8) : undefined
        });

        // Add .gitkeep if specified and directory is empty
        if (folder.gitkeep) {
          const gitkeepPath = this.fileService.resolvePath(fullFolderPath, '.gitkeep');
          await this.fileService.createFile(gitkeepPath, '', { overwrite: false });
        }
      }

      // Create files
      for (const file of template.files) {
        const filePath = this.variableService.substituteInPath(file.path, variables);
        const fullFilePath = this.fileService.resolvePath(projectPath, filePath);

        let content = '';

        if (file.content) {
          // Use inline content
          content = file.content;
        } else if (file.sourcePath) {
          // Read from template source file
          const templatePath = await this.findTemplateById(template.id);
          if (!templatePath) {
            throw new Error(`Template path not found for template '${template.id}'`);
          }

          const sourceFilePath = this.fileService.resolvePath(templatePath, 'files', file.sourcePath);
          if (await this.fileService.exists(sourceFilePath)) {
            content = await this.fileService.readFile(sourceFilePath);
          }
        }

        // Apply variable substitution if enabled
        if (file.variables !== false && content) {
          content = this.variableService.substituteVariables(content, variables);
        }

        await this.fileService.createFile(fullFilePath, content, {
          mode: file.permissions ? parseInt(file.permissions, 8) : undefined,
          overwrite: true
        });
      }
    } catch (error) {
      throw new Error(`Failed to apply template '${template.name}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find template directory by ID
   */
  private async findTemplateById(templateId: string): Promise<string | null> {
    try {
      const template = await this.templateService.getTemplate(templateId);
      // The TemplateService should provide the path, but for now we'll reconstruct it
      // This is based on the pattern seen in TemplateService
      const templatesDir = this.fileService.resolvePath(require('os').homedir(), '.scaffold', 'templates');
      return this.fileService.resolvePath(templatesDir, templateId);
    } catch (error) {
      return null;
    }
  }
}