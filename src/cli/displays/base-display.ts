/**
 * Base display for all command output formatting
 */

import { logger } from '@/lib/logger';

export interface DisplayOptions {}

export abstract class BaseDisplay {
  success(message: string): void {
    logger.green(`✓ ${message}`);
  }

  error(message: string): void {
    logger.red(`✗ ${message}`);
  }

  warning(message: string): void {
    logger.yellow(`⚠ ${message}`);
  }

  info(message: string): void {
    logger.info(message);
  }

  json(data: unknown): void {
    logger.raw(JSON.stringify(data, null, 2));
  }

  verbose(message: string): void {
    logger.debug(message);
  }

  notImplemented(commandName: string): void {
    this.warning(`Command '${commandName}' is not yet implemented`);
    this.info('This is a skeleton implementation');
  }

  abstract display(result: unknown, options: DisplayOptions): void;
}
