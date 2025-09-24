import 'reflect-metadata';
import { container, DependencyContainer } from 'tsyringe';

import { FileCompletionProvider } from '@/services/completion-providers/file-completion-provider';
import { ProjectCompletionProvider } from '@/services/completion-providers/project-completion-provider';
import { TemplateCompletionProvider } from '@/services/completion-providers/template-completion-provider';
import { CompletionService } from '@/services/completion-service';
import { ConfigurationService } from '@/services/configuration.service';
import { FileSystemService } from '@/services/file-system.service';
import { ProjectCreationService } from '@/services/project-creation.service';
import { ProjectExtensionService } from '@/services/project-extension.service';
import { ProjectFixService } from '@/services/project-fix.service';
import { ProjectManifestService } from '@/services/project-manifest.service';
import { ProjectValidationService } from '@/services/project-validation.service';
import { TemplateIdentifierService } from '@/services/template-identifier-service';
import { TemplateService } from '@/services/template-service';
import { VariableSubstitutionService } from '@/services/variable-substitution.service';

export function configureContainer(): DependencyContainer {
  // Phase 1: Core Services (no dependencies)
  container.registerSingleton(FileSystemService);
  container.registerSingleton(ConfigurationService);

  // Phase 2: Identifier Services
  container.register(TemplateIdentifierService, {
    useFactory: () => TemplateIdentifierService.getInstance()
  });

  // Phase 3: Data Services
  container.registerSingleton(VariableSubstitutionService);
  container.registerSingleton(ProjectManifestService);
  container.register(TemplateService, {
    useFactory: (c) => new TemplateService(c.resolve(TemplateIdentifierService))
  });

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

  // Register test-specific implementations here
  // This allows overriding services for testing

  return testContainer;
}

export { container };