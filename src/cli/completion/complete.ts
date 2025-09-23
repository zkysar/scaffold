/**
 * CLI command: scaffold completion complete
 * Hidden command called by shells for dynamic completion
 */

import { Command } from 'commander';
import { CompletionService } from '@/services';
import type { CompletionContext } from '@/models';

interface CompleteCommandOptions {
  line?: string;
  point?: string;
}

export function createCompleteCommand(): Command {
  const command = new Command('complete');

  command
    .description('Generate dynamic completions for shell')
    .option('--line <line>', 'Current command line')
    .option('--point <point>', 'Cursor position in command line')
    .action(async (options: CompleteCommandOptions) => {
      try {
        await handleCompleteCommand(options);
      } catch (error) {
        // Silent failure for completion - don't show errors to user in shell
        process.exit(1);
      }
    })
    .configureHelp({
      visibleCommands: () => [], // Hide command from help
    });

  return command;
}

async function handleCompleteCommand(options: CompleteCommandOptions): Promise<void> {
  const completionService = new CompletionService();

  // Parse completion context from shell parameters
  const context = parseCompletionContext(options);

  if (!context) {
    // Invalid context, return empty
    process.exit(0);
  }

  try {
    // Generate completions using the service
    const result = await completionService.generateCompletions(context);

    // Output completions in format expected by shells
    if (result.completions.length > 0) {
      // Output as JSON lines for parsing by shell scripts
      result.completions.forEach(completion => {
        console.log(JSON.stringify({ value: completion.value }));
      });
    }

    process.exit(0);
  } catch (error) {
    // Silent failure for completion
    process.exit(1);
  }
}

function parseCompletionContext(options: CompleteCommandOptions): CompletionContext | null {
  const { line, point } = options;

  if (!line || !point) {
    return null;
  }

  const cursorPosition = parseInt(point, 10);
  if (isNaN(cursorPosition)) {
    return null;
  }

  // Parse command line into words
  const commandLine = parseCommandLine(line);

  // Extract current word being completed and previous word
  const { currentWord, previousWord } = extractCurrentAndPreviousWords(line, cursorPosition);

  // Get environment variables
  const environmentVars = new Map<string, string>();
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      environmentVars.set(key, value);
    }
  }

  // Get current working directory
  const currentDirectory = process.cwd();

  return {
    currentWord,
    previousWord,
    commandLine,
    cursorPosition,
    environmentVars,
    currentDirectory,
  };
}

function parseCommandLine(line: string): string[] {
  // Simple shell-style parsing - split on spaces but handle quotes
  const words: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = '';
    } else if (char === ' ' && !inQuotes) {
      if (current.length > 0) {
        words.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current.length > 0) {
    words.push(current);
  }

  return words;
}

function extractCurrentAndPreviousWords(line: string, cursorPosition: number): {
  currentWord: string;
  previousWord: string | null;
} {
  // Extract the part of the line up to the cursor
  const lineUpToCursor = line.substring(0, cursorPosition);

  // Find word boundaries (spaces)
  const words = parseCommandLine(lineUpToCursor);

  // Check if cursor is at end of a word or in the middle of whitespace
  const isAtWordEnd = cursorPosition < line.length && line[cursorPosition] !== ' ';
  const isAfterSpace = cursorPosition > 0 && line[cursorPosition - 1] === ' ';

  let currentWord = '';
  let previousWord: string | null = null;

  if (words.length > 0) {
    if (isAfterSpace && !isAtWordEnd) {
      // Cursor is after a space, starting a new word
      currentWord = '';
      previousWord = words[words.length - 1];
    } else {
      // Cursor is in the middle or at the end of a word
      currentWord = words[words.length - 1] || '';
      previousWord = words.length > 1 ? words[words.length - 2] : null;
    }
  }

  return { currentWord, previousWord };
}