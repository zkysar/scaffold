#!/bin/bash

# Bash completion script for scaffold CLI
# This script provides tab completion for the scaffold command and all its subcommands

_scaffold_completions() {
    local cur prev words cword
    _init_completion || return

    # Main commands
    local commands="new template check fix extend show config clean"

    # Global options available for all commands
    local global_opts="--verbose --dry-run --no-color --help --version"

    # Template subcommands
    local template_actions="create list delete export import"

    # Config subcommands
    local config_actions="get set list reset"

    # Show items
    local show_items="template project config all"

    # Format options
    local format_opts="table json summary"

    case $cword in
        1)
            # First argument - main commands
            COMPREPLY=($(compgen -W "$commands" -- "$cur"))
            return 0
            ;;
        2)
            # Second argument - depends on the command
            case $prev in
                template)
                    COMPREPLY=($(compgen -W "$template_actions" -- "$cur"))
                    return 0
                    ;;
                config)
                    COMPREPLY=($(compgen -W "$config_actions" -- "$cur"))
                    return 0
                    ;;
                show)
                    COMPREPLY=($(compgen -W "$show_items" -- "$cur"))
                    return 0
                    ;;
                new)
                    # Project name - no completion, user input
                    return 0
                    ;;
                check|fix|extend)
                    # Optional project path - complete directories
                    COMPREPLY=($(compgen -d -- "$cur"))
                    return 0
                    ;;
                clean)
                    # No arguments for clean
                    COMPREPLY=($(compgen -W "$global_opts --all --cache --temp" -- "$cur"))
                    return 0
                    ;;
            esac
            ;;
    esac

    # Handle options that start with -
    if [[ $cur == -* ]]; then
        local opts="$global_opts"

        # Add command-specific options based on the main command
        case ${words[1]} in
            new)
                opts="$opts --template --path --variables"
                ;;
            template)
                opts="$opts --force --output"
                ;;
            check)
                opts="$opts --strict --config --format"
                ;;
            fix)
                opts="$opts --force --backup"
                ;;
            extend)
                opts="$opts --template --variables --force"
                ;;
            show)
                opts="$opts --format"
                ;;
            config)
                opts="$opts --global --workspace --project"
                ;;
            clean)
                opts="$opts --all --cache --temp"
                ;;
        esac

        COMPREPLY=($(compgen -W "$opts" -- "$cur"))
        return 0
    fi

    # Handle option values
    case $prev in
        --format|-f)
            COMPREPLY=($(compgen -W "$format_opts" -- "$cur"))
            return 0
            ;;
        --template|-t)
            # Call CLI for dynamic template completion if available
            if command -v scaffold >/dev/null 2>&1; then
                local templates=$(scaffold completion complete --line="${COMP_LINE}" --point="${COMP_POINT}" 2>/dev/null | grep -oP '"value":\s*"\K[^"]+' 2>/dev/null || echo "")
                if [[ -n "$templates" ]]; then
                    COMPREPLY=($(compgen -W "$templates" -- "$cur"))
                else
                    # Fallback to file completion
                    COMPREPLY=($(compgen -f -- "$cur"))
                fi
            else
                COMPREPLY=($(compgen -f -- "$cur"))
            fi
            return 0
            ;;
        --path|-p|--output|-o|--config|-c)
            # File/directory completion
            COMPREPLY=($(compgen -f -- "$cur"))
            return 0
            ;;
        --variables|-v)
            # JSON input - no completion
            return 0
            ;;
    esac

    # For config command, handle key completion after action
    if [[ ${words[1]} == "config" && $cword -eq 3 ]]; then
        case ${words[2]} in
            get|set)
                # Call CLI for dynamic config key completion if available
                if command -v scaffold >/dev/null 2>&1; then
                    local keys=$(scaffold completion complete --line="${COMP_LINE}" --point="${COMP_POINT}" 2>/dev/null | grep -oP '"value":\s*"\K[^"]+' 2>/dev/null || echo "")
                    if [[ -n "$keys" ]]; then
                        COMPREPLY=($(compgen -W "$keys" -- "$cur"))
                    fi
                fi
                return 0
                ;;
        esac
    fi

    # Default fallback
    return 0
}

# Register the completion function
complete -F _scaffold_completions scaffold