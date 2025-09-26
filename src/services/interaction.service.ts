/**
 * Service for handling user interactions and prompts
 * Centralizes all inquirer.prompt() calls for testability and consistency
 */

import { prompt } from 'inquirer';
import { injectable } from 'tsyringe';

import {
  selectTemplates,
  TemplateSelectionOptions,
} from '@/cli/utils/template-selector';
import type { Template } from '@/models';

import { TemplateService } from './template-service';

export interface ProjectNamePromptResult {
  name: string;
}

export interface PathPromptResult {
  useCurrentDir: boolean;
  customPath?: string;
}

export interface OverwritePromptResult {
  overwrite: boolean;
}

@injectable()
export class InteractionService {
  constructor(private templateService: TemplateService) {}
  /**
   * Prompt user for project name
   */
  async promptProjectName(): Promise<string> {
    const { name } = await prompt<ProjectNamePromptResult>([
      {
        type: 'input',
        name: 'name',
        message: 'Enter project name:',
        validate: (input: string): string | boolean => {
          if (!input || input.trim().length === 0) {
            return 'Project name is required';
          }
          // Validate project name (no special characters except dash and underscore)
          if (!/^[a-zA-Z0-9_-]+$/.test(input.trim())) {
            return 'Project name can only contain letters, numbers, dashes, and underscores';
          }
          return true;
        },
      },
    ]);
    return name.trim();
  }

  /**
   * Prompt user for target directory path
   */
  async promptTargetPath(): Promise<string> {
    const { useCurrentDir } = await prompt<{ useCurrentDir: boolean }>([
      {
        type: 'confirm',
        name: 'useCurrentDir',
        message: 'Create project in current directory?',
        default: true,
      },
    ]);

    if (!useCurrentDir) {
      const { customPath } = await prompt<{ customPath: string }>([
        {
          type: 'input',
          name: 'customPath',
          message: 'Enter target directory path:',
          default: process.cwd(),
          validate: (input: string): string | boolean => {
            if (!input || input.trim().length === 0) {
              return 'Path is required';
            }
            return true;
          },
        },
      ]);
      return customPath.trim();
    }

    return process.cwd();
  }

  /**
   * Prompt user for confirmation when directory already exists
   */
  async promptOverwrite(targetPath: string): Promise<boolean> {
    const { overwrite } = await prompt<OverwritePromptResult>([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Directory "${targetPath}" already exists. Continue?`,
        default: false,
      },
    ]);

    return overwrite;
  }

  /**
   * Prompt user for confirmation when adding template to project
   */
  async promptAddTemplate(
    templateName: string,
    projectName: string
  ): Promise<boolean> {
    const { proceed } = await prompt<{ proceed: boolean }>([
      {
        type: 'confirm',
        name: 'proceed',
        message: `Add template "${templateName}" to project "${projectName}"?`,
        default: true,
      },
    ]);

    return proceed;
  }

  /**
   * Prompt user for template selection using existing utility
   */
  async promptTemplateSelection(
    options: TemplateSelectionOptions = {}
  ): Promise<string[]> {
    return selectTemplates(this.templateService, options);
  }

  /**
   * Prompt user for template creation details
   */
  async promptTemplateCreation(
    name: string
  ): Promise<Omit<Template, 'id' | 'created' | 'updated'>> {
    const answers = await prompt([
      {
        type: 'input',
        name: 'description',
        message: 'Template description:',
        validate: (input: string) =>
          input.trim().length > 0 || 'Description is required',
      },
      {
        type: 'input',
        name: 'rootFolder',
        message: 'Root folder for template isolation:',
        default: name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
        validate: (input: string): string | boolean => {
          if (!input.trim()) return 'Root folder is required';
          if (!/^[a-zA-Z0-9_-]+$/.test(input))
            return 'Root folder must contain only alphanumeric characters, underscores, and hyphens';
          if (input.startsWith('.') || input.startsWith('-'))
            return 'Root folder cannot start with a dot or hyphen';
          return true;
        },
      },
      {
        type: 'input',
        name: 'version',
        message: 'Initial version:',
        default: '1.0.0',
        validate: (input: string): string | boolean => {
          const semverRegex = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
          return (
            semverRegex.test(input) || 'Invalid semantic version (e.g., 1.0.0)'
          );
        },
      },
      {
        type: 'confirm',
        name: 'strictMode',
        message: 'Enable strict mode validation?',
        default: false,
      },
      {
        type: 'confirm',
        name: 'allowExtraFiles',
        message: 'Allow extra files in projects?',
        default: true,
      },
    ]);

    return {
      name,
      version: answers.version,
      description: answers.description,
      rootFolder: answers.rootFolder,
      folders: [],
      files: [],
      variables: [],
      rules: {
        strictMode: answers.strictMode,
        allowExtraFiles: answers.allowExtraFiles,
        allowExtraFolders: true,
        conflictResolution: 'prompt',
        excludePatterns: ['node_modules', '.git', '*.log'],
        rules: [],
      },
    };
  }

  /**
   * Prompt user for template deletion confirmation
   */
  async promptTemplateDeleteConfirmation(
    templateName: string,
    templateId: string
  ): Promise<boolean> {
    const { confirm } = await prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to delete template '${templateName}' (${templateId})?`,
        default: false,
      },
    ]);

    return confirm;
  }

  /**
   * General confirmation prompt
   */
  async promptConfirmation(
    message: string,
    defaultValue = false
  ): Promise<boolean> {
    const { confirmed } = await prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message,
        default: defaultValue,
      },
    ]);

    return confirmed;
  }
}
