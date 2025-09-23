/**
 * CLI command: scaffold check [project]
 * Validate project structure against applied templates
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';
import { DependencyContainer } from 'tsyringe';
import {
  ProjectValidationService,
  ProjectManifestService,
  TemplateService,
  FileSystemService,
} from '@/services';
import type { ValidationReport } from '@/models';
import { createLogger, logger } from '@/lib/logger';

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
        process.exit(1);
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
    logger.error(`Directory "${targetPath}" does not exist`);
    process.exit(1);
  }

  // Resolve services from DI container
  const fileSystemService = container.resolve(FileSystemService);
  const templateService = container.resolve(TemplateService);
  const manifestService = container.resolve(ProjectManifestService);
  const validationService = container.resolve(ProjectValidationService);

  try {
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
      process.exit(1);
    } else if (report.stats.warningCount > 0) {
      process.exit(2);
    }
  } catch (error) {
    throw error;
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

  console.log(chalk.gray(`Files checked: ${report.stats.filesChecked}`));
  console.log(chalk.gray(`Folders checked: ${report.stats.foldersChecked}`));
  console.log(chalk.gray(`Rules evaluated: ${report.stats.rulesEvaluated}`));
  console.log(chalk.gray(`Duration: ${report.stats.duration}ms`));
}

function displayTable(report: ValidationReport, verbose: boolean): void {
  const logger = createLogger({ verbose });
  logger.bold('Project Validation Report');
  logger.raw('─'.repeat(50));

  // Display errors
  if (report.errors.length > 0) {
    console.log(chalk.red('Errors:'));
    for (const error of report.errors) {
      console.log(chalk.red('  ✗'), error.message);
      if (error.file) {
        console.log(chalk.gray(`    File: ${error.file}`));
      }
      if (error.rule) {
        console.log(chalk.gray(`    Rule: ${error.rule}`));
      }
      if (verbose && error.suggestion) {
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
      if (warning.file) {
        console.log(chalk.gray(`    File: ${warning.file}`));
      }
      if (warning.rule) {
        console.log(chalk.gray(`    Rule: ${warning.rule}`));
      }
      if (verbose && warning.suggestion) {
        console.log(chalk.gray(`    Suggestion: ${warning.suggestion}`));
      }
    }
    console.log('');
  }

  // Display success message if no issues
  if (report.errors.length === 0 && report.warnings.length === 0) {
    console.log(chalk.green('✓ All validation checks passed'));
    console.log('');
  }

  // Display stats
  console.log(chalk.blue('Statistics:'));
  console.log(chalk.gray(`  Files checked: ${report.stats.filesChecked}`));
  console.log(chalk.gray(`  Folders checked: ${report.stats.foldersChecked}`));
  console.log(chalk.gray(`  Rules evaluated: ${report.stats.rulesEvaluated}`));
  console.log(chalk.gray(`  Errors: ${report.stats.errorCount}`));
  console.log(chalk.gray(`  Warnings: ${report.stats.warningCount}`));
  console.log(chalk.gray(`  Duration: ${report.stats.duration}ms`));

  if (verbose) {
    console.log('');
    console.log(chalk.blue('Passed Rules:'));
    if (report.passedRules && report.passedRules.length > 0) {
      for (const rule of report.passedRules!) {
        console.log(chalk.green('  ✓'), rule);
      }
    } else {
      console.log(chalk.gray('  None'));
    }

    if (report.skippedRules && report.skippedRules.length > 0) {
      console.log('');
      console.log(chalk.blue('Skipped Rules:'));
      for (const rule of report.skippedRules!) {
        console.log(chalk.gray('  -'), rule);
      }
    }
  }

  console.log('');

  // Display suggestions for next steps
  if (report.errors.length > 0) {
    console.log(chalk.yellow('Next steps:'));
    console.log(
      chalk.gray('  • Run "scaffold fix" to automatically fix issues')
    );
    console.log(chalk.gray('  • Use --verbose for detailed error information'));
  }
}
