/**
 * Shared template selection utility
 * Provides interactive template selection functionality for CLI commands
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { TemplateService } from '../../services';
import type { TemplateSummary } from '../../models';

export interface TemplateSelectionOptions {
  verbose?: boolean;
  excludeTemplateIds?: string[];
  allowMultiple?: boolean;
  required?: boolean;
}

/**
 * Interactive template selection utility
 * @param templateService - Service instance for loading templates
 * @param options - Configuration options for selection behavior
 * @returns Promise resolving to array of selected template IDs
 */
export async function selectTemplates(
  templateService: TemplateService,
  options: TemplateSelectionOptions = {}
): Promise<string[]> {
  const {
    verbose = false,
    excludeTemplateIds = [],
    allowMultiple = true,
    required = true,
  } = options;

  try {
    const library = await templateService.loadTemplates();

    if (library.templates.length === 0) {
      if (verbose) {
        console.log(chalk.yellow('No templates found.'));
        console.log(
          chalk.gray(
            'Use "scaffold template create" to create your first template.'
          )
        );
      }

      if (required) {
        throw new Error('No templates available for selection');
      }

      return [];
    }

    // Filter out excluded templates
    const availableTemplates = library.templates.filter(
      template => !excludeTemplateIds.includes(template.id)
    );

    if (availableTemplates.length === 0) {
      if (verbose) {
        console.log(chalk.yellow('No available templates after filtering.'));
      }

      if (required) {
        throw new Error('No templates available after filtering excluded templates');
      }

      return [];
    }

    if (verbose) {
      console.log(
        chalk.blue('Found'),
        availableTemplates.length,
        'available templates'
      );
    }

    // Create choices for inquirer
    const templateChoices = availableTemplates.map(template => ({
      name: `${template.name} - ${template.description}`,
      value: template.id,
      short: template.name,
    }));

    if (allowMultiple) {
      const { selectedTemplates } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selectedTemplates',
          message:
            'Select templates to apply (use spacebar to select, enter to confirm):',
          choices: templateChoices,
          validate: (input: string[]): string | boolean => {
            if (required && input.length === 0) {
              return 'You must select at least one template';
            }
            return true;
          },
        },
      ]);

      if (verbose && selectedTemplates.length > 0) {
        console.log(chalk.blue('Selected templates:'), selectedTemplates);
      }

      return selectedTemplates;
    } else {
      const { selectedTemplate } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedTemplate',
          message: 'Select a template:',
          choices: templateChoices,
        },
      ]);

      if (verbose) {
        console.log(chalk.blue('Selected template:'), selectedTemplate);
      }

      return [selectedTemplate];
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Failed to load templates')
    ) {
      if (verbose) {
        console.log(chalk.yellow('No templates found.'));
        console.log(
          chalk.gray(
            'Use "scaffold template create" to create your first template.'
          )
        );
      }

      if (required) {
        throw new Error('No templates available for selection');
      }

      return [];
    }
    throw error;
  }
}