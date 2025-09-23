/**
 * CLI command: scaffold clean
 * Cleanup temporary files and cache
 */

import { homedir } from 'os';
import { resolve } from 'path';

import { Command } from 'commander';
import { DependencyContainer } from 'tsyringe';

import { FileSystemService } from '@/services';
import { logger } from '@/lib/logger';

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
    .description('Cleanup temporary files and cache')
    .option('--all', 'Clean all temporary files and cache')
    .option('--cache', 'Clean cache files')
    .option('--temp', 'Clean temporary files (default)')
    .option('--dry-run', 'Show what would be cleaned without actually cleaning')
    .option('--verbose', 'Show detailed output')
    .action(async (options: CleanCommandOptions) => {
      try {
        await handleCleanCommand(options, container);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
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

  // Resolve services from DI container
  const fileSystemService = container.resolve(FileSystemService);

  if (verbose) {
    logger.infoBlue('Clean options:');
    logger.info(JSON.stringify(options, null, 2));
  }

  // Determine what to clean
  const cleanAll = options.all || false;
  const cleanCache = options.cache || cleanAll;
  let cleanTemp = options.temp || cleanAll;

  // If no specific options provided, clean temp files by default
  if (!cleanCache && !cleanTemp) {
    cleanTemp = true;
  }

  // Set dry-run mode on file service
  const originalDryRun = fileSystemService.isDryRun;
  if (dryRun) {
    fileSystemService.setDryRun(true);
  }

  try {
    const cleanPaths: { path: string; description: string }[] = [];

    if (cleanTemp) {
      const tempPath = resolve(process.cwd(), '.scaffold-temp');
      cleanPaths.push({ path: tempPath, description: 'Temporary files (.scaffold-temp/)' });
    }

    if (cleanCache) {
      const cachePath = resolve(homedir(), '.scaffold', 'cache');
      cleanPaths.push({ path: cachePath, description: 'Cache files (~/.scaffold/cache/)' });
    }

    if (dryRun) {
      logger.warn('DRY RUN - Showing what would be cleaned:');
      logger.info('');
    } else {
      logger.infoBlue('Cleaning scaffold files...');
    }

    let itemsCleaned = 0;
    const itemsToClean: string[] = [];

    for (const { path, description } of cleanPaths) {
      if (await fileSystemService.exists(path)) {
        if (dryRun) {
          logger.gray(`Would clean ${description}:`);
          itemsToClean.push(path);
        } else if (verbose) {
          logger.gray(`Cleaning ${description}...`);
          logger.gray(`  Path: ${path}`);
        } else {
          logger.gray(`Cleaning ${description}...`);
        }

        // This will log [DRY RUN] messages when in dry-run mode
        await fileSystemService.deletePath(path, { recursive: true, force: true });
        itemsCleaned++;
      }
    }

    if (dryRun) {
      if (itemsToClean.length > 0) {
        logger.info('');
        logger.success('✓ Dry run completed successfully!');
        logger.gray('No files were actually deleted.');
      } else {
        logger.warn('No files found to clean.');
      }
    } else {
      if (itemsCleaned > 0) {
        logger.success('✓ Cleanup completed successfully!');
        logger.infoBlue(`Items cleaned: ${itemsCleaned}`);
      } else {
        logger.warn('No files found to clean.');
      }
    }
  } finally {
    // Restore original dry-run mode
    fileSystemService.setDryRun(originalDryRun);
  }
}