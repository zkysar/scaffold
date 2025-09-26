/**
 * Display for extend command
 */

import { COMMAND_METADATA } from '@/cli/commands/command-metadata';
import { ExtendResult } from '@/cli/handlers/extend-handler';

import { BaseDisplay, DisplayOptions } from './base-display';

export class ExtendDisplay extends BaseDisplay {
  display(result: ExtendResult, options: DisplayOptions): void {
    this.info(`Result: ${result}`);
    this.info(`Options: ${options}`);
    this.notImplemented(COMMAND_METADATA.extend.name);
  }
}
