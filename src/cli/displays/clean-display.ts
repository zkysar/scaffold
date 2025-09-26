/**
 * Display for clean command
 */

import { COMMAND_METADATA } from '@/cli/commands/command-metadata';
import { CleanResult } from '@/cli/handlers/clean-handler';

import { BaseDisplay, DisplayOptions } from './base-display';

export class CleanDisplay extends BaseDisplay {
  display(result: CleanResult, options: DisplayOptions): void {
    this.info(`Result: ${result}`);
    this.info(`Options: ${options}`);
    this.notImplemented(COMMAND_METADATA.clean.name);
  }
}
