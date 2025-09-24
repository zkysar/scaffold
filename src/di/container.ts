import 'reflect-metadata';
import { container, DependencyContainer } from 'tsyringe';

import { FileSystemService } from '@/services/file-system.service';
import { ConfigurationService } from '@/services/configuration.service';
import { TemplateIdentifierService } from '@/services/template-identifier-service';
import { VariableSubstitutionService } from '@/services/variable-substitution.service';
import { ProjectManifestService } from '@/services/project-manifest.service';
import { TemplateService } from '@/services/template-service';
import { ProjectCreationService } from '@/services/project-creation.service';
import { ProjectValidationService } from '@/services/project-validation.service';
import { ProjectFixService } from '@/services/project-fix.service';
import { ProjectExtensionService } from '@/services/project-extension.service';
import { CompletionService } from '@/services/completion-service';
import { FileCompletionProvider } from '@/services/completion-providers/file-completion-provider';
import { ProjectCompletionProvider } from '@/services/completion-providers/project-completion-provider';
import { TemplateCompletionProvider } from '@/services/completion-providers/template-completion-provider';

// Import fake services for testing
import {
  FakeFileSystemService,
  FakeConfigurationService,
  FakeTemplateIdentifierService,
  FakeVariableSubstitutionService,
  FakeProjectManifestService,
  FakeTemplateService,
  FakeProjectCreationService,
  FakeProjectValidationService,
  FakeProjectFixService,
  FakeProjectExtensionService,
  FakeCompletionService,
} from '../../tests/fakes';

export function configureContainer(): DependencyContainer {
  // Phase 1: Core Services (no dependencies)
  container.registerSingleton(FileSystemService);
  container.registerSingleton(ConfigurationService);

  // Phase 2: Identifier Services
  container.registerSingleton(TemplateIdentifierService);

  // Phase 3: Data Services
  container.registerSingleton(VariableSubstitutionService);
  container.registerSingleton(ProjectManifestService);
  container.registerSingleton(TemplateService);

  // Phase 4: Business Logic Services
  container.registerSingleton(ProjectCreationService);
  container.registerSingleton(ProjectValidationService);
  container.registerSingleton(ProjectFixService);
  container.registerSingleton(ProjectExtensionService);
  container.registerSingleton(CompletionService);

  // Phase 5: Completion Providers
  container.registerSingleton(FileCompletionProvider);
  container.registerSingleton(ProjectCompletionProvider);
  container.registerSingleton(TemplateCompletionProvider);

  return container;
}

export function createTestContainer(): DependencyContainer {
  const testContainer = container.createChildContainer();

  // Register fake service instances for testing
  // Phase 1: Core Services
  testContainer.registerInstance(FileSystemService, new FakeFileSystemService() as any);
  testContainer.registerInstance(ConfigurationService, new FakeConfigurationService() as any);

  // Phase 2: Identifier Services
  testContainer.registerInstance(TemplateIdentifierService, new FakeTemplateIdentifierService() as any);

  // Phase 3: Data Services
  testContainer.registerInstance(VariableSubstitutionService, new FakeVariableSubstitutionService() as any);
  testContainer.registerInstance(ProjectManifestService, new FakeProjectManifestService() as any);
  testContainer.registerInstance(TemplateService, new FakeTemplateService() as any);

  // Phase 4: Business Logic Services
  testContainer.registerInstance(ProjectCreationService, new FakeProjectCreationService() as any);
  testContainer.registerInstance(ProjectValidationService, new FakeProjectValidationService() as any);
  testContainer.registerInstance(ProjectFixService, new FakeProjectFixService() as any);
  testContainer.registerInstance(ProjectExtensionService, new FakeProjectExtensionService() as any);
  testContainer.registerInstance(CompletionService, new FakeCompletionService() as any);

  return testContainer;
}

export { container };