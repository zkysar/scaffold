/**
 * Variable validation service for template processing
 */

import { injectable } from 'tsyringe';

import type { Template, ValidationResult } from '@/models';

import { createMockServiceClass } from './mock-factory';

export interface IVariableValidationService {
  /**
   * Validate that all required variables are provided for a template
   */
  validateRequiredVariables(
    template: Template,
    provided: Record<string, unknown>
  ): ValidationResult[];
}

/**
 * Mock implementation of VariableValidationService
 * Replace this with actual implementation when ready
 */
@injectable()
export class VariableValidationService extends createMockServiceClass<IVariableValidationService>(
  'VariableValidationService'
) {}
