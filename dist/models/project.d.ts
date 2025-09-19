/**
 * Project-related data models and interfaces
 */
export interface ChangeRecord {
    id: string;
    type: "added" | "modified" | "removed";
    path: string;
    reason?: string;
}
export interface HistoryEntry {
    id: string;
    timestamp: string;
    action: "create" | "extend" | "sync" | "check" | "clean";
    templates?: string[];
    user?: string;
    changes: ChangeRecord[];
}
export interface ConflictRecord {
    id: string;
    path: string;
    templateVersion: string;
    localVersion: string;
    resolution: "kept_local" | "used_template" | "merged" | "skipped";
    resolvedAt: string;
    resolvedBy?: string;
}
export interface AppliedTemplate {
    templateId: string;
    name: string;
    version: string;
    rootFolder: string;
    appliedBy?: string;
    appliedAt: string;
    status: "active" | "removed";
    conflicts: ConflictRecord[];
}
export interface ProjectManifest {
    id: string;
    version: string;
    projectName: string;
    created: string;
    updated: string;
    templates: AppliedTemplate[];
    variables: Record<string, string>;
    history: HistoryEntry[];
}
//# sourceMappingURL=project.d.ts.map