/**
 * Path service for path resolution and normalization
 */

import { injectable } from 'tsyringe';

import { createMockServiceClass } from './mock-factory';

export interface IPathService {
  /**
   * Get absolute path from relative
   */
  resolvePath(...pathSegments: string[]): string;

  /**
   * Get relative path between two paths
   */
  relativePath(from: string, to: string): string;

  /**
   * Normalize path for cross-platform compatibility
   */
  normalizePath(targetPath: string): string;
}

/**
 * Mock implementation of PathService
 * Replace this with actual implementation when ready
 */
@injectable()
export class PathService extends createMockServiceClass<IPathService>(
  'PathService'
) {}
