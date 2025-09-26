/**
 * Path resolution utilities for CLI commands
 */

import { resolve } from 'path';

export class PathResolver {
  /**
   * Resolve a path relative to the current working directory
   */
  static resolve(path?: string): string {
    return path ? resolve(path) : resolve(process.cwd());
  }

  /**
   * Get the base path and target path for a project
   */
  static getProjectPaths(projectPath?: string): {
    basePath: string;
    targetPath: string;
  } {
    const targetPath = this.resolve(projectPath);
    const basePath = resolve(targetPath, '..');

    return { basePath, targetPath };
  }
}
