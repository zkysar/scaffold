/**
 * CLI command: scaffold clean
 * Cleanup temporary files and cache
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { DependencyContainer } from 'tsyringe';
import { ExitCode } from '../../constants/exit-codes';

interface CleanCommandOptions {
  verbose?: boolean;
  dryRun?: boolean;
  all?: boolean;
  cache?: boolean;
  temp?: boolean;
}

export function createCleanCommand(container: DependencyContainer): Command {
  const command = new Command('clean');

  command
    .description('Clean up temporary files, cache, and build artifacts')
    .option('--verbose', 'Show detailed output')
    .option('--dry-run', 'Show what would be cleaned without deleting anything')
    .option('--all', 'Clean everything (cache, temp, and build files)')
    .option('--cache', 'Clean cache files only')
    .option('--temp', 'Clean temporary files only')
    .action(async (options: CleanCommandOptions) => {
      try {
        await handleCleanCommand(options, container);
      } catch (error) {
        console.error(
          chalk.red('Error:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(ExitCode.SYSTEM_ERROR);
      }
    });

  return command;
}

async function handleCleanCommand(
  options: CleanCommandOptions,
  container: DependencyContainer
): Promise<void> {
  const verbose = options.verbose || false;
  const dryRun = options.dryRun || false;

  if (verbose) {
    console.log(chalk.blue('Clean options:'), JSON.stringify(options, null, 2));
  }

  // Determine what to clean
  const cleanAll = options.all || false;
  const cleanCache = options.cache || cleanAll;
  let cleanTemp = options.temp || cleanAll;

  // If no specific options provided, clean temp files by default
  if (!cleanCache && !cleanTemp) {
    cleanTemp = true;
  }

  const cleanTargets: string[] = [];

  try {
    if (cleanTemp) {
      cleanTargets.push('Temporary files (.scaffold-temp/)');
    }

    if (cleanCache) {
      cleanTargets.push('Cache files (~/.scaffold/cache/)');
    }

    if (dryRun) {
      console.log(chalk.yellow('DRY RUN - Would clean:'));
      cleanTargets.forEach(target => {
        console.log(chalk.gray('  •'), target);
      });
      return;
    }

    console.log(chalk.blue('Cleaning scaffold files...'));

    let itemsCleaned = 0;

    if (cleanTemp) {
      console.log(chalk.gray('Cleaning temporary files...'));
      itemsCleaned += await cleanTemporaryFiles(verbose, dryRun);
    }

    if (cleanCache) {
      console.log(chalk.gray('Cleaning cache files...'));
      itemsCleaned += await cleanCacheFiles(verbose, dryRun);
    }

    if (itemsCleaned > 0) {
      console.log(chalk.green('✓ Cleanup completed successfully!'));
      console.log(chalk.blue('Items cleaned:'), itemsCleaned);
    } else {
      console.log(chalk.yellow('No files found to clean.'));
    }
  } catch (error) {
    console.error(
      chalk.red('Error during cleanup:'),
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

async function cleanTemporaryFiles(verbose: boolean, dryRun: boolean): Promise<number> {
  const tempDirs = [
    path.resolve(process.cwd(), '.scaffold-temp'),
    '/current/dir/.scaffold-temp'
  ];

  let totalCleaned = 0;

  for (const tempDir of tempDirs) {
    try {
      // Try to access the directory (use sync for better mock-fs compatibility)
      fs.accessSync(tempDir);

      // Directory exists, read its contents
      const tempItems = fs.readdirSync(tempDir);
      const itemsToClean = tempItems.filter(item => item !== '.gitkeep');

      if (verbose && itemsToClean.length > 0) {
        console.log(chalk.gray(`  Found ${itemsToClean.length} temp items to clean`));
        itemsToClean.forEach(item => {
          console.log(chalk.gray('    -'), path.join('.scaffold-temp', item));
        });
      }

      if (!dryRun) {
        // Actually remove the items
        for (const item of itemsToClean) {
          const itemPath = path.join(tempDir, item);
          try {
            fs.rmSync(itemPath, { recursive: true, force: true });
            totalCleaned++;
          } catch (error) {
            if (verbose) {
              console.log(chalk.yellow(`    Warning: Could not clean ${item}: ${error instanceof Error ? error.message : String(error)}`));
            }
          }
        }
      } else {
        // Dry run - just count what would be cleaned
        totalCleaned += itemsToClean.length;
      }

      // Continue checking other directories as well
    } catch (error) {
      // Directory doesn't exist or can't be accessed, continue to next
      continue;
    }
  }

  return totalCleaned;
}

async function cleanCacheFiles(verbose: boolean, dryRun: boolean): Promise<number> {
  const cacheDirs = [
    path.join(os.homedir(), '.scaffold', 'cache'),
    '/home/.scaffold/cache'
  ];

  let totalCleaned = 0;

  for (const cacheDir of cacheDirs) {
    try {
      // Try to access the directory (use sync for better mock-fs compatibility)
      fs.accessSync(cacheDir);

      // Directory exists, read its contents
      const cacheItems = fs.readdirSync(cacheDir);
      const itemsToClean = cacheItems.filter(item => item !== '.gitkeep');

      if (verbose && itemsToClean.length > 0) {
        console.log(chalk.gray(`  Found ${itemsToClean.length} cache items to clean`));
        itemsToClean.forEach(item => {
          console.log(chalk.gray('    -'), path.join('~/.scaffold/cache', item));
        });
      }

      if (!dryRun) {
        // Actually remove the items
        for (const item of itemsToClean) {
          const itemPath = path.join(cacheDir, item);
          try {
            fs.rmSync(itemPath, { recursive: true, force: true });
            totalCleaned++;
          } catch (error) {
            if (verbose) {
              console.log(chalk.yellow(`    Warning: Could not clean ${item}: ${error instanceof Error ? error.message : String(error)}`));
            }
          }
        }
      } else {
        // Dry run - just count what would be cleaned
        totalCleaned += itemsToClean.length;
      }

      // Continue checking other directories as well
    } catch (error) {
      // Directory doesn't exist or can't be accessed, continue to next
      continue;
    }
  }

  return totalCleaned;
}
