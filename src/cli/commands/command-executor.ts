/**
 * Executor for CLI commands - handles common execution patterns
 */

import { injectable } from 'tsyringe';

import { ErrorHandler } from '@/cli/errors/error-handler';

@injectable()
export class CommandExecutor {
  constructor(private errorHandler: ErrorHandler) {}

  /**
   * Execute a command handler and display the results
   * Handles errors automatically
   */
  async execute<TResult>(
    handler: () => Promise<TResult>,
    display: (result: TResult) => void
  ): Promise<void> {
    try {
      const result = await handler();
      display(result);
    } catch (error) {
      this.errorHandler.handle(error);
    }
  }

  /**
   * Execute a command handler with no display
   * Useful for commands that handle their own output
   */
  async executeWithoutDisplay(handler: () => Promise<void>): Promise<void> {
    try {
      await handler();
    } catch (error) {
      this.errorHandler.handle(error);
    }
  }
}
