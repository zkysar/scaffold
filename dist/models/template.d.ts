/**
 * Template-related data models and interfaces
 */
export interface FolderDefinition {
    path: string;
    description?: string;
    permissions?: string;
    gitkeep?: boolean;
}
export interface FileDefinition {
    path: string;
    sourcePath?: string;
    content?: string;
    permissions?: string;
    variables?: boolean;
}
export interface TemplateVariable {
    name: string;
    description: string;
    required: boolean;
    default?: string;
    pattern?: string;
    transform?: "lower" | "upper" | "capitalize" | "kebab" | "snake" | "camel";
}
export interface RuleCondition {
    when: "always" | "if_exists" | "if_not_exists" | "if_matches";
    pattern?: string;
    dependsOn?: string[];
}
export interface RuleFix {
    action: "create" | "delete" | "modify" | "rename" | "prompt";
    template?: string;
    content?: string;
    newPath?: string;
    message?: string;
    autoFix: boolean;
}
export interface Rule {
    id: string;
    name: string;
    description: string;
    type: "required_file" | "required_folder" | "forbidden_file" | "forbidden_folder" | "file_content" | "file_pattern" | "custom";
    target: string;
    condition?: RuleCondition;
    fix: RuleFix;
    severity: "error" | "warning";
}
export interface TemplateRules {
    strictMode: boolean;
    allowExtraFiles: boolean;
    allowExtraFolders: boolean;
    conflictResolution: "skip" | "replace" | "prompt" | "merge";
    excludePatterns: string[];
    rules: Rule[];
}
export interface Template {
    id: string;
    name: string;
    version: string;
    description: string;
    rootFolder: string;
    author?: string;
    created: string;
    updated: string;
    folders: FolderDefinition[];
    files: FileDefinition[];
    variables: TemplateVariable[];
    rules: TemplateRules;
    dependencies?: string[];
}
export interface TemplateSource {
    type: "global" | "workspace" | "registry" | "git";
    path?: string;
    url?: string;
    priority: number;
    enabled: boolean;
}
export interface TemplateSummary {
    id: string;
    name: string;
    version: string;
    description: string;
    source: string;
    installed: boolean;
    lastUpdated: string;
}
export interface TemplateLibrary {
    sources: TemplateSource[];
    templates: TemplateSummary[];
    lastUpdated: string;
}
//# sourceMappingURL=template.d.ts.map