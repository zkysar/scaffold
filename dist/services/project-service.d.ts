/**
 * Project service for project creation, validation, and management
 */
import type { ProjectManifest, ValidationReport } from '../models';
import type { ITemplateService } from './template-service';
import type { IFileSystemService } from './file-system.service';
import type { IConfigurationService } from './configuration.service';
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
export declare class ProjectService implements IProjectService {
    private readonly templateService;
    private readonly fileService;
    private readonly configService?;
    private readonly variableService;
    constructor(templateService: ITemplateService, fileService: IFileSystemService, configService?: IConfigurationService | undefined);
    createProject(projectName: string, templateIds: string[], targetPath: string, variables?: Record<string, string>): Promise<ProjectManifest>;
    validateProject(projectPath: string): Promise<ValidationReport>;
    fixProject(projectPath: string, dryRun?: boolean): Promise<ValidationReport>;
    extendProject(projectPath: string, templateIds: string[], variables?: Record<string, string>): Promise<ProjectManifest>;
    loadProjectManifest(projectPath: string): Promise<ProjectManifest | null>;
    saveProjectManifest(projectPath: string, manifest: ProjectManifest): Promise<void>;
    cleanProject(projectPath?: string): Promise<void>;
    /**
     * Find the nearest project manifest by searching upward from the given path
     */
    private findNearestManifest;
    /**
     * Get project manifest from a project directory
     */
    getProjectManifest(projectPath: string): Promise<ProjectManifest | null>;
    /**
     * Update project manifest in a project directory
     */
    updateProjectManifest(projectPath: string, manifest: ProjectManifest): Promise<void>;
    /**
     * Initialize a new project manifest
     */
    initializeProjectManifest(projectName: string, templateId: string): ProjectManifest;
    /**
     * Ensure project directory structure exists
     */
    ensureProjectDirectory(projectPath: string): Promise<void>;
    /**
     * Apply a template to a project directory
     */
    private applyTemplate;
    /**
     * Find template directory by ID
     */
    private findTemplateById;
}
//# sourceMappingURL=project-service.d.ts.map