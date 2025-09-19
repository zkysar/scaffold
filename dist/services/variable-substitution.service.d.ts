/**
 * Variable substitution service for template processing
 */
import type { Template, ValidationResult } from '../models';
import type { IFileSystemService } from './file-system.service';
export interface VariableSubstitutionOptions {
    preserveEscapes?: boolean;
    throwOnMissing?: boolean;
    allowCircular?: boolean;
    maxDepth?: number;
}
export interface SubstitutionContext {
    variables: Record<string, any>;
    specialVariables: Record<string, () => string>;
    transforms: Record<string, (value: string) => string>;
}
export interface IVariableSubstitutionService {
    /**
     * Substitute variables in content using {{variable}} syntax
     */
    substituteVariables(content: string, variables: Record<string, any>, options?: VariableSubstitutionOptions): string;
    /**
     * Substitute variables in a file
     */
    substituteInFile(filePath: string, variables: Record<string, any>, options?: VariableSubstitutionOptions): Promise<void>;
    /**
     * Substitute variables in a path string
     */
    substituteInPath(path: string, variables: Record<string, any>, options?: VariableSubstitutionOptions): string;
    /**
     * Validate that all required variables are provided for a template
     */
    validateRequiredVariables(template: Template, provided: Record<string, any>): ValidationResult[];
    /**
     * Extract variable names from content
     */
    extractVariables(content: string): string[];
    /**
     * Apply transformation to a value
     */
    applyTransformation(value: string, transformation: string): string;
    /**
     * Create substitution context with built-in variables and transforms
     */
    createContext(variables: Record<string, any>): SubstitutionContext;
}
export declare class VariableSubstitutionService implements IVariableSubstitutionService {
    private readonly fileService;
    private readonly variablePattern;
    private readonly escapePattern;
    constructor(fileService: IFileSystemService);
    substituteVariables(content: string, variables: Record<string, any>, options?: VariableSubstitutionOptions): string;
    substituteInFile(filePath: string, variables: Record<string, any>, options?: VariableSubstitutionOptions): Promise<void>;
    substituteInPath(path: string, variables: Record<string, any>, options?: VariableSubstitutionOptions): string;
    validateRequiredVariables(template: Template, provided: Record<string, any>): ValidationResult[];
    extractVariables(content: string): string[];
    applyTransformation(value: string, transformation: string): string;
    createContext(variables: Record<string, any>): SubstitutionContext;
    private performSubstitution;
    private processVariable;
    private resolveVariableValue;
    private hasVariables;
    private toCamelCase;
    private toKebabCase;
    private toSnakeCase;
    private toPascalCase;
    private enhanceError;
}
//# sourceMappingURL=variable-substitution.service.d.ts.map