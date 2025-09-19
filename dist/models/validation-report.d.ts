/**
 * Validation report data models and interfaces
 */
import { RuleFix } from './template';
export interface ValidationError {
    id: string;
    severity: "error" | "critical";
    templateId: string;
    ruleId: string;
    path: string;
    expected: string;
    actual: string;
    fix?: RuleFix;
    fixApplied?: boolean;
    message: string;
    file?: string;
    rule?: string;
    suggestion?: string;
}
export interface ValidationWarning {
    id: string;
    template: string;
    path: string;
    message: string;
    suggestion?: string;
    file?: string;
    rule?: string;
}
export interface ValidationStats {
    filesChecked: number;
    foldersChecked: number;
    templatesChecked: number;
    errorsFound: number;
    warningsFound: number;
    executionTime: number;
    rulesEvaluated: number;
    errorCount: number;
    warningCount: number;
    duration: number;
}
export interface ValidationReport {
    id: string;
    timestamp: string;
    projectId?: string;
    projectName?: string;
    projectPath?: string;
    templates?: string[];
    valid?: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    suggestions?: string[];
    stats: ValidationStats;
    passedRules?: string[];
    skippedRules?: string[];
}
//# sourceMappingURL=validation-report.d.ts.map