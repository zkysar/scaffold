/**
 * Completion configuration and context data models
 */

/**
 * Configuration for shell completion system
 */
export interface CompletionConfig {
  shellType: 'bash' | 'zsh' | 'fish';      // Supported shell type
  installedVersion: string | null;          // Version of installed completion script
  installPath: string | null;              // Where completion script is installed
  installDate: Date | null;                // When completion was installed
  isEnabled: boolean;                       // Whether completion is active
  isInstalled: boolean;                     // Whether completion is installed
}

/**
 * Runtime context for generating completions
 */
export interface CompletionContext {
  currentWord: string;                      // Word being completed
  previousWord: string | null;              // Previous word in command line
  commandLine: string[];                    // Parsed command line arguments
  cursorPosition: number;                   // Cursor position in command line
  environmentVars: Map<string, string>;     // Environment variables
  currentDirectory: string;                 // Current working directory
}

/**
 * Interface for completion data providers
 */
export interface CompletionProvider {
  name: string;                            // Provider identifier
  priority: number;                        // Provider priority (higher = first)

  /**
   * Check if this provider can handle the given context
   */
  canHandle(context: CompletionContext): boolean;

  /**
   * Generate completion suggestions for the given context
   */
  getCompletions(context: CompletionContext): Promise<string[]>;

  /**
   * Optional cache key generator for dynamic completions
   */
  getCacheKey?(context: CompletionContext): string | null;

  /**
   * Optional cache TTL in milliseconds
   */
  getCacheTTL?(): number;
}

/**
 * Metadata for CLI commands used in completion
 */
export interface CommandMetadata {
  name: string;                            // Command name (e.g., 'scaffold')
  subcommands: SubcommandMetadata[];       // List of subcommands
  options: OptionMetadata[];               // Global options
  description: string;                     // Help text for command
}

/**
 * Metadata for subcommands
 */
export interface SubcommandMetadata {
  name: string;                           // Subcommand name (e.g., 'new', 'template')
  aliases: string[];                      // Alternative names
  subcommands: SubcommandMetadata[];      // Nested subcommands
  options: OptionMetadata[];              // Subcommand-specific options
  arguments: ArgumentMetadata[];          // Positional arguments
  description: string;                    // Help text
  dynamicCompletionProvider: string | null; // Function name for dynamic completions
}

/**
 * Metadata for command options/flags
 */
export interface OptionMetadata {
  long: string;                          // Long form (e.g., '--verbose')
  short: string | null;                  // Short form (e.g., '-v')
  description: string;                   // Help text
  valueRequired: boolean;                // Whether option takes a value
  valueType: 'string' | 'number' | 'boolean' | 'path' | null; // Type of value
  defaultValue: unknown;                 // Default value
  choices: string[] | null;              // Limited set of values
}

/**
 * Metadata for positional arguments
 */
export interface ArgumentMetadata {
  name: string;                          // Argument name for help
  required: boolean;                     // Is argument required
  variadic: boolean;                     // Accepts multiple values
  completionType: 'static' | 'dynamic' | 'path'; // Completion strategy
  completionProvider: string | null;     // For dynamic completions
  choices: string[] | null;              // For static completions
}