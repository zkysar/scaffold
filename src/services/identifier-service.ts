/**
 * Generic identifier service for SHA-based identification with aliases
 * This abstract service can be extended for specific entity types (templates, snapshots, etc.)
 */

import * as path from 'path';

import * as fs from 'fs-extra';
import { injectable } from 'tsyringe';

import { logger } from '@/lib/logger';
import { shortSHA, isValidSHA, findSHAByPrefix } from '@/lib/sha';


/**
 * Interface for alias mapping storage
 */
export interface AliasMapping {
  [sha: string]: string[];  // SHA -> array of aliases
}

/**
 * Interface for reverse alias lookup
 */
export interface ReverseAliasMapping {
  [alias: string]: string;  // alias -> SHA
}

/**
 * Abstract base class for SHA-based identifier services
 */
export abstract class IdentifierService {
  protected aliasMapping: AliasMapping = {};
  protected reverseAliasMapping: ReverseAliasMapping = {};
  protected readonly aliasFilePath: string;

  constructor(aliasFilePath: string) {
    this.aliasFilePath = aliasFilePath;
  }

  /**
   * Load alias mappings from storage
   */
  async loadAliases(): Promise<void> {
    try {
      if (await fs.pathExists(this.aliasFilePath)) {
        const data = await fs.readJson(this.aliasFilePath);
        this.aliasMapping = data.aliases || {};
        this.buildReverseMapping();
      }
    } catch (error) {
      logger.warn(`Failed to load aliases from ${this.aliasFilePath}:`, error);
      this.aliasMapping = {};
      this.reverseAliasMapping = {};
    }
  }

