/**
 * CLI command: scaffold fix [project]
 * Fix project structure issues
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';
import { DependencyContainer } from 'tsyringe';
import { logger } from '../../lib/logger';
import {
  ProjectFixService,
  ProjectValidationService,
  ProjectManifestService,
  TemplateService,
  FileSystemService,
} from '../../services';

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
        process.exit(1);
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
    process.exit(1);
  }

  // Resolve services from DI container
  const fileSystemService = container.resolve(FileSystemService);
  const templateService = container.resolve(TemplateService);
  const manifestService = container.resolve(ProjectManifestService);
  const validationService = container.resolve(ProjectValidationService);
  const fixService = container.resolve(ProjectFixService);

  // Check if this is a scaffold-managed project
  const manifest = await manifestService.loadProjectManifest(targetPath);

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
    process.exit(1);
  } else if (report.stats.warningCount > 0) {
    process.exit(2);
  }
}
