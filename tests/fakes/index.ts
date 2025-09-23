/**
 * Central export for all fake services
 * These fakes provide in-memory implementations for testing
 */

export { FakeTemplateService } from './template-service.fake';
export { FakeProjectCreationService } from './project-creation.service.fake';
export { FakeProjectValidationService } from './project-validation.service.fake';
export { FakeProjectFixService } from './project-fix.service.fake';
export { FakeProjectExtensionService } from './project-extension.service.fake';
export { FakeProjectManifestService } from './project-manifest.service.fake';
export { FakeFileSystemService } from './file-system.service.fake';
export { FakeConfigurationService } from './configuration.service.fake';
export { FakeVariableSubstitutionService } from './variable-substitution.service.fake';
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