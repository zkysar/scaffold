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

