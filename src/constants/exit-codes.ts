import { logger } from '@/lib/logger';

/**
 * Standard exit codes for CLI commands
 * Following Unix/POSIX conventions
 */
export enum ExitCode {
  SUCCESS = 0,           // Command completed successfully
  USER_ERROR = 1,        // User error (invalid input, missing args, etc.)
  SYSTEM_ERROR = 2,      // System error (permission denied, file not found, etc.)
  COMMAND_NOT_FOUND = 127, // Command not found
}

/**
 * Helper function to exit with the appropriate code
 */
export function exitWithCode(code: ExitCode, message?: string): never {
  if (message) {
    if (code === ExitCode.SUCCESS) {
      logger.info(message);
    } else {
      logger.error(message);
    }
  }
  process.exit(code);
}