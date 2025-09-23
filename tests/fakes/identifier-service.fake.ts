import { IdentifierService } from '@/services/identifier-service';

export class FakeIdentifierService extends IdentifierService {
  private shouldThrowError: string | null = null;
  private nextReturnValue: any = null;

  constructor() {
    super('/fake/aliases.json');
  }

  reset(): void {
    this.aliasMapping = {};
    this.reverseAliasMapping = {};
    this.shouldThrowError = null;
    this.nextReturnValue = null;
  }

  setError(message: string): void {
    this.shouldThrowError = message;
  }

  setReturnValue(value: any): void {
    this.nextReturnValue = value;
  }

  setAlias(sha: string, alias: string): void {
    if (!this.aliasMapping[sha]) {
      this.aliasMapping[sha] = [];
    }
    this.aliasMapping[sha].push(alias);
    this.reverseAliasMapping[alias] = sha;
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

  async loadAliases(): Promise<void> {
    this.checkError();
    // No-op for fake - aliases are set directly
  }

  async saveAliases(): Promise<void> {
    this.checkError();
    // No-op for fake
  }

  async resolveIdentifier(identifier: string, availableSHAs: string[]): Promise<string | null> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== undefined) return returnValue;

    // Check if it's an alias
    if (this.reverseAliasMapping[identifier]) {
      const sha = this.reverseAliasMapping[identifier];
      return availableSHAs.includes(sha) ? sha : null;
    }

    // Check if it's a full SHA
    if (identifier.length === 64 && availableSHAs.includes(identifier)) {
      return identifier;
    }

    // Check if it's a partial SHA
    for (const sha of availableSHAs) {
      if (sha.startsWith(identifier)) {
        return sha;
      }
    }

    return null;
  }

  // Test helpers
  getAliases(): { aliases: Record<string, string[]>; reverse: Record<string, string> } {
    return {
      aliases: { ...this.aliasMapping },
      reverse: { ...this.reverseAliasMapping },
    };
  }
}