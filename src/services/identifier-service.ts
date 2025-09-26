/**
 * Generic identifier service for SHA-based identification with aliases
 * This abstract service can be extended for specific entity types (templates, snapshots, etc.)
 */

/**
 * Interface for alias mapping storage
 */
export interface AliasMapping {
  [sha: string]: string[]; // SHA -> array of aliases
}

/**
 * Interface for reverse alias lookup
 */
export interface ReverseAliasMapping {
  [alias: string]: string; // alias -> SHA
}

/**
 * Abstract base class for SHA-based identifier services
 */
export abstract class IdentifierService {
  protected aliasMapping: AliasMapping = {};
  protected reverseAliasMapping: ReverseAliasMapping = {};
  protected readonly aliasFilePath: string;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(aliasFilePath: string) {
    this.aliasFilePath = aliasFilePath;
  }

  /**
   * Load alias mappings from storage
   */
  async loadAliases(): Promise<void> {
    throw new Error('Method not implemented');
  }

  /**
   * Save alias mappings to storage
   */
  async saveAliases(): Promise<void> {
    throw new Error('Method not implemented');
  }

  /**
   * Resolve an identifier (SHA prefix or alias) to a full SHA
   * @param identifier - SHA (full or partial) or alias
   * @param availableSHAs - List of all available full SHAs
   * @returns Full SHA or null if not found
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async resolveIdentifier(
    identifier: string,
    availableSHAs: string[]
  ): Promise<string | null> {
    void identifier;
    void availableSHAs;
    throw new Error('Method not implemented');
  }

  /**
   * Register an alias for a SHA
   * @param sha - Full SHA-256 hash
   * @param alias - Human-readable alias
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async registerAlias(sha: string, alias: string): Promise<void> {
    throw new Error('Method not implemented');
  }

  /**
   * Remove an alias
   * @param alias - The alias to remove
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async removeAlias(alias: string): Promise<void> {
    throw new Error('Method not implemented');
  }

  /**
   * Get all aliases for a SHA
   * @param sha - Full or partial SHA
   * @param availableSHAs - List of all available full SHAs
   * @returns Array of aliases
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getAliases(sha: string, availableSHAs: string[]): Promise<string[]> {
    throw new Error('Method not implemented');
  }

  /**
   * Get all alias mappings
   * @returns Map of SHA to aliases
   */
  async getAllMappings(): Promise<Map<string, string[]>> {
    throw new Error('Method not implemented');
  }

  /**
   * Clean up orphaned aliases (SHAs that no longer exist)
   * @param availableSHAs - List of all available full SHAs
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async cleanupOrphanedAliases(availableSHAs: string[]): Promise<void> {
    throw new Error('Method not implemented');
  }

  /**
   * Build reverse mapping from aliases to SHAs
   */
  protected buildReverseMapping(): void {
    throw new Error('Method not implemented');
  }

  /**
   * Format an identifier for display
   * @param sha - Full SHA
   * @param options - Display options
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  formatForDisplay(sha: string, options: { verbose?: boolean } = {}): string {
    throw new Error('Method not implemented');
  }
}
