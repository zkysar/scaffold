/**
 * Variable substitution service for template processing
 */

import { randomUUID } from 'crypto';
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
  substituteVariables(
    content: string,
    variables: Record<string, any>,
    options?: VariableSubstitutionOptions
  ): string;

  /**
   * Substitute variables in a file
   */
  substituteInFile(
    filePath: string,
    variables: Record<string, any>,
    options?: VariableSubstitutionOptions
  ): Promise<void>;

  /**
   * Substitute variables in a path string
   */
  substituteInPath(
    path: string,
    variables: Record<string, any>,
    options?: VariableSubstitutionOptions
  ): string;

  /**
   * Validate that all required variables are provided for a template
   */
  validateRequiredVariables(
    template: Template,
    provided: Record<string, any>
  ): ValidationResult[];

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

export class VariableSubstitutionService
  implements IVariableSubstitutionService
{
  private readonly variablePattern = /\\?\{\{([^}]+)\}\}/g;
  private readonly escapePattern = /\\(\{\{[^}]+\}\})/g;

  constructor(private readonly fileService: IFileSystemService) {}

  substituteVariables(
    content: string,
    variables: Record<string, any>,
    options: VariableSubstitutionOptions = {}
  ): string {
    const opts = {
      preserveEscapes: false,
      throwOnMissing: true,
      allowCircular: false,
      maxDepth: 10,
      ...options,
    };

    const context = this.createContext(variables);
    const processedVars = new Set<string>();

    let result = content;
    let depth = 0;

    while (depth < opts.maxDepth) {
      const beforeSubstitution = result;
      result = this.performSubstitution(result, context, processedVars, opts);

      // If no changes were made, we're done
      if (result === beforeSubstitution) {
        break;
      }

      depth++;
    }

    if (depth >= opts.maxDepth && this.hasVariables(result)) {
      if (opts.allowCircular) {
        // Allow circular references, just stop processing
      } else {
        throw new Error(
          `Variable substitution exceeded maximum depth (${opts.maxDepth}). This may indicate circular references.`
        );
      }
    }

    // Handle escape sequences
    if (!opts.preserveEscapes) {
      result = result.replace(this.escapePattern, '$1');
    }

    return result;
  }

  async substituteInFile(
    filePath: string,
    variables: Record<string, any>,
    options: VariableSubstitutionOptions = {}
  ): Promise<void> {
    try {
      if (!(await this.fileService.exists(filePath))) {
        throw new Error(`File does not exist: ${filePath}`);
      }

      const content = await this.fileService.readFile(filePath);
      const substitutedContent = this.substituteVariables(
        content,
        variables,
        options
      );

      await this.fileService.writeFile(filePath, substitutedContent, {
        overwrite: true,
        atomic: true,
      });
    } catch (error) {
      throw this.enhanceError(
        error,
        `Failed to substitute variables in file: ${filePath}`,
        {
          suggestion:
            'Ensure the file exists and contains valid variable syntax.',
          path: filePath,
          operation: 'substituteInFile',
        }
      );
    }
  }

  substituteInPath(
    path: string,
    variables: Record<string, any>,
    options: VariableSubstitutionOptions = {}
  ): string {
    return this.substituteVariables(path, variables, options);
  }

  validateRequiredVariables(
    template: Template,
    provided: Record<string, any>
  ): ValidationResult[] {
    const errors: ValidationResult[] = [];

    // Check template-defined required variables
    for (const templateVar of template.variables) {
      if (templateVar.required) {
        const value = this.resolveVariableValue(templateVar.name, provided);

        if (value === undefined || value === null || value === '') {
          errors.push({
            valid: false,
            path: templateVar.name,
            type: 'rule',
            severity: 'error',
            message: `Required variable '${templateVar.name}' is missing`,
            expected:
              templateVar.description || `Value for ${templateVar.name}`,
            actual: 'undefined',
            ruleId: `required-var-${templateVar.name}`,
            templateId: template.id,
            suggestion: templateVar.default
              ? `Provide a value or use default: ${templateVar.default}`
              : `Provide a value for ${templateVar.name}`,
            fixable: false,
          });
        } else if (templateVar.pattern) {
          const pattern = new RegExp(templateVar.pattern);
          if (!pattern.test(String(value))) {
            errors.push({
              valid: false,
              path: templateVar.name,
              type: 'pattern',
              severity: 'error',
              message: `Variable '${templateVar.name}' does not match required pattern`,
              expected: templateVar.pattern,
              actual: String(value),
              ruleId: `pattern-var-${templateVar.name}`,
              templateId: template.id,
              suggestion: `Ensure ${templateVar.name} matches the pattern: ${templateVar.pattern}`,
              fixable: false,
            });
          }
        }
      }
    }

    // Extract and validate variables from template content
    const allVariables = new Set<string>();

    // Check file templates
    for (const file of template.files) {
      if (file.variables !== false && file.content) {
        const vars = this.extractVariables(file.content);
        vars.forEach(v => allVariables.add(v));
      }
    }

    // Check folder paths
    for (const folder of template.folders) {
      const vars = this.extractVariables(folder.path);
      vars.forEach(v => allVariables.add(v));
    }

    // Check file paths
    for (const file of template.files) {
      const vars = this.extractVariables(file.path);
      vars.forEach(v => allVariables.add(v));
    }

    // Validate extracted variables
    for (const varName of Array.from(allVariables)) {
      const value = this.resolveVariableValue(varName, provided);

      if (value === undefined || value === null) {
        // Check if it's a special variable
        const context = this.createContext(provided);
        if (!context.specialVariables[varName]) {
          errors.push({
            valid: false,
            path: varName,
            type: 'rule',
            severity: 'error',
            message: `Variable '${varName}' is used but not provided`,
            expected: `Value for ${varName}`,
            actual: 'undefined',
            ruleId: `missing-var-${varName}`,
            templateId: template.id,
            suggestion: `Provide a value for variable '${varName}'`,
            fixable: false,
          });
        }
      }
    }

    return errors;
  }

  extractVariables(content: string): string[] {
    const variables: string[] = [];
    const regex = new RegExp(this.variablePattern);
    let match;

    while ((match = regex.exec(content)) !== null) {
      const fullMatch = match[0];
      const variable = match[1];

      // Skip escaped variables
      if (fullMatch.startsWith('\\')) {
        continue;
      }

      // Extract variable name (before | for transforms or defaults)
      const varName = variable.split('|')[0].trim();

      if (varName && !variables.includes(varName)) {
        variables.push(varName);
      }
    }

    return variables;
  }

  applyTransformation(value: string, transformation: string): string {
    const context = this.createContext({});
    const transform = context.transforms[transformation];

    if (!transform) {
      throw new Error(`Unknown transformation: ${transformation}`);
    }

    return transform(value);
  }

  createContext(variables: Record<string, any>): SubstitutionContext {
    const now = new Date();

    return {
      variables,
      specialVariables: {
        timestamp: () => Date.now().toString(),
        date: () => now.toISOString().split('T')[0],
        datetime: () => now.toISOString(),
        uuid: () => randomUUID(),
        year: () => now.getFullYear().toString(),
        month: () => (now.getMonth() + 1).toString().padStart(2, '0'),
        day: () => now.getDate().toString().padStart(2, '0'),
      },
      transforms: {
        upper: (value: string) => value.toUpperCase(),
        lower: (value: string) => value.toLowerCase(),
        camelCase: (value: string) => this.toCamelCase(value),
        kebabCase: (value: string) => this.toKebabCase(value),
        snakeCase: (value: string) => this.toSnakeCase(value),
        pascalCase: (value: string) => this.toPascalCase(value),
        capitalize: (value: string) =>
          value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(),
        trim: (value: string) => value.trim(),
      },
    };
  }

  private performSubstitution(
    content: string,
    context: SubstitutionContext,
    processedVars: Set<string>,
    options: VariableSubstitutionOptions
  ): string {
    return content.replace(this.variablePattern, (match, variable) => {
      // Handle escaped variables
      if (match.startsWith('\\')) {
        return match; // Keep escape for later processing
      }

      try {
        return this.processVariable(variable, context, processedVars, options);
      } catch (error) {
        if (options.throwOnMissing) {
          throw new Error(
            `Variable substitution failed for '${variable}': ${error instanceof Error ? error.message : String(error)}`
          );
        }
        return match; // Leave unresolved
      }
    });
  }

  private processVariable(
    variable: string,
    context: SubstitutionContext,
    processedVars: Set<string>,
    options: VariableSubstitutionOptions
  ): string {
    const parts = variable.split('|');
    const varName = parts[0].trim();
    const defaultValue = parts[1]?.trim();
    const transform =
      parts[2]?.trim() ||
      (parts.length === 2 && !defaultValue?.includes(' ')
        ? defaultValue
        : undefined);

    // Check for circular references
    if (processedVars.has(varName) && !options.allowCircular) {
      throw new Error(`Circular reference detected for variable: ${varName}`);
    }

    // Track this variable as being processed to detect circular references
    processedVars.add(varName);

    let value = this.resolveVariableValue(varName, context.variables);

    // Try special variables
    if (value === undefined) {
      const specialVar = context.specialVariables[varName];
      if (specialVar) {
        value = specialVar();
      }
    }

    // Use default value if provided and value is still undefined
    if (value === undefined && defaultValue !== undefined) {
      value = defaultValue;
    }

    // Throw error if still undefined and throwOnMissing is true
    if (value === undefined) {
      if (options.throwOnMissing) {
        throw new Error(`Variable '${varName}' is not defined`);
      }
      return `{{${variable}}}`;
    }

    // Convert to string
    let result = String(value);

    // Apply transformation if specified
    if (transform && context.transforms[transform]) {
      result = context.transforms[transform](result);
    } else if (transform && !context.transforms[transform]) {
      throw new Error(`Unknown transformation: ${transform}`);
    }

    return result;
  }

  private resolveVariableValue(
    varName: string,
    variables: Record<string, any>
  ): any {
    // Support nested variables like "project.name"
    const parts = varName.split('.');
    let value = variables;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private hasVariables(content: string): boolean {
    const regex = new RegExp(this.variablePattern);
    const matches = content.match(regex);
    return matches !== null && matches.some(match => !match.startsWith('\\'));
  }

  private toCamelCase(value: string): string {
    return value
      .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
      .replace(/^[A-Z]/, char => char.toLowerCase());
  }

  private toKebabCase(value: string): string {
    return value
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  private toSnakeCase(value: string): string {
    return value
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s-]+/g, '_')
      .toLowerCase();
  }

  private toPascalCase(value: string): string {
    return value
      .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
      .replace(/^[a-z]/, char => char.toUpperCase());
  }

  private enhanceError(
    originalError: any,
    message: string,
    context: {
      suggestion?: string;
      path?: string;
      operation?: string;
    }
  ): Error {
    const error = new Error(`${message}\n${context.suggestion || ''}`);

    // Add context as properties
    Object.assign(error, {
      operation: context.operation,
      path: context.path,
      originalError,
    });

    // Preserve original error details in stack trace
    if (originalError && originalError.stack) {
      error.stack = `${error.message}\nCaused by: ${originalError.stack}`;
    }

    return error;
  }
}
