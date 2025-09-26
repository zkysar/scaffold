/**
 * Project validation service - handles project structure validation
 */

import { injectable, inject } from 'tsyringe';

import type { ValidationReport } from '@/models';
import { FileSystemService } from '@/services/file-system.service';
import type { IFileSystemService } from '@/services/file-system.service';
import { ProjectManifestService } from '@/services/project-manifest.service';
import type { IProjectManifestService } from '@/services/project-manifest.service';
import { TemplateService } from '@/services/template-service';
import type { ITemplateService } from '@/services/template-service';
import { VariableSubstitutionService } from '@/services/variable-substitution.service';
import type { IVariableSubstitutionService } from '@/services/variable-substitution.service';

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async validateProject(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    projectPath: string
  ): Promise<ValidationReport> {
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
