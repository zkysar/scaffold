/**
 * Project completion provider for dynamic project name completions
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { injectable, inject } from 'tsyringe';
import type { CompletionContext, CompletionItem, ProjectManifest } from '@/models';
import type { IProjectManifestService } from '@/services/project-manifest.service';
import { ProjectManifestService } from '@/services/project-manifest.service';

export interface IProjectCompletionProvider {
  /**
   * Get project name completions from current directory
   */
  getProjectCompletions(context: CompletionContext): Promise<CompletionItem[]>;

  /**
   * Get project names as strings
   */
  getProjectNames(context: CompletionContext): Promise<string[]>;

  /**
   * Get projects from a specific directory
   */
  getProjectsFromDirectory(directory: string, context: CompletionContext): Promise<CompletionItem[]>;

  /**
   * Check if a directory contains a scaffold project
   */
  isScaffoldProject(directory: string): Promise<boolean>;
}

@injectable()
export class ProjectCompletionProvider implements IProjectCompletionProvider {
  private cacheExpiry: number = 2 * 60 * 1000; // 2 minutes (shorter than templates)
  private cache: Map<string, { data: CompletionItem[]; timestamp: number }> = new Map();

  constructor(
    @inject(ProjectManifestService) private readonly manifestService: IProjectManifestService
  ) {}

  async getProjectCompletions(context: CompletionContext): Promise<CompletionItem[]> {
    const currentDir = context.currentDirectory;
    const cacheKey = `projects-${currentDir}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return this.filterCompletions(cached.data, context.currentWord);
    }

    try {
      const completions = await this.scanForProjects(currentDir);

      this.cache.set(cacheKey, {
        data: completions,
        timestamp: Date.now(),
      });

      return this.filterCompletions(completions, context.currentWord);
    } catch (error) {
      console.error('Failed to scan for projects:', error);
      return [];
    }
  }

  async getProjectNames(context: CompletionContext): Promise<string[]> {
    const completions = await this.getProjectCompletions(context);
    return completions.map(completion => completion.value);
  }

  async getProjectsFromDirectory(directory: string, context: CompletionContext): Promise<CompletionItem[]> {
    const cacheKey = `projects-${directory}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return this.filterCompletions(cached.data, context.currentWord);
    }

    try {
      const completions = await this.scanForProjects(directory);

      this.cache.set(cacheKey, {
        data: completions,
        timestamp: Date.now(),
      });

      return this.filterCompletions(completions, context.currentWord);
    } catch (error) {
      console.error(`Failed to scan directory ${directory} for projects:`, error);
      return [];
    }
  }

  async isScaffoldProject(directory: string): Promise<boolean> {
    try {
      const manifestPath = path.join(directory, '.scaffold', 'manifest.json');
      return await fs.pathExists(manifestPath);
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear completion cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get project manifest for a specific directory
   */
  async getProjectManifest(directory: string): Promise<ProjectManifest | null> {
    try {
      return await this.manifestService.loadProjectManifest(directory);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get recent projects from user's history
   */
  async getRecentProjects(context: CompletionContext): Promise<CompletionItem[]> {
    // This would integrate with user history/config if available
    // For now, just return current directory projects
    return this.getProjectCompletions(context);
  }

  private async scanForProjects(directory: string): Promise<CompletionItem[]> {
    const completions: CompletionItem[] = [];

    try {
      // Check if current directory is a project
      if (await this.isScaffoldProject(directory)) {
        const manifest = await this.getProjectManifest(directory);
        if (manifest) {
          completions.push({
            value: manifest.projectName,
            description: `Current project (${manifest.templates.length} templates)`,
            type: 'argument',
            deprecated: false,
          });
        }
      }

      // Scan subdirectories for projects
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const subdirPath = path.join(directory, entry.name);

          if (await this.isScaffoldProject(subdirPath)) {
            const manifest = await this.getProjectManifest(subdirPath);

            completions.push({
              value: entry.name,
              description: manifest
                ? `Scaffold project (${manifest.templates.length} templates)`
                : 'Scaffold project',
              type: 'argument',
              deprecated: false,
            });
          }
        }
      }

      // Look for project names in parent directories (limited depth)
      const parentProjects = await this.scanParentDirectories(directory, 2);
      completions.push(...parentProjects);

      return completions;
    } catch (error) {
      console.error(`Error scanning directory ${directory}:`, error);
      return [];
    }
  }

  private async scanParentDirectories(directory: string, maxDepth: number): Promise<CompletionItem[]> {
    const completions: CompletionItem[] = [];
    let currentDir = path.dirname(directory);
    let depth = 0;

    while (depth < maxDepth && currentDir !== path.dirname(currentDir)) {
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            const subdirPath = path.join(currentDir, entry.name);

            if (await this.isScaffoldProject(subdirPath)) {
              const manifest = await this.getProjectManifest(subdirPath);
              const relativePath = path.relative(directory, subdirPath);

              completions.push({
                value: relativePath,
                description: manifest
                  ? `../project (${manifest.templates.length} templates)`
                  : '../project',
                type: 'argument',
                deprecated: false,
              });
            }
          }
        }

        currentDir = path.dirname(currentDir);
        depth++;
      } catch (error) {
        // Stop scanning on error
        break;
      }
    }

    return completions;
  }

  private filterCompletions(completions: CompletionItem[], currentWord: string): CompletionItem[] {
    if (!currentWord) {
      return completions;
    }

    const lowerCurrentWord = currentWord.toLowerCase();
    return completions.filter(completion =>
      completion.value.toLowerCase().startsWith(lowerCurrentWord) ||
      completion.value.toLowerCase().includes(lowerCurrentWord)
    );
  }
}