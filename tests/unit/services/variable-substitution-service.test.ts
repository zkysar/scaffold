/**
 * Unit tests for VariableSubstitutionService
 */

import {
  VariableSubstitutionService,
  type VariableSubstitutionOptions,
} from '../../../src/services/variable-substitution.service';

describe('VariableSubstitutionService', () => {
  let service: VariableSubstitutionService;

  beforeEach(() => {
    // Pass a null file service since we're only testing methods that don't use it
    service = new VariableSubstitutionService(null as any);
  });

  describe('substituteVariables', () => {
    it('should substitute simple variables', () => {
      const content = 'Hello {{name}}!';
      const variables = { name: 'World' };
      const result = service.substituteVariables(content, variables);
      expect(result).toBe('Hello World!');
    });

    it('should handle multiple variables', () => {
      const content = '{{greeting}} {{name}}!';
      const variables = { greeting: 'Hello', name: 'World' };
      const result = service.substituteVariables(content, variables);
      expect(result).toBe('Hello World!');
    });

    it('should handle nested variables', () => {
      const content = 'Value: {{nested.value}}';
      const variables = { nested: { value: 'test' } };
      const result = service.substituteVariables(content, variables);
      expect(result).toBe('Value: test');
    });

    it('should detect simple circular references', () => {
      const content = 'Value: {{foo}}';
      const variables = {
        foo: '{{bar}}',
        bar: '{{foo}}',
      };

      expect(() => {
        service.substituteVariables(content, variables);
      }).toThrow('Variable substitution exceeded maximum depth');
    });

    it('should detect deep circular references', () => {
      const content = 'Value: {{a}}';
      const variables = {
        a: '{{b}}',
        b: '{{c}}',
        c: '{{a}}',
      };

      expect(() => {
        service.substituteVariables(content, variables);
      }).toThrow('Variable substitution exceeded maximum depth');
    });

    it('should detect self-referencing variables', () => {
      const content = 'Value: {{self}}';
      const variables = {
        self: '{{self}}',
      };

      // Self-referencing doesn't cause infinite loops because the substitution
      // doesn't change the content, so it breaks out of the loop early
      const result = service.substituteVariables(content, variables);
      expect(result).toBe('Value: {{self}}');
    });

    it('should allow circular references when explicitly enabled', () => {
      const content = 'Value: {{foo}}';
      const variables = {
        foo: '{{bar}}',
        bar: 'resolved',
      };
      const options: VariableSubstitutionOptions = {
        allowCircular: true,
      };

      const result = service.substituteVariables(content, variables, options);
      expect(result).toBe('Value: resolved');
    });

    it('should handle default values', () => {
      const content = 'Hello {{name|Guest}}!';
      const variables = {};
      const result = service.substituteVariables(content, variables);
      expect(result).toBe('Hello Guest!');
    });

    it('should use variable value over default when present', () => {
      const content = 'Hello {{name|Guest}}!';
      const variables = { name: 'Alice' };
      const result = service.substituteVariables(content, variables);
      expect(result).toBe('Hello Alice!');
    });

    it('should handle transformations', () => {
      const content = '{{name||upper}}';
      const variables = { name: 'hello' };
      const result = service.substituteVariables(content, variables);
      expect(result).toBe('HELLO');
    });

    it('should handle lowercase transformation', () => {
      const content = '{{name||lower}}';
      const variables = { name: 'HELLO' };
      const result = service.substituteVariables(content, variables);
      expect(result).toBe('hello');
    });

    it('should handle camelCase transformation', () => {
      const content = '{{name||camelCase}}';
      const variables = { name: 'hello-world' };
      const result = service.substituteVariables(content, variables);
      expect(result).toBe('helloWorld');
    });

    it('should handle kebab-case transformation', () => {
      const content = '{{name||kebabCase}}';
      const variables = { name: 'HelloWorld' };
      const result = service.substituteVariables(content, variables);
      expect(result).toBe('hello-world');
    });

    it('should handle snake_case transformation', () => {
      const content = '{{name||snakeCase}}';
      const variables = { name: 'HelloWorld' };
      const result = service.substituteVariables(content, variables);
      expect(result).toBe('hello_world');
    });

    it('should handle PascalCase transformation', () => {
      const content = '{{name||pascalCase}}';
      const variables = { name: 'hello-world' };
      const result = service.substituteVariables(content, variables);
      expect(result).toBe('HelloWorld');
    });

    it('should handle capitalize transformation', () => {
      const content = '{{name||capitalize}}';
      const variables = { name: 'hello WORLD' };
      const result = service.substituteVariables(content, variables);
      expect(result).toBe('Hello world');
    });

    it('should handle trim transformation', () => {
      const content = '{{name||trim}}';
      const variables = { name: '  hello  ' };
      const result = service.substituteVariables(content, variables);
      expect(result).toBe('hello');
    });

    it('should handle missing variables with throwOnMissing false', () => {
      const content = 'Hello {{name}}!';
      const variables = {};
      const options: VariableSubstitutionOptions = {
        throwOnMissing: false,
      };
      const result = service.substituteVariables(content, variables, options);
      expect(result).toBe('Hello {{name}}!');
    });

    it('should throw on missing variables with throwOnMissing true', () => {
      const content = 'Hello {{name}}!';
      const variables = {};
      const options: VariableSubstitutionOptions = {
        throwOnMissing: true,
      };

      expect(() => {
        service.substituteVariables(content, variables, options);
      }).toThrow("Variable 'name' is not defined");
    });

    it('should handle escaped variables', () => {
      const content = 'Literal: \\{{name}}';
      const variables = { name: 'World' };
      const result = service.substituteVariables(content, variables);
      expect(result).toBe('Literal: {{name}}');
    });

    it('should handle special variables', () => {
      const content = '{{year}}-{{month}}-{{day}}';
      const variables = {};
      const result = service.substituteVariables(content, variables);

      const now = new Date();
      const expected = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
      expect(result).toBe(expected);
    });

    it('should handle complex circular reference chain', () => {
      const content = 'Start: {{var1}}';
      const variables = {
        var1: 'prefix-{{var2}}-suffix',
        var2: 'middle-{{var3}}',
        var3: 'end-{{var1}}', // Creates circular reference back to var1
      };

      expect(() => {
        service.substituteVariables(content, variables);
      }).toThrow('Variable substitution exceeded maximum depth');
    });

    it('should handle multiple circular reference patterns', () => {
      const content = '{{a}} and {{x}}';
      const variables = {
        a: '{{b}}',
        b: '{{a}}', // First circular reference
        x: '{{y}}',
        y: '{{z}}',
        z: '{{x}}', // Second circular reference
      };

      expect(() => {
        service.substituteVariables(content, variables);
      }).toThrow('Variable substitution exceeded maximum depth');
    });

    it('should properly resolve non-circular nested references', () => {
      const content = 'Result: {{level1}}';
      const variables = {
        level1: 'L1-{{level2}}',
        level2: 'L2-{{level3}}',
        level3: 'L3-END',
      };

      const result = service.substituteVariables(content, variables);
      expect(result).toBe('Result: L1-L2-L3-END');
    });

    it('should handle indirect circular reference through multiple paths', () => {
      const content = '{{start}}';
      const variables = {
        start: '{{path1}} {{path2}}',
        path1: '{{common}}',
        path2: '{{common}}',
        common: '{{start}}', // Both paths lead back to start
      };

      expect(() => {
        service.substituteVariables(content, variables);
      }).toThrow('Circular reference detected for variable: common');
    });
  });

  describe('substituteInPath', () => {
    it('should substitute variables in file paths', () => {
      const filePath = 'src/{{module}}/{{file}}.ts';
      const variables = { module: 'components', file: 'button' };
      const result = service.substituteInPath(filePath, variables);
      expect(result).toBe('src/components/button.ts');
    });

    it('should handle path separators correctly', () => {
      const filePath = '{{dir}}/{{subdir}}/file.txt';
      const variables = { dir: 'test', subdir: 'unit' };
      const result = service.substituteInPath(filePath, variables);
      expect(result).toBe('test/unit/file.txt');
    });
  });
});
