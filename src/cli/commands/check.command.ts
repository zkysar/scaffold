/**
 * CLI command: scaffold check [project]
 * Validate project structure against applied templates
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';
import {
  ProjectService,
  TemplateService,
  FileSystemService,
} from '../../services';
import type { ValidationReport } from '../../models';

interface CheckCommandOptions {
  verbose?: boolean;
  strictMode?: boolean;
  configPath?: string;
  format?: 'table' | 'json' | 'summary';
}

export function createCheckCommand(): Command {
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
        await handleCheckCommand(projectPath, options);
      } catch (error) {
        console.error(
          chalk.red('Error:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });

  return command;
}

async function handleCheckCommand(
  projectPath: string,
  options: CheckCommandOptions
): Promise<void> {
  const verbose = options.verbose || false;
  const format = options.format || 'table';

  // Determine target path
  const targetPath = projectPath
    ? resolve(projectPath)
    : resolve(process.cwd());

  if (verbose) {
    console.log(chalk.blue('Checking project:'), targetPath);
    console.log(chalk.blue('Options:'), JSON.stringify(options, null, 2));
  }

  // Check if target directory exists
  if (!existsSync(targetPath)) {
    console.error(
      chalk.red('Error:'),
      `Directory "${targetPath}" does not exist`
    );
    process.exit(1);
  }

  // Initialize services
  const fileSystemService = new FileSystemService();
  const templateService = new TemplateService();
  const projectService = new ProjectService(templateService, fileSystemService);

  try {
    // Check if this is a scaffold-managed project
    const manifest = await projectService.loadProjectManifest(targetPath);

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

    // Validate the project
    const report = await projectService.validateProject(targetPath);

    // Display results based on format
    switch (format) {
      case 'json':
        console.log(JSON.stringify(report, null, 2));
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
  console.log(chalk.bold('Validation Summary'));
  console.log('─'.repeat(50));

  if (report.stats.errorCount === 0 && report.stats.warningCount === 0) {
    console.log(chalk.green('✓ All validation checks passed'));
  } else {
    if (report.stats.errorCount > 0) {
      console.log(chalk.red(`✗ ${report.stats.errorCount} error(s) found`));
    }
    if (report.stats.warningCount > 0) {
      console.log(
        chalk.yellow(`⚠ ${report.stats.warningCount} warning(s) found`)
      );
    }
  }

  console.log(chalk.gray(`Files checked: ${report.stats.filesChecked}`));
  console.log(chalk.gray(`Folders checked: ${report.stats.foldersChecked}`));
  console.log(chalk.gray(`Rules evaluated: ${report.stats.rulesEvaluated}`));
  console.log(chalk.gray(`Duration: ${report.stats.duration}ms`));
}

function displayTable(report: ValidationReport, verbose: boolean): void {
  console.log(chalk.bold('Project Validation Report'));
  console.log('─'.repeat(50));

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
