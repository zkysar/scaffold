/**
 * CLI command: scaffold fix [project]
 * Fix project structure issues
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';
import {
  ProjectService,
  TemplateService,
  FileSystemService,
} from '@/services';

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
    .option('--no-backup', 'Skip backup creation')
    .action(async (projectPath: string | undefined, options: FixCommandOptions) => {
      try {
        await handleFixCommand(projectPath, options);
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

async function handleFixCommand(
  projectPath: string | undefined,
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
    process.exit(1);
  }

  // Initialize services
  const fileSystemService = new FileSystemService();
  const templateService = new TemplateService();
  const projectService = new ProjectService(templateService, fileSystemService);

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

  // Fix the project
  const report = await projectService.fixProject(targetPath, dryRun);

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
    process.exit(1);
  } else if (report.stats.warningCount > 0) {
    process.exit(2);
  }
}
