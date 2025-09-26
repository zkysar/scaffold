/**
 * Handler for template command business logic
 */

import { injectable } from 'tsyringe';

export interface TemplateOptions {
  dryRun?: boolean;
}

export interface TemplateResult {
  dryRun: boolean;
}

@injectable()
export class TemplateHandler {
  constructor() {}

  async execute(options: TemplateOptions = {}): Promise<TemplateResult> {
    if (!options.dryRun) {
      throw new Error('Business logic not yet implemented');
    }
    return {
      dryRun: options.dryRun ?? false,
    };
  }
}
