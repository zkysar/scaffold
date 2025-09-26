/**
 * Centralized error handling for CLI commands
 */

import { ExitCode } from '@/constants/exit-codes';
import { logger } from '@/lib/logger';

export class ErrorHandler {
  handle(error: Error | unknown): never {
    const message = error instanceof Error ? error.message : String(error);

    // Log the error
    logger.error(message);

    // Determine exit code based on error type
    const exitCode = this.determineExitCode(message);

    // Exit the process
    process.exit(exitCode);
  }

  private determineExitCode(message: string): ExitCode {
    const lowerMessage = message.toLowerCase();

    // System errors (permissions, file system)
    if (
      lowerMessage.includes('eacces') ||
      lowerMessage.includes('eperm') ||
      lowerMessage.includes('permission denied') ||
      lowerMessage.includes('enoent') ||
      lowerMessage.includes('eisdir') ||
      lowerMessage.includes('emfile') ||
      lowerMessage.includes('enospc')
    ) {
      return ExitCode.SYSTEM_ERROR;
    }

    // Default to user error
    return ExitCode.USER_ERROR;
  }
}