  /**
   * Save alias mappings to storage
   */
  async saveAliases(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.aliasFilePath));
      await fs.writeJson(this.aliasFilePath, {
        aliases: this.aliasMapping,
        updated: new Date().toISOString()
      }, { spaces: 2 });
    } catch (error) {
      throw new Error(`Failed to save aliases: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resolve an identifier (SHA prefix or alias) to a full SHA
   * @param identifier - SHA (full or partial) or alias
   * @param availableSHAs - List of all available full SHAs
   * @returns Full SHA or null if not found
   */
  async resolveIdentifier(identifier: string, availableSHAs: string[]): Promise<string | null> {
    if (!identifier || typeof identifier !== 'string') {
      return null;
    }

    await this.loadAliases();

    // Check if it's an alias
    const shaFromAlias = this.reverseAliasMapping[identifier];
    if (shaFromAlias) {
      // Verify the SHA still exists
      if (availableSHAs.includes(shaFromAlias)) {
        return shaFromAlias;
      }
      // Remove orphaned alias
      await this.removeAlias(identifier);
      return null;
    }

    // Check if it's a valid SHA (full or partial)
    if (isValidSHA(identifier)) {
      // If it's a full SHA (64 chars), check directly
      if (identifier.length === 64) {
        return availableSHAs.includes(identifier) ? identifier : null;
      }

      // It's a partial SHA, find matches
      const matches = findSHAByPrefix(identifier, availableSHAs);

      if (matches.length === 0) {
        return null;
      }

      if (matches.length === 1) {
        return matches[0];
      }

      // Multiple matches - need to handle ambiguity
      throw new Error(
        `Ambiguous identifier '${identifier}' matches multiple items:\n` +
        matches.map(sha => `  - ${shortSHA(sha, 12)}`).join('\n') +
        '\nPlease use a longer prefix or an alias.'
      );
    }

    return null;
  }

  /**
   * Register an alias for a SHA
   * @param sha - Full SHA-256 hash
   * @param alias - Human-readable alias
   */
  async registerAlias(sha: string, alias: string): Promise<void> {
    if (!sha || sha.length !== 64 || !isValidSHA(sha)) {
      throw new Error('SHA must be a valid 64-character SHA-256 hash');
    }

    if (!alias || typeof alias !== 'string') {
      throw new Error('Alias must be a non-empty string');
    }

    // Validate alias format (alphanumeric, dash, underscore)
    if (!/^[a-zA-Z0-9_-]+$/.test(alias)) {
      throw new Error('Alias must contain only letters, numbers, dashes, and underscores');
    }

    // Check if alias is already used by another SHA
    const existingSHA = this.reverseAliasMapping[alias];
    if (existingSHA && existingSHA !== sha) {
      throw new Error(`Alias '${alias}' is already registered to ${shortSHA(existingSHA)}`);
    }

    await this.loadAliases();

    // Add alias to mappings
    if (!this.aliasMapping[sha]) {
      this.aliasMapping[sha] = [];
    }

    if (!this.aliasMapping[sha].includes(alias)) {
      this.aliasMapping[sha].push(alias);
      this.reverseAliasMapping[alias] = sha;
      await this.saveAliases();
    }
  }

  /**
   * Remove an alias
   * @param alias - The alias to remove
   */
  async removeAlias(alias: string): Promise<void> {
    if (!alias || typeof alias !== 'string') {
      throw new Error('Alias must be a non-empty string');
    }

    await this.loadAliases();

    const sha = this.reverseAliasMapping[alias];
    if (!sha) {
      throw new Error(`Alias '${alias}' not found`);
    }

    // Remove from both mappings
    delete this.reverseAliasMapping[alias];

    if (this.aliasMapping[sha]) {
      this.aliasMapping[sha] = this.aliasMapping[sha].filter(a => a !== alias);
      if (this.aliasMapping[sha].length === 0) {
        delete this.aliasMapping[sha];
      }
    }

    await this.saveAliases();
  }

  /**
   * Get all aliases for a SHA
   * @param sha - Full or partial SHA
   * @param availableSHAs - List of all available full SHAs
   * @returns Array of aliases
   */
  async getAliases(sha: string, availableSHAs: string[]): Promise<string[]> {
    const fullSHA = await this.resolveIdentifier(sha, availableSHAs);
    if (!fullSHA) {
      return [];
    }

    await this.loadAliases();
    return this.aliasMapping[fullSHA] || [];
  }

  /**
   * Get all alias mappings
   * @returns Map of SHA to aliases
   */
  async getAllMappings(): Promise<Map<string, string[]>> {
    await this.loadAliases();
    return new Map(Object.entries(this.aliasMapping));
  }

  /**
   * Clean up orphaned aliases (SHAs that no longer exist)
   * @param availableSHAs - List of all available full SHAs
   */
  async cleanupOrphanedAliases(availableSHAs: string[]): Promise<void> {
    await this.loadAliases();

    let hasChanges = false;
    for (const sha of Object.keys(this.aliasMapping)) {
      if (!availableSHAs.includes(sha)) {
        // Remove all aliases for this SHA
        const aliases = this.aliasMapping[sha];
        for (const alias of aliases) {
          delete this.reverseAliasMapping[alias];
        }
        delete this.aliasMapping[sha];
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await this.saveAliases();
    }
  }

  /**
   * Build reverse mapping from aliases to SHAs
   */
  protected buildReverseMapping(): void {
    this.reverseAliasMapping = {};
    for (const [sha, aliases] of Object.entries(this.aliasMapping)) {
      for (const alias of aliases) {
        this.reverseAliasMapping[alias] = sha;
      }
    }
  }

  /**
   * Format an identifier for display
   * @param sha - Full SHA
   * @param options - Display options
   */
  formatForDisplay(sha: string, options: { verbose?: boolean } = {}): string {
    const shortForm = shortSHA(sha, options.verbose ? 12 : 8);
    const aliases = this.aliasMapping[sha];

    if (aliases && aliases.length > 0) {
      const aliasStr = aliases.map(a => `"${a}"`).join(', ');
      return `${shortForm} (alias: ${aliasStr})`;
    }

    return shortForm;
  }
}