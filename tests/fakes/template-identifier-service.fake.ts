import type { Template } from '@/models';

export class FakeTemplateIdentifierService {
  private static instance: FakeTemplateIdentifierService;
  private aliases: Map<string, string[]> = new Map();
  private reverseAliases: Map<string, string> = new Map();
  private shouldThrowError: string | null = null;
  private nextReturnValue: any = null;

  static getInstance(): FakeTemplateIdentifierService {
    if (!FakeTemplateIdentifierService.instance) {
      FakeTemplateIdentifierService.instance = new FakeTemplateIdentifierService();
    }
    return FakeTemplateIdentifierService.instance;
  }

  reset(): void {
    this.aliases.clear();
    this.reverseAliases.clear();
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
    if (!this.aliases.has(sha)) {
      this.aliases.set(sha, []);
    }
    this.aliases.get(sha)!.push(alias);
    this.reverseAliases.set(alias, sha);
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

  computeTemplateSHA(template: Template): string {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    // Generate a fake SHA based on template name
    const hash = template.name.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);

    return Math.abs(hash).toString(16).padEnd(64, '0');
  }

  async resolveIdentifier(identifier: string, availableSHAs: string[]): Promise<string | null> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue !== undefined) return returnValue;

    // Check if it's an alias
    if (this.reverseAliases.has(identifier)) {
      const sha = this.reverseAliases.get(identifier)!;
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

  async getAliases(sha: string, availableSHAs: string[]): Promise<string[]> {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    if (!availableSHAs.includes(sha)) {
      return [];
    }

    return this.aliases.get(sha) || [];
  }

  migrateTemplateToSHA(template: Template): Template {
    this.checkError();
    const returnValue = this.checkReturnValue();
    if (returnValue) return returnValue;

    const sha = this.computeTemplateSHA(template);
    return {
      ...template,
      id: sha,
    };
  }

  // Test helpers
  getStoredAliases(): { aliases: Map<string, string[]>; reverse: Map<string, string> } {
    return {
      aliases: new Map(this.aliases),
      reverse: new Map(this.reverseAliases),
    };
  }
}