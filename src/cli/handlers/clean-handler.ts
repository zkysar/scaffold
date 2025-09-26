/**
 * Handler for check command business logic
 */

import { injectable } from 'tsyringe';

import { FileSystemService } from '@/services';

export interface CleanOptions {
  dryRun?: boolean;
}

export interface CleanResult {
  dryRun: boolean;
}

@injectable()
export class CleanHandler {
  constructor(private fileSystemService: FileSystemService) {}

  async execute(options: CleanOptions = {}): Promise<CleanResult> {
    if (!options.dryRun) {
      throw new Error('Business logic not yet implemented');
    }
    return {
      dryRun: options.dryRun ?? false,
    };
  }
}
