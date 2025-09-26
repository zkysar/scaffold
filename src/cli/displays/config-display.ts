/**
 * Display handler for config command output
 */

import { COMMAND_METADATA } from '@/cli/commands/command-metadata';
import { ConfigResult } from '@/cli/handlers/config-handler';

import { BaseDisplay, DisplayOptions } from './base-display';

export class ConfigDisplay extends BaseDisplay {
  display(result: ConfigResult, options: DisplayOptions): void {
    this.info(`Result: ${result}`);
    this.info(`Options: ${options}`);
    this.notImplemented(COMMAND_METADATA.config.name);
  }
}
