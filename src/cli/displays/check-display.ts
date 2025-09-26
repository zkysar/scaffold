/**
 * Display for check command
 */

import { COMMAND_METADATA } from '@/cli/commands/command-metadata';
import { CheckResult } from '@/cli/handlers/check-handler';

import { BaseDisplay, DisplayOptions } from './base-display';

export class CheckDisplay extends BaseDisplay {
  display(result: CheckResult, options: DisplayOptions): void {
    this.info(`Result: ${result}`);
    this.info(`Options: ${options}`);
    this.notImplemented(COMMAND_METADATA.check.name);
  }
}
