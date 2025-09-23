/**
 * Error utility functions for enhanced error handling with context and recovery suggestions
 */

export interface ErrorContext {
  suggestion?: string;
  path?: string;
  operation?: string;
}

/**
 * Enhance error with additional context and recovery suggestions
 */
export function enhanceError(
  originalError: any,
  message: string,
  context: ErrorContext
): Error {
  const error = new Error(`${message}\n${context.suggestion || ''}`);

  // Add context as properties
  Object.assign(error, {
    operation: context.operation,
    path: context.path,
    originalError,
  });

  // Preserve original error details in stack trace
  if (originalError && originalError.stack) {
    error.stack = `${error.message}\nCaused by: ${originalError.stack}`;
  }

  return error;
}
