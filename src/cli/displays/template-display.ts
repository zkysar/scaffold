/**
 * Display for template command
 */

import { COMMAND_METADATA } from '@/cli/commands/command-metadata';
import { TemplateResult } from '@/cli/handlers/template-handler';

import { BaseDisplay, DisplayOptions } from './base-display';

export class TemplateDisplay extends BaseDisplay {
  display(result: TemplateResult, options: DisplayOptions): void {
    this.info(`Result: ${result}`);
    this.info(`Options: ${options}`);
    this.notImplemented(COMMAND_METADATA.template.name);
  }
}
