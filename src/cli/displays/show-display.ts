/**
 * Display for show command output formatting
 */
import { COMMAND_METADATA } from '@/cli/commands/command-metadata';
import { ShowResult } from '@/cli/handlers/show-handler';

import { BaseDisplay, DisplayOptions } from './base-display';

export class ShowDisplay extends BaseDisplay {
  display(result: ShowResult, options: DisplayOptions): void {
    this.info(`Result: ${result}`);
    this.info(`Options: ${options}`);
    this.notImplemented(COMMAND_METADATA.show.name);
  }
}
