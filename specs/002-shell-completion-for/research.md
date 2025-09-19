# Technical Research: Shell Completion for CLI

**Feature**: Shell Completion Support
**Date**: 2025-09-19
**Branch**: `002-shell-completion-for`

## Executive Summary
This document resolves technical decisions for implementing shell completion in the scaffold CLI. Research focused on selecting the appropriate completion library, determining shell support scope, and defining dynamic completion strategies.

## Research Findings

### 1. Shell Completion Library Selection

**Decision**: Use Commander.js built-in completion support
**Rationale**:
- Commander.js (already in use) provides basic completion capabilities via `.completion()` method
- Reduces external dependencies
- Integrates seamlessly with existing command structure
- Sufficient for static command/option completion

**Alternatives Considered**:
- **tabtab**: More features but adds dependency, better for complex dynamic completions
- **omelette**: Good cross-platform support but overkill for our needs
- **Manual implementation**: Too complex, reinventing the wheel

**Enhancement Path**: If dynamic completion needs grow beyond Commander's capabilities, migrate to tabtab as it has the best ecosystem support.

### 2. Shell Support Scope

**Decision**: Primary support for bash and zsh, with basic fish support
**Rationale**:
- bash and zsh cover 90%+ of Unix-like CLI users
- fish has growing adoption, worth basic support
- PowerShell deferred to future enhancement (different ecosystem)

**Implementation Strategy**:
- Use Commander's `.completion()` for bash/zsh
- Generate fish completions via simple adaptation
- Document manual installation steps for each shell

### 3. Template Subcommands

**Decision**: Based on CRUD operations
**Available Subcommands**:
- `template list` - List available templates
- `template add <name>` - Add new template
- `template remove <name>` - Remove template
- `template show <name>` - Display template details
- `template update <name>` - Update existing template

**Rationale**: Follows standard CLI patterns, aligns with template management needs

### 4. Dynamic Completion Sources

**Decision**: Support dynamic completion for:
- Project names (from current directory's subdirectories with .scaffold manifest)
- Template names (from global template registry)
- File paths (native shell completion)

**Implementation**:
- Commander's completion function can return dynamic values
- Query file system for projects/templates when needed
- Cache results for performance (100ms target)

### 5. Windows Support Strategy

**Decision**: Git Bash and WSL only initially
**Rationale**:
- Most Windows developers using CLI tools have Git Bash or WSL
- Native PowerShell completion requires different implementation
- Can add PowerShell support based on user demand

### 6. Installation/Uninstallation Process

**Decision**: Dedicated completion commands
**Commands**:
- `scaffold completion install` - Install completion scripts
- `scaffold completion uninstall` - Remove completion scripts
- `scaffold completion script` - Output script for manual installation

**Rationale**:
- Explicit user control over shell modifications
- Clean uninstall path
- Option for manual setup for advanced users

## Technical Specifications

### Completion Script Locations
- **bash**: `~/.bashrc` or `~/.bash_completion`
- **zsh**: `~/.zshrc` or `/usr/local/share/zsh/site-functions`
- **fish**: `~/.config/fish/completions/`

### Performance Requirements
- Static completions: <50ms
- Dynamic completions (file system queries): <100ms
- Use caching where appropriate

### Error Handling
- Graceful fallback if completion setup fails
- Clear error messages during install/uninstall
- Non-blocking: completion errors shouldn't break CLI

## Implementation Priority

1. **Phase 1**: Static completion
   - All commands and subcommands
   - All flags and options
   - bash and zsh support

2. **Phase 2**: Dynamic completion
   - Project name completion
   - Template name completion

3. **Phase 3**: Enhanced support
   - fish shell support
   - PowerShell support (if requested)

## Testing Strategy

### Unit Tests
- Completion function output validation
- Command structure traversal
- Dynamic value generation

### Integration Tests
- Installation script execution
- Uninstallation cleanup
- Shell configuration modification

### Manual Testing Required
- Actual shell completion behavior (cannot be fully automated)
- Cross-shell compatibility
- Edge cases in different environments

## Security Considerations
- Validate all dynamic completion inputs
- Sanitize file paths to prevent injection
- Don't expose sensitive information in completions
- Require explicit user consent for shell modifications

## Maintenance Notes
- Document shell-specific quirks
- Maintain compatibility with Commander.js updates
- Monitor for security advisories in completion handling
- Consider user feedback for enhancement priorities

---

**Status**: All NEEDS CLARIFICATION items resolved
**Next Steps**: Proceed to Phase 1 design and implementation