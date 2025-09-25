/**
 * CLI command: scaffold check [project]
 * Validate project structure against applied templates
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

import { Command } from 'commander';
import { DependencyContainer } from 'tsyringe';

import { ExitCode, exitWithCode } from '@/constants/exit-codes';
import { createLogger, logger } from '@/lib/logger';
import type { ValidationReport } from '@/models';
import {
  ProjectValidationService,
  ProjectManifestService,
  TemplateService,
  FileSystemService,
  VariableSubstitutionService,
  TemplateIdentifierService,
} from '@/services';

interface CheckCommandOptions {
  verbose?: boolean;
  strictMode?: boolean;
  configPath?: string;
  format?: 'table' | 'json' | 'summary';
}

export function createCheckCommand(container: DependencyContainer): Command {
  const command = new Command('check');

  command
    .description('Validate project structure against applied templates')
    .argument(
      '[project]',
      'Project directory path (defaults to current directory)'
    )
    .option('--verbose', 'Show detailed validation output')
    .option('--strict', 'Use strict mode validation')
    .option('-c, --config <path>', 'Path to configuration file')
    .option(
      '-f, --format <format>',
      'Output format (table|json|summary)',
      'table'
    )
    .action(async (projectPath: string, options: CheckCommandOptions) => {
      try {
        await handleCheckCommand(projectPath, options, container);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        // Determine exit code based on error type
        if (
          (error instanceof Error && error.message.includes('permission')) ||
          (error instanceof Error && error.message.includes('EACCES')) ||
          (error instanceof Error && error.message.includes('EPERM'))
        ) {
          exitWithCode(ExitCode.SYSTEM_ERROR);
        } else {
          exitWithCode(ExitCode.USER_ERROR);
        }
      }
    });

  return command;
}

async function handleCheckCommand(
  projectPath: string,
  options: CheckCommandOptions,
  container: DependencyContainer
): Promise<void> {
  const verbose = options.verbose || false;
  const format = options.format || 'table';

  // Create logger with command options
  const logger = createLogger({ verbose, noColor: false });

  // Determine target path
  const targetPath = projectPath
    ? resolve(projectPath)
    : resolve(process.cwd());

  if (verbose) {
    logger.keyValue('Checking project', targetPath, 'blue');
    logger.keyValue('Options', JSON.stringify(options, null, 2), 'blue');
  }

  // Check if target directory exists
  if (!existsSync(targetPath)) {
    exitWithCode(
      ExitCode.USER_ERROR,
      `Error: Directory "${targetPath}" does not exist`
    );
  }

  // Resolve services from DI container
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fileSystemService = container.resolve(FileSystemService);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const templateService = container.resolve(TemplateService);
  const manifestService = container.resolve(ProjectManifestService);
  const validationService = container.resolve(ProjectValidationService);

  try {
    // Check if this is a scaffold-managed project
    let manifest;
    try {
      manifest = await manifestService.loadProjectManifest(targetPath);
    } catch (manifestError) {
      // Handle JSON parsing or file read errors
      if (manifestError instanceof Error) {
        const errorMessage = manifestError.message.toLowerCase();

        // Log error details for debugging
        if (verbose) {
          logger.gray(
            `Manifest error details: ${manifestError.message}`
          );
        }

        // Check for any manifest-related errors that indicate invalid project data
        if (
          errorMessage.includes('json') ||
          errorMessage.includes('parse') ||
          errorMessage.includes('syntax') ||
          errorMessage.includes('manifest') ||
          errorMessage.includes('invalid') ||
          errorMessage.includes('unexpected')
        ) {
          // Throw error to be caught by outer catch block for synchronous exit
          throw new Error(
            'INVALID_MANIFEST: Invalid or corrupted project manifest file'
          );
        }

        // For file not found errors, treat as non-scaffold project
        if (
          errorMessage.includes('does not exist') ||
          errorMessage.includes('no such file') ||
          errorMessage.includes('enoent')
        ) {
          manifest = null;
        } else {
          // For other unknown errors, treat as USER_ERROR since it's project-related
          throw new Error('MANIFEST_ERROR: Failed to read project manifest');
        }
      } else {
        // For non-Error objects, treat as USER_ERROR
        throw new Error('MANIFEST_ERROR: Failed to read project manifest');
      }
    }

    if (!manifest) {
      logger.yellow('Not a scaffold-managed project.');
      logger.gray('No .scaffold/manifest.json file found.');
      logger.gray(
        'Use "scaffold new" to create a new project or "scaffold extend" to add templates.'
      );
      return;
    }

    if (verbose) {
      logger.keyValue('Project name', manifest.projectName, 'blue');
      logger.keyValue(
        'Applied templates',
        manifest.templates.map(t => `${t.name}@${t.version}`).join(', '),
        'blue'
      );
    }

    // Validate the project
    const report = await validationService.validateProject(targetPath);

    // Display results based on format
    switch (format) {
      case 'json':
        logger.raw(JSON.stringify(report, null, 2));
        break;
      case 'summary':
        displaySummary(report);
        break;
      case 'table':
      default:
        displayTable(report, verbose);
        break;
    }

    // Set exit code based on validation results
    if (report.stats.errorCount > 0) {
      process.exit(ExitCode.USER_ERROR);
    }
    // Note: Warnings don't cause non-zero exit code as per specification
  } catch (error) {
    // Handle specific error cases
    if (error instanceof Error) {
      // Handle our custom error codes
      if (error.message.startsWith('INVALID_MANIFEST:')) {
        exitWithCode(
          ExitCode.USER_ERROR,
          `Error: ${error.message.replace('INVALID_MANIFEST: ', '')}`
        );
      } else if (error.message.startsWith('MANIFEST_ERROR:')) {
        exitWithCode(
          ExitCode.USER_ERROR,
          `Error: ${error.message.replace('MANIFEST_ERROR: ', '')}`
        );
      } else if (
        error.message.includes('permission') ||
        error.message.includes('EACCES') ||
        error.message.includes('EPERM')
      ) {
        exitWithCode(ExitCode.SYSTEM_ERROR, error.message);
      } else if (
        error.message.includes('JSON') ||
        error.message.includes('manifest') ||
        error.message.includes('parse')
      ) {
        exitWithCode(ExitCode.USER_ERROR, error.message);
      } else {
        exitWithCode(ExitCode.USER_ERROR, error.message);
      }
    } else {
      exitWithCode(ExitCode.USER_ERROR, String(error));
    }
  }
}

function displaySummary(report: ValidationReport): void {
  const logger = createLogger({});
  logger.bold('Validation Summary');
  logger.raw('─'.repeat(50));

  if (report.stats.errorCount === 0 && report.stats.warningCount === 0) {
    logger.green('✓ All validation checks passed');
  } else {
    if (report.stats.errorCount > 0) {
      logger.red(`✗ ${report.stats.errorCount} error(s) found`);
    }
    if (report.stats.warningCount > 0) {
      logger.yellow(`⚠ ${report.stats.warningCount} warning(s) found`);
    }
  }

  logger.gray(`Files checked: ${report.stats.filesChecked}`);
  logger.gray(`Folders checked: ${report.stats.foldersChecked}`);
  logger.gray(`Rules evaluated: ${report.stats.rulesEvaluated}`);
  logger.gray(`Duration: ${report.stats.duration}ms`);
}

function displayTable(report: ValidationReport, verbose: boolean): void {
  const logger = createLogger({ verbose });
  logger.bold('Project Validation Report');
  logger.raw('─'.repeat(50));

  // Display errors
  if (report.errors.length > 0) {
    logger.red('Errors:');
    for (const error of report.errors) {
      logger.red(`  ✗ ${error.message}`);
      if (error.file) {
        logger.gray(`    File: ${error.file}`);
      }
      if (error.rule) {
        logger.gray(`    Rule: ${error.rule}`);
      }
      if (verbose && error.suggestion) {
        logger.gray(`    Suggestion: ${error.suggestion}`);
      }
    }
    logger.newLine();
  }

  // Display warnings
  if (report.warnings.length > 0) {
    logger.yellow('Warnings:');
    for (const warning of report.warnings) {
      logger.yellow(`  ⚠ ${warning.message}`);
      if (warning.file) {
        logger.gray(`    File: ${warning.file}`);
      }
      if (warning.rule) {
        logger.gray(`    Rule: ${warning.rule}`);
      }
      if (verbose && warning.suggestion) {
        logger.gray(`    Suggestion: ${warning.suggestion}`);
      }
    }
    logger.newLine();
  }

  // Display success message if no issues
  if (report.errors.length === 0 && report.warnings.length === 0) {
    logger.green('✓ All validation checks passed');
    logger.newLine();
  }

  // Display stats
  logger.infoBlue('Statistics:');
  logger.gray(`  Files checked: ${report.stats.filesChecked}`);
  logger.gray(`  Folders checked: ${report.stats.foldersChecked}`);
  logger.gray(`  Rules evaluated: ${report.stats.rulesEvaluated}`);
  logger.gray(`  Errors: ${report.stats.errorCount}`);
  logger.gray(`  Warnings: ${report.stats.warningCount}`);
  logger.gray(`  Duration: ${report.stats.duration}ms`);

  if (verbose) {
    logger.newLine();
    logger.infoBlue('Passed Rules:');
    if (report.passedRules && report.passedRules.length > 0) {
      for (const rule of report.passedRules) {
        logger.green(`  ✓ ${rule}`);
      }
    } else {
      logger.gray('  None');
    }

    if (report.skippedRules && report.skippedRules.length > 0) {
      logger.newLine();
      logger.infoBlue('Skipped Rules:');
      for (const rule of report.skippedRules) {
        logger.gray(`  - ${rule}`);
      }
    }
  }

  logger.newLine();

  // Display suggestions for next steps
  if (report.errors.length > 0) {
    logger.yellow('Next steps:');
    logger.gray('  • Run "scaffold fix" to automatically fix issues');
    logger.gray('  • Use --verbose for detailed error information');
  }
}
