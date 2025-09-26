/**
 * Core variable substitution service for template processing
 */

import { injectable } from 'tsyringe';

import { createMockServiceClass } from './mock-factory';
import type {
  VariableSubstitutionOptions,
  SubstitutionContext,
} from './variable-substitution.service';

export interface IVariableSubstitutionCoreService {
  /**
   * Substitute variables in content using {{variable}} syntax
   */
  substituteVariables(
    content: string,
    variables: Record<string, unknown>,
    options?: VariableSubstitutionOptions
  ): string;

  /**
   * Substitute variables in a file
   */
  substituteInFile(
    filePath: string,
    variables: Record<string, unknown>,
    options?: VariableSubstitutionOptions
  ): Promise<void>;

  /**
   * Substitute variables in a path string
   */
  substituteInPath(
    path: string,
    variables: Record<string, unknown>,
    options?: VariableSubstitutionOptions
  ): string;

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
  createContext(variables: Record<string, unknown>): SubstitutionContext;
}

/**
 * Mock implementation of VariableSubstitutionCoreService
 * Replace this with actual implementation when ready
 */
@injectable()
export class VariableSubstitutionCoreService extends createMockServiceClass<IVariableSubstitutionCoreService>(
  'VariableSubstitutionCoreService'
) {}
