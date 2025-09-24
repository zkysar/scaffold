/**
 * CLI command: scaffold fix [project]
 * Fix project structure issues
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

import chalk from 'chalk';
import { Command } from 'commander';
import { DependencyContainer } from 'tsyringe';

import { logger } from '@/lib/logger';
import {
  ProjectFixService,
  ProjectManifestService,
  ProjectValidationService,
  TemplateService,
  FileSystemService,
} from '@/services';

import { ExitCode, exitWithCode } from '../../constants/exit-codes';

interface FixCommandOptions {
  verbose?: boolean;
  dryRun?: boolean;
  force?: boolean;
  backup?: boolean;
}

export function createFixCommand(container: DependencyContainer): Command {
  const command = new Command('fix');

  command
    .description('Fix project structure issues automatically')
    .argument(
      '[project]',
      'Project directory path (defaults to current directory)'
    )
    .option('--verbose', 'Show detailed fix output')
    .option('--dry-run', 'Show what would be fixed without making changes')
    .option('--force', 'Fix issues without confirmation prompts')
    .option('--backup', 'Create backup before making changes', true)
    .option('--no-backup', 'Skip backup creation')
    .action(async (projectPath: string | undefined, options: FixCommandOptions) => {
      try {
        await handleFixCommand(projectPath, options, container);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));

        // Handle specific error types
        if (error instanceof Error) {
          // Handle our custom error codes first
          if (error.message.startsWith('INVALID_MANIFEST:')) {
            logger.error(error.message.replace('INVALID_MANIFEST: ', ''));
            exitWithCode(ExitCode.USER_ERROR);
          } else if (error.message.includes('permission') ||
                     error.message.includes('EACCES') ||
                     error.message.includes('EPERM')) {
            exitWithCode(ExitCode.SYSTEM_ERROR);
          } else {
            exitWithCode(ExitCode.USER_ERROR);
          }
        } else {
          exitWithCode(ExitCode.USER_ERROR);
        }
      }
    });

  return command;
}

async function handleFixCommand(
  projectPath: string | undefined,
  options: FixCommandOptions,
  container: DependencyContainer
): Promise<void> {
  const verbose = options.verbose || false;
  const dryRun = options.dryRun || false;

  // Determine target path
  const targetPath = projectPath
    ? resolve(projectPath)
    : resolve(process.cwd());

  if (verbose) {
    logger.info(chalk.blue('Fixing project: ') + targetPath);
    logger.info(chalk.blue('Options: ') + JSON.stringify(options, null, 2));
  }

  // Check if target directory exists
  if (!existsSync(targetPath)) {
    logger.error(`Directory "${targetPath}" does not exist`);
    exitWithCode(ExitCode.USER_ERROR);
  }

  // Resolve services from DI container
  const fileSystemService = container.resolve(FileSystemService);
  const templateService = container.resolve(TemplateService);
  const manifestService = container.resolve(ProjectManifestService);
  const validationService = container.resolve(ProjectValidationService);
  const fixService = container.resolve(ProjectFixService);

  // Check if this is a scaffold-managed project
  let manifest;
  try {
    manifest = await manifestService.loadProjectManifest(targetPath);
  } catch (manifestError) {
    // Handle JSON parsing or file read errors
    if (manifestError instanceof Error) {
      const errorMessage = manifestError.message.toLowerCase();
      if (verbose) {
        logger.gray('Manifest error details: ' + manifestError.message);
      }

      // Check for malformed JSON specifically
      // Error message: "Failed to read JSON file: ... Ensure the file exists and contains valid JSON."
      if ((errorMessage.includes('json') && errorMessage.includes('parse')) ||
          errorMessage.includes('syntax') ||
          errorMessage.includes('unexpected') ||
          errorMessage.includes('invalid json') ||
          errorMessage.includes('unexpected token') ||
          errorMessage.includes('malformed') ||
          (errorMessage.includes('json') && errorMessage.includes('valid')) ||
          (errorMessage.includes('failed to read json file') && errorMessage.includes('valid json'))) {
        // Throw error to be caught by outer catch block for proper exit code handling
        throw new Error('INVALID_MANIFEST: Invalid or corrupted project manifest file');
      }

      // For file not found or read errors, treat as non-scaffold project
      // This includes cases where the service can't read the file properly
      if (errorMessage.includes('file') ||
          errorMessage.includes('read') ||
          errorMessage.includes('enoent')) {
        manifest = null; // Will be handled as non-scaffold project below
      } else {
        // For other unknown errors, re-throw
        throw manifestError;
      }
    } else {
      // For non-Error objects, re-throw
      throw manifestError;
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
    logger.infoBlue(`Project name: ${manifest.projectName}`);
    logger.infoBlue(
      `Applied templates: ${manifest.templates.map(t => `${t.name}@${t.version}`).join(', ')}`
    );
  }

  // Fix the project
  const report = await fixService.fixProject(targetPath, dryRun);

  // Display results
  logger.bold('Project Fix Report');
  logger.info('─'.repeat(50));

  if (report.valid) {
    logger.green('✓ Project structure is valid - no fixes needed');
  } else {
    // Display errors that couldn't be fixed
    if (report.errors.length > 0) {
      logger.red('Remaining Errors:');
      for (const error of report.errors) {
        logger.info(chalk.red('  ✗ ') + error.message);
        if (error.suggestion) {
          logger.gray(`    Suggestion: ${error.suggestion}`);
        }
      }
      logger.info('');
    }

    // Display warnings
    if (report.warnings.length > 0) {
      logger.yellow('Warnings:');
      for (const warning of report.warnings) {
        logger.info(chalk.yellow('  ⚠ ') + warning.message);
        if (warning.suggestion) {
          logger.gray(`    Suggestion: ${warning.suggestion}`);
        }
      }
      logger.info('');
    }
  }

  // Display suggestions
  if (report.suggestions && report.suggestions.length > 0) {
    logger.infoBlue('Summary:');
    for (const suggestion of report.suggestions) {
      logger.gray(`  • ${suggestion}`);
    }
    logger.info('');
  }

  // Display stats
  logger.infoBlue('Statistics:');
  logger.gray(`  Files checked: ${report.stats.filesChecked}`);
  logger.gray(`  Folders checked: ${report.stats.foldersChecked}`);
  logger.gray(`  Errors: ${report.stats.errorCount}`);
  logger.gray(`  Warnings: ${report.stats.warningCount}`);
  logger.gray(`  Duration: ${report.stats.duration}ms`);

  // Set exit code based on results
  if (report.stats.errorCount > 0) {
    exitWithCode(ExitCode.USER_ERROR);
  } else {
    exitWithCode(ExitCode.SUCCESS);
  }
}