# Fish completion script for scaffold CLI
# This script provides tab completion for the scaffold command and all its subcommands

# Helper function to check if a command has been used
function __scaffold_using_command
    set cmd (commandline -opc)
    if [ (count $cmd) -eq 2 ]
        if [ $argv[1] = $cmd[2] ]
            return 0
        end
    end
    return 1
end

# Helper function to check if a subcommand has been used
function __scaffold_using_subcommand
    set cmd (commandline -opc)
    if [ (count $cmd) -eq 3 ]
        if [ $argv[1] = $cmd[2] ] && [ $argv[2] = $cmd[3] ]
            return 0
        end
    end
    return 1
end

# Helper function to get dynamic completions from CLI
function __scaffold_get_dynamic_completions
    set line (commandline -cp)
    set point (string length $line)

    if command -sq scaffold
        scaffold completion complete --line="$line" --point="$point" 2>/dev/null | string match -r '"value":\s*"([^"]+)"' | string replace -r '.*"([^"]+)".*' '$1' 2>/dev/null
    end
end

# Helper function to get available templates
function __scaffold_get_templates
    __scaffold_get_dynamic_completions
end

# Helper function to get config keys
function __scaffold_get_config_keys
    set completions (__scaffold_get_dynamic_completions)
    if test -z "$completions"
        # Fallback to common config keys
        echo "defaultTemplate"
        echo "templateDirectory"
        echo "projectDirectory"
        echo "verbose"
    else
        echo $completions
    end
end

# Main commands
complete -f -c scaffold -n "not __fish_seen_subcommand_from new template check fix extend show config clean" -a "new" -d "Create a new project from template"
complete -f -c scaffold -n "not __fish_seen_subcommand_from new template check fix extend show config clean" -a "template" -d "Manage templates"
complete -f -c scaffold -n "not __fish_seen_subcommand_from new template check fix extend show config clean" -a "check" -d "Validate project structure"
complete -f -c scaffold -n "not __fish_seen_subcommand_from new template check fix extend show config clean" -a "fix" -d "Fix project structure issues"
complete -f -c scaffold -n "not __fish_seen_subcommand_from new template check fix extend show config clean" -a "extend" -d "Add template to existing project"
complete -f -c scaffold -n "not __fish_seen_subcommand_from new template check fix extend show config clean" -a "show" -d "Show information"
complete -f -c scaffold -n "not __fish_seen_subcommand_from new template check fix extend show config clean" -a "config" -d "Manage configuration"
complete -f -c scaffold -n "not __fish_seen_subcommand_from new template check fix extend show config clean" -a "clean" -d "Clean temporary files"

# Global options
complete -f -c scaffold -l verbose -d "Show detailed output"
complete -f -c scaffold -l dry-run -d "Show what would be done without making changes"
complete -f -c scaffold -l no-color -d "Disable colored output"
complete -f -c scaffold -l help -s h -d "Show help information"
complete -f -c scaffold -l version -d "Show version information"

# NEW command completions
complete -f -c scaffold -n "__scaffold_using_command new" -l template -s t -d "Template ID or name to use" -a "(__scaffold_get_templates)"
complete -r -c scaffold -n "__scaffold_using_command new" -l path -s p -d "Target directory path"
complete -f -c scaffold -n "__scaffold_using_command new" -l variables -s v -d "JSON string of template variables"

# TEMPLATE command completions
complete -f -c scaffold -n "__scaffold_using_command template" -a "create" -d "Create a new template"
complete -f -c scaffold -n "__scaffold_using_command template" -a "list" -d "List available templates"
complete -f -c scaffold -n "__scaffold_using_command template" -a "delete" -d "Delete a template"
complete -f -c scaffold -n "__scaffold_using_command template" -a "export" -d "Export template to file"
complete -f -c scaffold -n "__scaffold_using_command template" -a "import" -d "Import template from file"

complete -f -c scaffold -n "__scaffold_using_command template" -l force -d "Force operation without confirmation"
complete -r -c scaffold -n "__scaffold_using_command template" -l output -s o -d "Output path for export operations"

