/**
 * Handler for fix command business logic
 */

import { injectable } from 'tsyringe';

export interface FixOptions {
  dryRun?: boolean;
}

export interface FixResult {
  dryRun: boolean;
}

@injectable()
export class FixHandler {
  constructor() {}

  async execute(options: FixOptions = {}): Promise<FixResult> {
    if (!options.dryRun) {
      throw new Error('Business logic not yet implemented');
    }
    return {
      dryRun: options.dryRun ?? false,
    };
  }
}
