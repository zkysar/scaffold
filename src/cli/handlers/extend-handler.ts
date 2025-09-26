/**
 * Handler for extend command business logic
 */

import { injectable } from 'tsyringe';

export interface ExtendOptions {
  dryRun?: boolean;
}

export interface ExtendResult {
  dryRun: boolean;
}

@injectable()
export class ExtendHandler {
  constructor() {}

  async execute(options: ExtendOptions = {}): Promise<ExtendResult> {
    if (!options.dryRun) {
      throw new Error('Business logic not yet implemented');
    }
    return {
      dryRun: options.dryRun ?? false,
    };
  }
}
