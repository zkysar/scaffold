/**
 * CLI command: scaffold fix [project]
 * Fix project structure issues
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';
import {
  ProjectFixService,
  ProjectValidationService,
  ProjectManifestService,
  TemplateService,
  FileSystemService,
} from '../../services';
import { ExitCode, exitWithCode } from '../../constants/exit-codes';

interface FixCommandOptions {
  verbose?: boolean;
  dryRun?: boolean;
  force?: boolean;
  backup?: boolean;
}

export function createFixCommand(): Command {
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
    .option('--no-backup', 'Disable backup creation')
    .action(async (projectPath: string, options: FixCommandOptions) => {
      try {
        await handleFixCommand(projectPath, options);
      } catch (error) {
        console.error(
          chalk.red('Error:'),
          error instanceof Error ? error.message : String(error)
        );
        // Handle specific error types
        if (error instanceof Error) {
          // Handle our custom error codes first
          if (error.message.startsWith('INVALID_MANIFEST:')) {
            console.error(
              chalk.red('Error:'),
              error.message.replace('INVALID_MANIFEST: ', '')
            );
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
  projectPath: string,
  options: FixCommandOptions
): Promise<void> {
  const verbose = options.verbose || false;
  const dryRun = options.dryRun || false;

  // Determine target path
  const targetPath = projectPath
    ? resolve(projectPath)
    : resolve(process.cwd());

  if (verbose) {
    console.log(chalk.blue('Fixing project:'), targetPath);
    console.log(chalk.blue('Options:'), JSON.stringify(options, null, 2));
  }

  // Check if target directory exists
  if (!existsSync(targetPath)) {
    console.error(
      chalk.red('Error:'),
      `Directory "${targetPath}" does not exist`
    );
    exitWithCode(ExitCode.USER_ERROR);
  }

  // Initialize services
  const fileSystemService = new FileSystemService();
  const templateService = new TemplateService();
  const manifestService = new ProjectManifestService(fileSystemService);
  const validationService = new ProjectValidationService(
    templateService,
    fileSystemService,
    manifestService.getProjectManifest.bind(manifestService)
  );
  const fixService = new ProjectFixService(
    templateService,
    fileSystemService,
    validationService,
    manifestService.getProjectManifest.bind(manifestService),
    manifestService.updateProjectManifest.bind(manifestService)
  );

  try {
    // Check if this is a scaffold-managed project
    let manifest;
    try {
      manifest = await manifestService.loadProjectManifest(targetPath);
    } catch (manifestError) {
      // Handle JSON parsing or file read errors
      if (manifestError instanceof Error) {
        const errorMessage = manifestError.message.toLowerCase();
        if (verbose) {
          console.log(chalk.gray('Manifest error details:'), manifestError.message);
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
      console.log(chalk.yellow('Not a scaffold-managed project.'));
      console.log(chalk.gray('No .scaffold/manifest.json file found.'));
      console.log(
        chalk.gray(
          'Use "scaffold new" to create a new project or "scaffold extend" to add templates.'
        )
      );
      return;
    }

    if (verbose) {
      console.log(chalk.blue('Project name:'), manifest.projectName);
      console.log(
        chalk.blue('Applied templates:'),
        manifest.templates.map(t => `${t.name}@${t.version}`).join(', ')
      );
    }

    // Fix the project
    const report = await fixService.fixProject(targetPath, dryRun);

    // Display results
    console.log(chalk.bold('Project Fix Report'));
    console.log('─'.repeat(50));

    if (report.valid) {
      console.log(chalk.green('✓ Project structure is valid - no fixes needed'));
    } else {
      // Display errors that couldn't be fixed
      if (report.errors.length > 0) {
        console.log(chalk.red('Remaining Errors:'));
        for (const error of report.errors) {
          console.log(chalk.red('  ✗'), error.message);
          if (error.suggestion) {
            console.log(chalk.gray(`    Suggestion: ${error.suggestion}`));
          }
        }
        console.log('');
      }

      // Display warnings
      if (report.warnings.length > 0) {
        console.log(chalk.yellow('Warnings:'));
        for (const warning of report.warnings) {
          console.log(chalk.yellow('  ⚠'), warning.message);
          if (warning.suggestion) {
            console.log(chalk.gray(`    Suggestion: ${warning.suggestion}`));
          }
        }
        console.log('');
      }
    }

    // Display suggestions
    if (report.suggestions && report.suggestions.length > 0) {
      console.log(chalk.blue('Summary:'));
      for (const suggestion of report.suggestions) {
        console.log(chalk.gray(`  • ${suggestion}`));
      }
      console.log('');
    }

    // Display stats
    console.log(chalk.blue('Statistics:'));
    console.log(chalk.gray(`  Files checked: ${report.stats.filesChecked}`));
    console.log(chalk.gray(`  Folders checked: ${report.stats.foldersChecked}`));
    console.log(chalk.gray(`  Errors: ${report.stats.errorCount}`));
    console.log(chalk.gray(`  Warnings: ${report.stats.warningCount}`));
    console.log(chalk.gray(`  Duration: ${report.stats.duration}ms`));

    // Set exit code based on results
    if (report.stats.errorCount > 0) {
      exitWithCode(ExitCode.USER_ERROR);
    } else {
      exitWithCode(ExitCode.SUCCESS);
    }
  } catch (error) {
    // Handle specific error types
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      // Check for permission-related errors (SYSTEM_ERROR)
      if (errorMessage.includes('permission') ||
          errorMessage.includes('eacces') ||
          errorMessage.includes('eperm') ||
          errorMessage.includes('access denied')) {
        console.error(
          chalk.red('Error:'),
          'Permission denied while accessing project files'
        );
        exitWithCode(ExitCode.SYSTEM_ERROR);
      }

      // Check for manifest-related errors (USER_ERROR)
      if (errorMessage.includes('manifest') ||
          errorMessage.includes('json')) {
        console.error(
          chalk.red('Error:'),
          'Invalid or corrupted project manifest'
        );
        exitWithCode(ExitCode.USER_ERROR);
      }
    }

    // Re-throw to be handled by the outer catch block
    throw error;
  }
}
