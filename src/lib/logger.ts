/**
 * Centralized logging utility
 * Provides consistent formatting and logging behavior across the application
 */

import chalk from 'chalk';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'success';

export interface LoggerOptions {
  verbose?: boolean;
  noColor?: boolean;
}

export class Logger {
  private options: LoggerOptions;

  constructor(options: LoggerOptions = {}) {
    this.options = options;
  }

  /**
   * Update logger options (useful for dynamic configuration)
   */
  setOptions(options: Partial<LoggerOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | string): void {
    const prefix = this.options.noColor ? 'Error:' : chalk.red('Error:');
    console.error(prefix, message);

    if (error && this.options.verbose) {
      if (error instanceof Error) {
        console.error(error.stack || error.message);
      } else {
        console.error(error);
      }
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string): void {
    const prefix = this.options.noColor ? '⚠' : chalk.yellow('⚠');
    console.warn(prefix, message);
  }

  /**
   * Log a success message
   */
  success(message: string): void {
    const prefix = this.options.noColor ? '✓' : chalk.green('✓');
    console.log(prefix, message);
  }

  /**
   * Log an info message
   */
  info(message: string): void {
    console.log(message);
  }

  /**
   * Log an info message with blue color
   */
  infoBlue(message: string): void {
    if (this.options.noColor) {
      console.log(message);
    } else {
      console.log(chalk.blue(message));
    }
  }

  /**
   * Log a message with gray color
   */
  gray(message: string): void {
    if (this.options.noColor) {
      console.log(message);
    } else {
      console.log(chalk.gray(message));
    }
  }

  /**
   * Log a bold message
   */
  bold(message: string): void {
    if (this.options.noColor) {
      console.log(message);
    } else {
      console.log(chalk.bold(message));
    }
  }

  /**
   * Log a yellow message
   */
  yellow(message: string): void {
    if (this.options.noColor) {
      console.log(message);
    } else {
      console.log(chalk.yellow(message));
    }
  }

  /**
   * Log a green message
   */
  green(message: string): void {
    if (this.options.noColor) {
      console.log(message);
    } else {
      console.log(chalk.green(message));
    }
  }

  /**
   * Log a red message
   */
  red(message: string): void {
    if (this.options.noColor) {
      console.log(message);
    } else {
      console.log(chalk.red(message));
    }
  }

  /**
   * Log a debug message (only shown in verbose mode)
   */
  debug(message: string): void {
    if (this.options.verbose) {
      const prefix = this.options.noColor ? 'Debug:' : chalk.magenta('Debug:');
      console.log(prefix, message);
    }
  }

  /**
   * Log a dry run message
   */
  dryRun(message: string): void {
    const prefix = this.options.noColor ? '[DRY RUN]' : chalk.cyan('[DRY RUN]');
    console.log(prefix, message);
  }

  /**
   * Log an empty line
   */
  newLine(): void {
    console.log('');
  }

  /**
   * Log a formatted key-value pair
   */
  keyValue(key: string, value: string, keyColor?: string): void {
    if (this.options.noColor || !keyColor) {
      console.log(`${key}:`, value);
    } else {
      const coloredKey =
        keyColor === 'blue'
          ? chalk.blue(key)
          : keyColor === 'gray'
            ? chalk.gray(key)
            : keyColor === 'green'
              ? chalk.green(key)
              : keyColor === 'yellow'
                ? chalk.yellow(key)
                : key;
      console.log(`${coloredKey}:`, value);
    }
  }

  /**
   * Raw console.log (for cases where we need direct access)
   */
  raw(...args: unknown[]): void {
    console.log(...args);
  }

  /**
   * Raw console.error (for cases where we need direct access)
   */
  rawError(...args: unknown[]): void {
    console.error(...args);
  }
}

// Create a default logger instance
export const logger = new Logger();

// Export a function to create logger instances with specific options
export function createLogger(options: LoggerOptions): Logger {
  return new Logger(options);
}

// Export convenience functions that use the default logger
export const log = {
  error: (message: string, error?: Error | string): void =>
    logger.error(message, error),
  warn: (message: string): void => logger.warn(message),
  success: (message: string): void => logger.success(message),
  info: (message: string): void => logger.info(message),
  infoBlue: (message: string): void => logger.infoBlue(message),
  gray: (message: string): void => logger.gray(message),
  bold: (message: string): void => logger.bold(message),
  yellow: (message: string): void => logger.yellow(message),
  green: (message: string): void => logger.green(message),
  red: (message: string): void => logger.red(message),
  debug: (message: string): void => logger.debug(message),
  dryRun: (message: string): void => logger.dryRun(message),
  newLine: (): void => logger.newLine(),
  keyValue: (key: string, value: string, keyColor?: string): void =>
    logger.keyValue(key, value, keyColor),
  raw: (...args: unknown[]): void => logger.raw(...args),
  rawError: (...args: unknown[]): void => logger.rawError(...args),
};
