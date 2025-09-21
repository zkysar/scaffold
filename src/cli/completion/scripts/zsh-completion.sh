#compdef scaffold

# Zsh completion script for scaffold CLI
# This script provides tab completion for the scaffold command and all its subcommands

_scaffold() {
    local context state line
    typeset -A opt_args

    # Main function that handles completion
    _arguments -C \
        '1: :_scaffold_commands' \
        '*::arg:->args' \
        '(-h --help)'{-h,--help}'[Show help information]' \
        '(--version)--version[Show version information]' \
        '(--verbose)--verbose[Show detailed output]' \
        '(--dry-run)--dry-run[Show what would be done without making changes]' \
        '(--no-color)--no-color[Disable colored output]'

    case $state in
        args)
            case $words[1] in
                new)
                    _scaffold_new
                    ;;
                template)
                    _scaffold_template
                    ;;
                check)
                    _scaffold_check
                    ;;
                fix)
                    _scaffold_fix
                    ;;
                extend)
                    _scaffold_extend
                    ;;
                show)
                    _scaffold_show
                    ;;
                config)
                    _scaffold_config
                    ;;
                clean)
                    _scaffold_clean
                    ;;
            esac
            ;;
    esac
}

# Complete main commands
_scaffold_commands() {
    local commands=(
        'new:Create a new project from template'
        'template:Manage templates (create/list/delete/export/import)'
        'check:Validate project structure'
        'fix:Fix project structure issues'
        'extend:Add template to existing project'
        'show:Show information about templates, projects, or config'
        'config:Manage configuration settings'
        'clean:Clean temporary and cache files'
    )
    _describe 'commands' commands
}

# Complete 'new' command
_scaffold_new() {
    _arguments \
        '1:project name:' \
        '(-t --template)'{-t,--template}'[Template ID or name to use]:template:_scaffold_templates' \
        '(-p --path)'{-p,--path}'[Target directory path]:path:_files -/' \
        '(-v --variables)'{-v,--variables}'[JSON string of template variables]:variables:' \
        '(--verbose)--verbose[Show detailed output]' \
        '(--dry-run)--dry-run[Show what would be created without creating anything]'
}

# Complete 'template' command
_scaffold_template() {
    local template_actions=(
        'create:Create a new template'
        'list:List available templates'
        'delete:Delete a template'
        'export:Export template to file'
        'import:Import template from file'
    )

    if (( CURRENT == 2 )); then
        _describe 'template actions' template_actions
    else
        case $words[2] in
            create|delete|export)
                _arguments \
                    '2:template name:_scaffold_templates' \
                    '(--verbose)--verbose[Show detailed output]' \
                    '(--dry-run)--dry-run[Show what would be done without making changes]' \
                    '(--force)--force[Force operation without confirmation]' \
                    '(-o --output)'{-o,--output}'[Output path for export operations]:path:_files'
                ;;
            import)
                _arguments \
                    '2:file path:_files' \
                    '(--verbose)--verbose[Show detailed output]' \
                    '(--dry-run)--dry-run[Show what would be done without making changes]' \
                    '(--force)--force[Force operation without confirmation]'
                ;;
            list)
                _arguments \
                    '(--verbose)--verbose[Show detailed output]'
                ;;
        esac
    fi
}

# Complete 'check' command
_scaffold_check() {
    _arguments \
        '1:project path:_files -/' \
        '(--verbose)--verbose[Show detailed validation output]' \
        '(--strict)--strict[Use strict mode validation]' \
        '(-c --config)'{-c,--config}'[Path to configuration file]:config:_files' \
        '(-f --format)'{-f,--format}'[Output format]:format:(table json summary)'
}

# Complete 'fix' command
_scaffold_fix() {
    _arguments \
        '1:project path:_files -/' \
        '(--verbose)--verbose[Show detailed fix output]' \
        '(--dry-run)--dry-run[Show what would be fixed without making changes]' \
        '(--force)--force[Fix issues without confirmation prompts]' \
        '(--backup)--backup[Create backup before making changes]'
}

# Complete 'extend' command
_scaffold_extend() {
    _arguments \
        '1:project path:_files -/' \
        '(-t --template)'{-t,--template}'[Template ID or name to add]:template:_scaffold_templates' \
        '(-v --variables)'{-v,--variables}'[JSON string of template variables]:variables:' \
        '(--verbose)--verbose[Show detailed output]' \
        '(--dry-run)--dry-run[Show what would be added without making changes]' \
        '(--force)--force[Apply template without confirmation prompts]'
}

# Complete 'show' command
_scaffold_show() {
    local show_items=(
        'template:Show template information'
        'project:Show project information'
        'config:Show configuration'
        'all:Show all information'
    )

    if (( CURRENT == 2 )); then
        _describe 'show items' show_items
    else
        _arguments \
            '(--verbose)--verbose[Show detailed information]' \
            '(-f --format)'{-f,--format}'[Output format]:format:(table json summary)'
    fi
}

# Complete 'config' command
_scaffold_config() {
    local config_actions=(
        'get:Get configuration value'
        'set:Set configuration value'
        'list:List all configuration'
        'reset:Reset configuration to defaults'
    )

    if (( CURRENT == 2 )); then
        _describe 'config actions' config_actions
    else
        case $words[2] in
            get|set)
                if (( CURRENT == 3 )); then
                    _scaffold_config_keys
                elif (( CURRENT == 4 && $words[2] == "set" )); then
                    # Config value - no completion
                    return 0
                fi
                ;;
        esac

        _arguments \
            '(--verbose)--verbose[Show detailed output]' \
            '(--dry-run)--dry-run[Show what would be done without making changes]' \
            '(--global)--global[Use global configuration]' \
            '(--workspace)--workspace[Use workspace configuration]' \
            '(--project)--project[Use project configuration]'
    fi
}

# Complete 'clean' command
_scaffold_clean() {
    _arguments \
        '(--verbose)--verbose[Show detailed output]' \
        '(--dry-run)--dry-run[Show what would be cleaned without deleting anything]' \
        '(--all)--all[Clean everything (cache, temp, and build files)]' \
        '(--cache)--cache[Clean cache files only]' \
        '(--temp)--temp[Clean temporary files only]'
}

# Dynamic completion for templates
_scaffold_templates() {
    local templates
    if command -v scaffold >/dev/null 2>&1; then
        # Try to get templates from CLI completion endpoint
        templates=(${(f)"$(scaffold completion complete --line="$BUFFER" --point="$CURSOR" 2>/dev/null | grep -oP '"value":\s*"\K[^"]+' 2>/dev/null || echo "")"})
        if [[ ${#templates[@]} -gt 0 ]]; then
            _describe 'templates' templates
            return 0
        fi
    fi

    # Fallback to generic completion
    _message 'template name'
}

# Dynamic completion for config keys
_scaffold_config_keys() {
    local keys
    if command -v scaffold >/dev/null 2>&1; then
        # Try to get config keys from CLI completion endpoint
        keys=(${(f)"$(scaffold completion complete --line="$BUFFER" --point="$CURSOR" 2>/dev/null | grep -oP '"value":\s*"\K[^"]+' 2>/dev/null || echo "")"})
        if [[ ${#keys[@]} -gt 0 ]]; then
            _describe 'config keys' keys
            return 0
        fi
    fi

    # Fallback with common config keys
    local common_keys=(
        'defaultTemplate:Default template to use'
        'templateDirectory:Directory containing templates'
        'projectDirectory:Default project directory'
        'verbose:Default verbose mode setting'
    )
    _describe 'config keys' common_keys
}

# Enable completion caching for better performance
_scaffold "$@"