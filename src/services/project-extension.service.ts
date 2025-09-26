/**
 * Project extension service - handles extending projects with additional templates
 */

import { injectable, inject } from 'tsyringe';

import type { ProjectManifest, Template } from '@/models';
import { FileSystemService } from '@/services/file-system.service';
import type { IFileSystemService } from '@/services/file-system.service';
import { ProjectManifestService } from '@/services/project-manifest.service';
import type { IProjectManifestService } from '@/services/project-manifest.service';
import { ProjectValidationService } from '@/services/project-validation.service';
import type { IProjectValidationService } from '@/services/project-validation.service';
import { TemplateService } from '@/services/template-service';
import type { ITemplateService } from '@/services/template-service';
import { VariableSubstitutionService } from '@/services/variable-substitution.service';
import type { IVariableSubstitutionService } from '@/services/variable-substitution.service';

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
    @inject(VariableSubstitutionService)
    private readonly variableService: IVariableSubstitutionService,
    @inject(ProjectManifestService)
    private readonly manifestService: IProjectManifestService,
    @inject(ProjectValidationService)
    private readonly validationService: IProjectValidationService
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async extendProject(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    projectPath: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    templateIds: string[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    variables?: Record<string, string>
  ): Promise<ProjectManifest> {
    throw new Error('Method not implemented');
  }

  /**
   * Apply a template to a project directory
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async applyTemplate(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    template: Template,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    projectPath: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    variables: Record<string, string>
  ): Promise<void> {
    throw new Error('Method not implemented');
  }

  /**
   * Find template directory by ID
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async findTemplateBySHA(templateSha: string): Promise<string | null> {
    throw new Error('Method not implemented');
  }
}
