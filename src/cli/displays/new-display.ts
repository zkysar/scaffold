/**
 * Display for 'new' command - Format project creation output
 */

import { COMMAND_METADATA } from '@/cli/commands/command-metadata';
import { NewResult } from '@/cli/handlers/new-handler';

import { BaseDisplay, DisplayOptions } from './base-display';

export class NewDisplay extends BaseDisplay {
  display(result: NewResult, options: DisplayOptions): void {
    this.info(`Result: ${result}`);
    this.info(`Options: ${options}`);
    this.notImplemented(COMMAND_METADATA.new.name);
  }
}
