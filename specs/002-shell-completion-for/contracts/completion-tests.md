# Contract Tests for Shell Completion

**Feature**: Shell Completion Support
**Date**: 2025-09-19
**Branch**: `002-shell-completion-for`

## Test Contracts

### 1. Installation Tests

```typescript
describe('Completion Installation', () => {
  test('should install completion for detected shell', async () => {
    // Given: No existing completion
    // When: Run `scaffold completion install`
    // Then: Completion script added to shell config
    // And: Status shows installed
  });

  test('should handle already installed completion', async () => {
    // Given: Completion already installed
    // When: Run `scaffold completion install`
    // Then: Error with suggestion to use --force
  });

  test('should force reinstall with --force flag', async () => {
    // Given: Completion already installed
    // When: Run `scaffold completion install --force`
    // Then: Old completion replaced
    // And: New version installed
  });

  test('should install for specific shell', async () => {
    // Given: User specifies --shell=zsh
    // When: Run `scaffold completion install --shell=zsh`
    // Then: Zsh completion installed regardless of current shell
  });
});
```

### 2. Uninstallation Tests

```typescript
describe('Completion Uninstallation', () => {
  test('should remove completion from shell config', async () => {
    // Given: Completion is installed
    // When: Run `scaffold completion uninstall`
    // Then: Completion script removed from shell config
    // And: Status shows not installed
  });

  test('should handle no installation gracefully', async () => {
    // Given: No completion installed
    // When: Run `scaffold completion uninstall`
    // Then: Info message that nothing to uninstall
  });

  test('should clean up all artifacts', async () => {
    // Given: Completion installed with cache
    // When: Run `scaffold completion uninstall`
    // Then: Scripts, cache, and config all removed
  });
});
```

### 3. Script Generation Tests

```typescript
describe('Completion Script Generation', () => {
  test('should output bash completion script', async () => {
    // When: Run `scaffold completion script --shell=bash`
    // Then: Valid bash completion script output to stdout
  });

  test('should output zsh completion script', async () => {
    // When: Run `scaffold completion script --shell=zsh`
    // Then: Valid zsh completion script output to stdout
  });

  test('should output fish completion script', async () => {
    // When: Run `scaffold completion script --shell=fish`
    // Then: Valid fish completion script output to stdout
  });

  test('should auto-detect shell if not specified', async () => {
    // Given: Running in bash
    // When: Run `scaffold completion script`
    // Then: Bash script output
  });
});
```

### 4. Status Check Tests

```typescript
describe('Completion Status', () => {
  test('should report installed status', async () => {
    // Given: Completion installed
    // When: Run `scaffold completion status`
    // Then: Shows installed=true, shell, version, path
  });

  test('should report not installed status', async () => {
    // Given: No completion
    // When: Run `scaffold completion status`
    // Then: Shows installed=false
  });

  test('should detect corrupted installation', async () => {
    // Given: Partial/corrupted installation
    // When: Run `scaffold completion status`
    // Then: Shows errors array with issues
  });
});
```

### 5. Completion Generation Tests

```typescript
describe('Completion Generation', () => {
  test('should complete top-level commands', async () => {
    // Given: Input "scaffold "
    // When: Request completions
    // Then: Returns [new, template, check, fix, extend, clean, completion]
  });

  test('should complete subcommands', async () => {
    // Given: Input "scaffold template "
    // When: Request completions
    // Then: Returns [list, add, remove, show, update]
  });

  test('should complete long options', async () => {
    // Given: Input "scaffold new --"
    // When: Request completions
    // Then: Returns all long options for new command
  });

  test('should complete short options', async () => {
    // Given: Input "scaffold new -"
    // When: Request completions
    // Then: Returns all short options for new command
  });

  test('should complete partial commands', async () => {
    // Given: Input "scaffold tem"
    // When: Request completions
    // Then: Returns ["template"]
  });

  test('should handle dynamic project completions', async () => {
    // Given: Projects exist in current directory
    // And: Input "scaffold check "
    // When: Request completions
    // Then: Returns list of project names
  });

  test('should handle dynamic template completions', async () => {
    // Given: Templates exist in registry
    // And: Input "scaffold extend myproject "
    // When: Request completions
    // Then: Returns list of template names
  });

  test('should not suggest already used options', async () => {
    // Given: Input "scaffold new --verbose --"
    // When: Request completions
    // Then: --verbose not in suggestions
  });

  test('should handle option values', async () => {
    // Given: Input "scaffold new --template "
    // When: Request completions
    // Then: Returns available template names
  });

  test('should respect option choices', async () => {
    // Given: Option with limited choices
    // When: Request completions for that option
    // Then: Only returns valid choices
  });
});
```

### 6. Error Handling Tests

```typescript
describe('Completion Error Handling', () => {
  test('should handle missing permissions gracefully', async () => {
    // Given: No write permission to shell config
    // When: Run `scaffold completion install`
    // Then: Clear error message with manual install suggestion
  });

  test('should handle unsupported shell', async () => {
    // Given: Running in unsupported shell
    // When: Run `scaffold completion install`
    // Then: Error with list of supported shells
  });

  test('should handle corrupted cache', async () => {
    // Given: Corrupted completion cache
    // When: Request dynamic completions
    // Then: Regenerates cache, returns completions
  });

  test('should timeout long-running completions', async () => {
    // Given: Slow file system
    // When: Request dynamic completions
    // Then: Returns partial results within 100ms
  });
});
```

### 7. Integration Tests

```typescript
describe('Shell Integration', () => {
  test('should work in bash interactive shell', async () => {
    // Given: Bash shell with completion installed
    // When: Type "scaffold <TAB>"
    // Then: Commands appear in shell
  });

  test('should work in zsh interactive shell', async () => {
    // Given: Zsh shell with completion installed
    // When: Type "scaffold <TAB>"
    // Then: Commands appear with descriptions
  });

  test('should work after scaffold update', async () => {
    // Given: Scaffold CLI updated
    // When: Use completion
    // Then: New commands/options available
  });

  test('should work with aliases', async () => {
    // Given: User has alias for scaffold
    // When: Use completion with alias
    // Then: Completions work correctly
  });
});
```

## Performance Benchmarks

### Expected Performance
- Static completion: <50ms
- Dynamic completion (cached): <75ms
- Dynamic completion (uncached): <100ms
- Installation: <500ms
- Uninstallation: <200ms

### Load Tests
```typescript
describe('Completion Performance', () => {
  test('should handle rapid completion requests', async () => {
    // When: 100 completion requests in 1 second
    // Then: All complete successfully
    // And: Average response <100ms
  });

  test('should handle large command trees', async () => {
    // Given: 50+ commands with subcommands
    // When: Request completion
    // Then: Returns in <100ms
  });

  test('should handle many dynamic options', async () => {
    // Given: Directory with 1000+ projects
    // When: Request project completions
    // Then: Returns first 100 in <100ms
  });
});
```

---

**Note**: These contract tests should fail initially (TDD approach). Implementation will make them pass.