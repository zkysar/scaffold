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

  async substituteVariables(
    content: string,
    variables: Record<string, string>
  ): Promise<string> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return returnValue;

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
    variables: Record<string, string>
  ): Promise<void> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== null) return;

    // Fake implementation - just track that it was called
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