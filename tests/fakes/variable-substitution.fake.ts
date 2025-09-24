import type {
  IVariableSubstitutionService,
} from '@/services/variable-substitution.service';

export class FakeVariableSubstitutionService implements IVariableSubstitutionService {
  private shouldThrowError: string | null = null;
  private nextReturnValue: any = null;
  private substitutionRules: Map<string, string> = new Map();

  reset(): void {
    this.shouldThrowError = null;
    this.nextReturnValue = null;
    this.substitutionRules.clear();
  }

  setError(message: string): void {
    this.shouldThrowError = message;
  }

  setReturnValue(value: any): void {
    this.nextReturnValue = value;
  }

  setSubstitutionRule(variable: string, value: string): void {
    this.substitutionRules.set(variable, value);
  }

  private checkError(): void {
    if (this.shouldThrowError) {
      const error = this.shouldThrowError;
      this.shouldThrowError = null;
      throw new Error(error);
    }
  }

  private checkReturnValue(): any {
    if (this.nextReturnValue !== null) {
      const value = this.nextReturnValue;
      this.nextReturnValue = null;
      return value;
    }
    return null;
  }

  substituteVariables(
    content: string,
    variables: Record<string, any>,
    options?: any
  ): string {
    if (this.shouldThrowError) {
      const error = this.shouldThrowError;
      this.shouldThrowError = null;
      throw new Error(error);
    }

    if (this.nextReturnValue !== null) {
      const value = this.nextReturnValue;
      this.nextReturnValue = null;
      return value;
    }

    let result = content;

    // Use custom substitution rules if set
    for (const [variable, value] of this.substitutionRules) {
      const pattern = new RegExp(`\\$\\{${variable}\\}`, 'g');
      result = result.replace(pattern, value);
    }

    // Use provided variables
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\$\\{${key}\\}`, 'g');
      result = result.replace(pattern, value);
    }

    return result;
  }

  async substituteInFile(
    filePath: string,
    variables: Record<string, any>,
    options?: any
  ): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    // Fake implementation - just track that it was called
  }

  substituteInPath(
    path: string,
    variables: Record<string, any>,
    options?: any
  ): string {
    if (this.shouldThrowError) {
      const error = this.shouldThrowError;
      this.shouldThrowError = null;
      throw new Error(error);
    }

    if (this.nextReturnValue !== null) {
      const value = this.nextReturnValue;
      this.nextReturnValue = null;
      return value;
    }

    // Use provided variables
    let result = path;
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\$\\{${key}\\}`, 'g');
      result = result.replace(pattern, String(value));
    }

    return result;
  }

  validateRequiredVariables(
    template: any,
    provided: Record<string, any>
  ): any[] {
    if (this.shouldThrowError) {
      const error = this.shouldThrowError;
      this.shouldThrowError = null;
      throw new Error(error);
    }

    if (this.nextReturnValue !== null) {
      const value = this.nextReturnValue;
      this.nextReturnValue = null;
      return value;
    }

    return []; // Simplified implementation
  }

  extractVariables(content: string): string[] {
    if (this.shouldThrowError) {
      const error = this.shouldThrowError;
      this.shouldThrowError = null;
      throw new Error(error);
    }

    if (this.nextReturnValue !== null) {
      const value = this.nextReturnValue;
      this.nextReturnValue = null;
      return value;
    }

    return []; // Simplified implementation
  }

  applyTransformation(value: string, transformation: string): string {
    if (this.shouldThrowError) {
      const error = this.shouldThrowError;
      this.shouldThrowError = null;
      throw new Error(error);
    }

    if (this.nextReturnValue !== null) {
      const returnValue = this.nextReturnValue;
      this.nextReturnValue = null;
      return returnValue;
    }

    return value; // Simplified implementation
  }

  createContext(variables: Record<string, any>): any {
    if (this.shouldThrowError) {
      const error = this.shouldThrowError;
      this.shouldThrowError = null;
      throw new Error(error);
    }

    if (this.nextReturnValue !== null) {
      const value = this.nextReturnValue;
      this.nextReturnValue = null;
      return value;
    }

    return { variables, specialVariables: {}, transforms: {} };
  }

  async validateVariables(
    template: { variables: Array<{ name: string; required: boolean }> },
    provided: Record<string, string>
  ): Promise<string[]> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    const errors: string[] = [];
    for (const variable of template.variables) {
      if (variable.required && !provided[variable.name]) {
        errors.push(`Missing required variable: ${variable.name}`);
      }
    }
    return errors;
  }

  // Test helpers
  getSubstitutionRules(): Map<string, string> {
    return new Map(this.substitutionRules);
  }
}