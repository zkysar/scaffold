/**
 * Core types and enums for shell completion system
 */

/**
 * Supported shell types for completion
 */
export enum ShellType {
  BASH = 'bash',
  ZSH = 'zsh',
  FISH = 'fish'
}

/**
 * Individual completion suggestion item
 */
export interface CompletionItem {
  value: string;                          // Text to complete
  description: string | null;             // Optional help text - NOT IMPLEMENTED (always null)
  type: 'command' | 'option' | 'argument' | 'path'; // Completion type
  deprecated: boolean;                    // Show but mark as deprecated - NOT IMPLEMENTED (always false)
}

/**
 * Results returned by completion system
 */
export interface CompletionResult {
  completions: CompletionItem[];          // List of completion suggestions
  cacheKey: string | null;               // For caching dynamic results - NOT IMPLEMENTED (always null)
  cacheExpiry: Date | null;              // When cache entry expires - NOT IMPLEMENTED (always null)
  errors: string[];                      // Non-fatal errors during generation
}

/**
 * Options for completion generation
 */
export interface CompletionOptions {
  maxResults?: number;                    // Limit number of suggestions - NOT IMPLEMENTED
  includeHidden?: boolean;                // Include hidden/deprecated options - NOT IMPLEMENTED
  caseSensitive?: boolean;                // Case-sensitive matching - NOT IMPLEMENTED (always case-sensitive)
  fuzzyMatch?: boolean;                   // Enable fuzzy matching - NOT IMPLEMENTED (only prefix matching)
  sortResults?: boolean;                  // Sort results alphabetically - PARTIALLY IMPLEMENTED (always sorts)
  includeDescriptions?: boolean;          // Include help text in results - NOT IMPLEMENTED
}

/**
 * Cache entry for dynamic completions
 */
export interface CompletionCacheEntry {
  key: string;                           // Unique cache key
  completions: CompletionItem[];         // Cached completion items
  created: Date;                         // When entry was created
  expires: Date;                         // When entry expires
  provider: string;                      // Which provider generated this
  // NOTE: This interface is defined but not used - caching is handled internally by providers
}

/**
 * Shell-specific completion configuration
 */
export interface ShellCompletionConfig {
  shellType: ShellType;                  // Which shell this is for
  scriptPath: string;                    // Path to completion script
  installCommand: string;                // Command to install completion - NOT IMPLEMENTED
  uninstallCommand: string;              // Command to remove completion - NOT IMPLEMENTED
  testCommand: string;                   // Command to test if installed - NOT IMPLEMENTED
  supportsDynamic: boolean;              // Supports dynamic completions - NOT IMPLEMENTED
  supportsDescriptions: boolean;         // Supports completion descriptions - NOT IMPLEMENTED
}

/**
 * Completion installation status
 */
export interface CompletionInstallStatus {
  isInstalled: boolean;                  // Is completion currently installed
  version: string | null;               // Installed version
  installPath: string | null;           // Where it's installed
  lastChecked: Date;                     // When status was last checked
  errors: string[];                     // Any issues detected
}

/**
 * Generated shell completion script
 */
export interface ShellCompletionScript {
  shellType: ShellType;                  // Target shell type
  content: string;                       // Script content
  filename: string;                      // Suggested filename
  installPath: string;                   // Where to install script
}