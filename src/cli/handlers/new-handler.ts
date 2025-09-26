/**
 * Handler for new command business logic
 */

import { injectable } from 'tsyringe';

export interface NewOptions {
  dryRun?: boolean;
}

export interface NewResult {
  dryRun: boolean;
}

@injectable()
export class NewHandler {
  constructor() {}

  async execute(options: NewOptions = {}): Promise<NewResult> {
    if (!options.dryRun) {
      throw new Error('Business logic not yet implemented');
    }
    return {
      dryRun: options.dryRun ?? false,
    };
  }
}
