/**
 * Handler for show command business logic
 */

import { injectable } from 'tsyringe';

export interface ShowOptions {
  dryRun?: boolean;
}

export interface ShowResult {
  dryRun: boolean;
}

@injectable()
export class ShowHandler {
  constructor() {}

  async execute(options: ShowOptions = {}): Promise<ShowResult> {
    if (!options.dryRun) {
      throw new Error('Business logic not yet implemented');
    }
    return {
      dryRun: options.dryRun ?? false,
    };
  }
}
