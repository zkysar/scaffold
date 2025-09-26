/**
 * Setup for integration tests
 * Ensures CLI artifacts are built before running tests
 */

import 'reflect-metadata';
import * as path from 'path';
import * as fs from 'fs-extra';
import { execSync } from 'child_process';

import { logger } from '@/lib/logger';
import { configureContainer } from '@/di/container';

// Configure DI container for integration tests
configureContainer();

// Global integration test setup
beforeAll(async () => {
  const cliPath = path.join(__dirname, '../dist/cli/index.js');

  // Check if CLI exists
  if (!(await fs.pathExists(cliPath))) {
    logger.info('CLI not found, building project...');
    try {
      execSync('npm run build', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
      });
    } catch (error) {
      throw new Error(`Failed to build project: ${error}`);
    }
  }

  // Verify CLI is executable
  if (!(await fs.pathExists(cliPath))) {
    throw new Error(`CLI not found at ${cliPath} after build`);
  }

  logger.info(`CLI found at: ${cliPath}`);
});

// Increase timeout for integration tests
jest.setTimeout(60000);
