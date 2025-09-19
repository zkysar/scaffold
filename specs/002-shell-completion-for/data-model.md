# Data Model: Shell Completion for CLI

**Feature**: Shell Completion Support
**Date**: 2025-09-19
**Branch**: `002-shell-completion-for`

## Overview
This document defines the data structures and relationships for the shell completion feature. The model focuses on command metadata, completion configurations, and dynamic data providers.

## Core Entities

### 1. CompletionConfig
**Purpose**: Stores shell completion configuration and state

**Fields**:
- `shellType`: string (enum: 'bash' | 'zsh' | 'fish')
- `installedVersion`: string | null (version of installed completion script)
- `installPath`: string | null (where completion script is installed)
- `installDate`: Date | null (when completion was installed)
- `isEnabled`: boolean (whether completion is active)

**Validations**:
- shellType must be supported shell
- installPath must be valid file path if not null
- installedVersion follows semver format

### 2. CommandMetadata
**Purpose**: Describes available commands for completion

**Fields**:
- `name`: string (command name, e.g., 'scaffold')
- `subcommands`: SubcommandMetadata[] (list of subcommands)
- `options`: OptionMetadata[] (global options)
- `description`: string (help text for command)

### 3. SubcommandMetadata
**Purpose**: Describes subcommands and their structure

**Fields**:
- `name`: string (subcommand name, e.g., 'new', 'template')
- `aliases`: string[] (alternative names)
- `subcommands`: SubcommandMetadata[] (nested subcommands)
- `options`: OptionMetadata[] (subcommand-specific options)
- `arguments`: ArgumentMetadata[] (positional arguments)
- `description`: string (help text)
- `dynamicCompletionProvider`: string | null (function name for dynamic completions)

### 4. OptionMetadata
**Purpose**: Describes command options/flags

**Fields**:
- `long`: string (long form, e.g., '--verbose')
- `short`: string | null (short form, e.g., '-v')
- `description`: string (help text)
- `valueRequired`: boolean (whether option takes a value)
- `valueType`: string | null ('string' | 'number' | 'boolean' | 'path')
- `defaultValue`: any | null
- `choices`: string[] | null (if limited set of values)

### 5. ArgumentMetadata
**Purpose**: Describes positional arguments

**Fields**:
- `name`: string (argument name for help)
- `required`: boolean
- `variadic`: boolean (accepts multiple values)
- `completionType`: string ('static' | 'dynamic' | 'path')
- `completionProvider`: string | null (for dynamic completions)
- `choices`: string[] | null (for static completions)

### 6. CompletionContext
**Purpose**: Runtime context for generating completions

**Fields**:
- `currentWord`: string (word being completed)
- `previousWord`: string | null
- `commandLine`: string[] (parsed command line)
- `cursorPosition`: number
- `environmentVars`: Map<string, string>
- `currentDirectory`: string

### 7. CompletionResult
**Purpose**: Results returned by completion system

**Fields**:
- `completions`: CompletionItem[]
- `cacheKey`: string | null (for caching dynamic results)
- `cacheExpiry`: Date | null
- `errors`: string[] (non-fatal errors during generation)

### 8. CompletionItem
**Purpose**: Individual completion suggestion

**Fields**:
- `value`: string (text to complete)
- `description`: string | null (optional help text)
- `type`: string ('command' | 'option' | 'argument' | 'path')
- `deprecated`: boolean (show but mark as deprecated)

## Relationships

```
CommandMetadata
    ├── SubcommandMetadata[] (1:n)
    │   ├── SubcommandMetadata[] (recursive, 1:n)
    │   ├── OptionMetadata[] (1:n)
    │   └── ArgumentMetadata[] (1:n)
    └── OptionMetadata[] (1:n)

CompletionContext → CompletionResult (runtime generation)
    └── CompletionItem[] (1:n)

CompletionConfig (1:1 per shell type)
```

## State Transitions

### CompletionConfig States
```
NotInstalled → Installing → Installed
     ↑            ↓            ↓
     ←────── Failed ←──── Uninstalling
```

### Completion Generation Flow
```
Parse Context → Identify Position → Generate Candidates → Filter → Return Results
                                           ↓
                                    Cache if Dynamic
```

## Data Sources

### Static Data
- Command structure from Commander.js configuration
- Predefined option values and choices
- Help text and descriptions

### Dynamic Data
- **Project names**: Scan current directory for `.scaffold/manifest.json` files
- **Template names**: Read from `~/.scaffold/templates/` directory
- **File paths**: Delegate to shell's native path completion
- **Recent values**: Store in `~/.scaffold/completion-cache.json`

## Validation Rules

1. **Command Structure**
   - No duplicate command/subcommand names
   - Options must have unique long forms
   - Required arguments must come before optional ones

2. **Completion Items**
   - Values must not contain shell special characters unless escaped
   - Descriptions should be under 80 characters
   - Deprecated items shown last in results

3. **Cache Management**
   - Cache entries expire after 5 minutes
   - Cache size limited to 100 entries
   - Clear cache on scaffold configuration changes

## Performance Considerations

### Caching Strategy
- Static command structure cached on first load
- Dynamic completions cached with TTL
- Invalidate cache on:
  - Template additions/removals
  - Project structure changes
  - Configuration updates

### Optimization Points
- Lazy load subcommand metadata
- Index commands by prefix for fast lookup
- Limit file system scans to immediate subdirectories
- Use async I/O for dynamic providers

## Security Considerations

1. **Input Sanitization**
   - Escape special characters in completion values
   - Validate paths to prevent directory traversal
   - Limit completion context size to prevent DoS

2. **Information Disclosure**
   - Don't complete sensitive file names
   - Hide system paths in completions
   - Respect .gitignore patterns

## Error Handling

### Graceful Degradation
- If dynamic provider fails → return static completions only
- If cache corrupted → regenerate without cache
- If shell detection fails → provide generic completions

### User Feedback
- Log errors to `~/.scaffold/completion-errors.log`
- Show warning on `scaffold completion status` command
- Never break tab completion entirely

---

**Status**: Data model defined
**Next**: Generate contracts and test specifications