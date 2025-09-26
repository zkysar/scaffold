/**
 * Handler for check command business logic
 */

import { injectable } from 'tsyringe';

export interface CheckOptions {
  dryRun?: boolean;
}

export interface CheckResult {
  dryRun: boolean;
}

@injectable()
export class CheckHandler {
  constructor() {}

  async execute(options: CheckOptions = {}): Promise<CheckResult> {
    if (!options.dryRun) {
      throw new Error('Business logic not yet implemented');
    }
    return {
      dryRun: options.dryRun ?? false,
    };
  }
}
