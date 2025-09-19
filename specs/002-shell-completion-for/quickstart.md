# Shell Completion Quick Start Guide

**Feature**: Shell Completion for Scaffold CLI
**Version**: 1.0.0
**Last Updated**: 2025-09-19

## Overview
This guide helps you quickly set up and use shell completion for the scaffold CLI, making command discovery and usage more efficient.

## Installation

### Automatic Installation (Recommended)

```bash
# Auto-detect and install for your current shell
scaffold completion install

# Or specify a shell explicitly
scaffold completion install --shell=bash
scaffold completion install --shell=zsh
scaffold completion install --shell=fish
```

### Manual Installation

If automatic installation fails or you prefer manual setup:

```bash
# Generate the completion script
scaffold completion script --shell=bash > scaffold-completion.sh

# For Bash - add to ~/.bashrc
echo 'source ~/scaffold-completion.sh' >> ~/.bashrc
source ~/.bashrc

# For Zsh - add to ~/.zshrc
echo 'source ~/scaffold-completion.sh' >> ~/.zshrc
source ~/.zshrc

# For Fish - copy to completions directory
scaffold completion script --shell=fish > ~/.config/fish/completions/scaffold.fish
```

## Verify Installation

```bash
# Check completion status
scaffold completion status

# Expected output:
# ✓ Shell completion is installed
# Shell: bash
# Version: 1.0.0
# Install path: /home/user/.bashrc
# Install date: 2025-09-19
```

## Basic Usage

### Command Completion

```bash
# Type and press TAB to see available commands
scaffold <TAB>
# Shows: new template check fix extend clean completion

# Complete partial commands
scaffold tem<TAB>
# Auto-completes to: scaffold template
```

### Subcommand Completion

```bash
# See template subcommands
scaffold template <TAB>
# Shows: list add remove show update

# See completion subcommands
scaffold completion <TAB>
# Shows: install uninstall status script
```

### Option Completion

```bash
# See available options for a command
scaffold new --<TAB>
# Shows: --help --verbose --template --force --skip-git

# Short options also work
scaffold new -<TAB>
# Shows: -h -v -t -f -s
```

### Dynamic Completion

```bash
# Complete project names (when in a directory with scaffold projects)
scaffold check <TAB>
# Shows: my-project another-project web-app

# Complete template names
scaffold new --template <TAB>
# Shows: nodejs-api react-app python-cli rust-lib

# Complete file paths
scaffold template add ./templates/<TAB>
# Shows: available template directories
```

## Advanced Features

### Multiple Value Completion

```bash
# Some options accept multiple values
scaffold new --skip <TAB>
# Shows: git npm docker tests docs
# Can be used multiple times: --skip git --skip npm
```

### Contextual Completion

```bash
# Completions are context-aware
scaffold template add <TAB>
# Shows: only .scaffold template files/directories

scaffold extend my-project <TAB>
# Shows: only compatible templates for the project type
```

### Cached Completions

Dynamic completions (like project and template names) are cached for performance:

```bash
# Clear completion cache if needed
rm ~/.scaffold/completion-cache.json

# Cache automatically refreshes every 5 minutes
```

## Troubleshooting

### Completion Not Working

1. **Check installation status:**
   ```bash
   scaffold completion status
   ```

2. **Reload your shell configuration:**
   ```bash
   # For Bash
   source ~/.bashrc

   # For Zsh
   source ~/.zshrc

   # For Fish
   source ~/.config/fish/config.fish
   ```

3. **Verify shell support:**
   ```bash
   echo $SHELL
   # Should be /bin/bash, /bin/zsh, or /usr/bin/fish
   ```

### Reinstall Completion

```bash
# Force reinstall if corrupted
scaffold completion install --force
```

### Uninstall Completion

```bash
# Remove all completion scripts and cache
scaffold completion uninstall
```

### Debug Mode

```bash
# Enable debug output for completion
export SCAFFOLD_COMPLETION_DEBUG=1
scaffold <TAB>
# Check ~/.scaffold/completion-debug.log
```

## Quick Test Scenarios

### Test 1: Basic Command Completion
```bash
# Should show all main commands
scaffold <TAB>
```

### Test 2: Subcommand Navigation
```bash
# Should show template operations
scaffold template <TAB>
```

### Test 3: Option Discovery
```bash
# Should show all flags for new command
scaffold new --<TAB>
```

### Test 4: Dynamic Project Names
```bash
# Create test projects
scaffold new test-project-1
scaffold new test-project-2

# Should show both projects
scaffold check <TAB>
```

### Test 5: Partial Completion
```bash
# Should auto-complete to 'scaffold template'
scaffold tem<TAB>
```

## Tips and Tricks

1. **Double TAB**: Press TAB twice to see all options when there are multiple matches

2. **Cycle Through Options**: Keep pressing TAB to cycle through available completions

3. **Case Insensitive**: Most shells support case-insensitive completion
   ```bash
   scaffold TEM<TAB>  # Still completes to 'template'
   ```

4. **Abbreviations**: Learn short forms for faster typing
   ```bash
   scaffold n<TAB>     # Completes to 'new'
   scaffold t l<TAB>   # Completes to 'template list'
   ```

5. **History with Completion**: Use arrow keys to recall previous commands, then TAB to modify

## Platform-Specific Notes

### macOS
- Bash users may need to upgrade to Bash 4+ for full feature support
- Install via Homebrew: `brew install bash bash-completion@2`

### Linux
- Most distributions have completion support built-in
- May need to install bash-completion package: `apt install bash-completion`

### Windows
- Use Git Bash or WSL for best compatibility
- Native PowerShell completion planned for future release

## Feedback and Support

- **Report Issues**: Open an issue on the scaffold repository
- **Check Logs**: `~/.scaffold/completion-errors.log`
- **Get Help**: `scaffold completion --help`

---

**Next Steps**: After installation, try the test scenarios above to familiarize yourself with the completion features!