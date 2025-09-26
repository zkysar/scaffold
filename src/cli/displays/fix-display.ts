/**
 * Display for fix command
 */

import { COMMAND_METADATA } from '@/cli/commands/command-metadata';
import { FixResult } from '@/cli/handlers/fix-handler';

import { BaseDisplay, DisplayOptions } from './base-display';

export class FixDisplay extends BaseDisplay {
  display(result: FixResult, options: DisplayOptions): void {
    this.info(`Result: ${result}`);
    this.info(`Options: ${options}`);
    this.notImplemented(COMMAND_METADATA.fix.name);
  }
}
