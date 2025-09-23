/**
 * Central export for all fake services
 * These fakes provide in-memory implementations for testing
 */

export { FakeTemplateService } from './template-service.fake';
export { FakeProjectCreationService } from './project-creation.fake';
export { FakeProjectValidationService } from './project-validation.fake';
export { FakeProjectFixService } from './project-fix.fake';
export { FakeProjectExtensionService } from './project-extension.fake';
export { FakeProjectManifestService } from './project-manifest.fake';
export { FakeFileSystemService } from './file-system.fake';
export { FakeConfigurationService } from './configuration.fake';
export { FakeVariableSubstitutionService } from './variable-substitution.fake';
export { FakeIdentifierService } from './identifier-service.fake';
export { FakeTemplateIdentifierService } from './template-identifier-service.fake';
export { FakeCompletionService } from './completion-service.fake';

/**
 * Factory function to create all fakes at once
 */
export function createAllFakes() {
  return {
    templateService: new FakeTemplateService(),
    projectCreationService: new FakeProjectCreationService(),
    projectValidationService: new FakeProjectValidationService(),
    projectFixService: new FakeProjectFixService(),
    projectExtensionService: new FakeProjectExtensionService(),
    projectManifestService: new FakeProjectManifestService(),
    fileSystemService: new FakeFileSystemService(),
    configurationService: new FakeConfigurationService(),
    variableSubstitutionService: new FakeVariableSubstitutionService(),
    identifierService: new FakeIdentifierService(),
    templateIdentifierService: new FakeTemplateIdentifierService(),
    completionService: new FakeCompletionService(),
  };
}

/**
 * Helper to reset all fakes
 */
export function resetAllFakes(fakes: ReturnType<typeof createAllFakes>): void {
  Object.values(fakes).forEach(fake => {
    if ('reset' in fake && typeof fake.reset === 'function') {
      fake.reset();
    }
  });
}