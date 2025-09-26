/**
 * Unit tests for VariableSubstitutionService
 */

import {
  VariableSubstitutionService,
  type VariableSubstitutionOptions,
} from '@/services/variable-substitution.service';

describe('VariableSubstitutionService', () => {
  let service: VariableSubstitutionService;

  beforeEach(() => {
    // Pass a null file service since we're only testing methods that don't use it
    service = new VariableSubstitutionService(null as any);
  });

  describe('substituteVariables', () => {
    it('should throw not implemented error for substituteVariables', () => {
      expect(() =>
        service.substituteVariables('Hello {{name}}!', { name: 'World' })
      ).toThrow('Method not implemented');
    });
  });

  describe('substituteInPath', () => {
    it('should throw not implemented error for substituteInPath', () => {
      expect(() =>
        service.substituteInPath('src/{{module}}/{{file}}.ts', {
          module: 'components',
          file: 'button',
        })
      ).toThrow('Method not implemented');
    });
  });
});