# Template subcommand argument completions
complete -f -c scaffold -n "__scaffold_using_subcommand template create" -a "(__scaffold_get_templates)"
complete -f -c scaffold -n "__scaffold_using_subcommand template delete" -a "(__scaffold_get_templates)"
complete -f -c scaffold -n "__scaffold_using_subcommand template export" -a "(__scaffold_get_templates)"
complete -r -c scaffold -n "__scaffold_using_subcommand template import"

# CHECK command completions
complete -r -c scaffold -n "__scaffold_using_command check"
complete -f -c scaffold -n "__scaffold_using_command check" -l strict -d "Use strict mode validation"
complete -r -c scaffold -n "__scaffold_using_command check" -l config -s c -d "Path to configuration file"
complete -f -c scaffold -n "__scaffold_using_command check" -l format -s f -a "table json summary" -d "Output format"

# FIX command completions
complete -r -c scaffold -n "__scaffold_using_command fix"
complete -f -c scaffold -n "__scaffold_using_command fix" -l force -d "Fix issues without confirmation prompts"
complete -f -c scaffold -n "__scaffold_using_command fix" -l backup -d "Create backup before making changes"

# EXTEND command completions
complete -r -c scaffold -n "__scaffold_using_command extend"
complete -f -c scaffold -n "__scaffold_using_command extend" -l template -s t -d "Template ID or name to add" -a "(__scaffold_get_templates)"
complete -f -c scaffold -n "__scaffold_using_command extend" -l variables -s v -d "JSON string of template variables"
complete -f -c scaffold -n "__scaffold_using_command extend" -l force -d "Apply template without confirmation prompts"

# SHOW command completions
complete -f -c scaffold -n "__scaffold_using_command show" -a "template" -d "Show template information"
complete -f -c scaffold -n "__scaffold_using_command show" -a "project" -d "Show project information"
complete -f -c scaffold -n "__scaffold_using_command show" -a "config" -d "Show configuration"
complete -f -c scaffold -n "__scaffold_using_command show" -a "all" -d "Show all information"

complete -f -c scaffold -n "__scaffold_using_command show" -l format -s f -a "table json summary" -d "Output format"

# CONFIG command completions
complete -f -c scaffold -n "__scaffold_using_command config" -a "get" -d "Get configuration value"
complete -f -c scaffold -n "__scaffold_using_command config" -a "set" -d "Set configuration value"
complete -f -c scaffold -n "__scaffold_using_command config" -a "list" -d "List all configuration"
complete -f -c scaffold -n "__scaffold_using_command config" -a "reset" -d "Reset configuration to defaults"

complete -f -c scaffold -n "__scaffold_using_command config" -l global -d "Use global configuration"
complete -f -c scaffold -n "__scaffold_using_command config" -l workspace -d "Use workspace configuration"
complete -f -c scaffold -n "__scaffold_using_command config" -l project -d "Use project configuration"

# Config subcommand argument completions
complete -f -c scaffold -n "__scaffold_using_subcommand config get" -a "(__scaffold_get_config_keys)"
complete -f -c scaffold -n "__scaffold_using_subcommand config set" -a "(__scaffold_get_config_keys)"

# CLEAN command completions
complete -f -c scaffold -n "__scaffold_using_command clean" -l all -d "Clean everything (cache, temp, and build files)"
complete -f -c scaffold -n "__scaffold_using_command clean" -l cache -d "Clean cache files only"
complete -f -c scaffold -n "__scaffold_using_command clean" -l temp -d "Clean temporary files only"

# Completion command completions (internal use)
complete -f -c scaffold -n "__scaffold_using_command completion" -a "install" -d "Install shell completion"
complete -f -c scaffold -n "__scaffold_using_command completion" -a "uninstall" -d "Remove shell completion"
complete -f -c scaffold -n "__scaffold_using_command completion" -a "status" -d "Check completion status"
complete -f -c scaffold -n "__scaffold_using_command completion" -a "script" -d "Output completion script"
complete -f -c scaffold -n "__scaffold_using_command completion" -a "complete" -d "Generate completions (internal)"