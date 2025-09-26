import 'reflect-metadata';
import * as os from 'os';
import * as path from 'path';

import { container, DependencyContainer } from 'tsyringe';

import { CommandExecutor } from '@/cli/commands/command-executor';
import { CommandFactory } from '@/cli/commands/command-factory';
import { DisplayFactory } from '@/cli/displays/display-factory';
import { ErrorHandler } from '@/cli/errors/error-handler';
import { CheckHandler } from '@/cli/handlers/check-handler';
import { CleanHandler } from '@/cli/handlers/clean-handler';
import { ConfigHandler } from '@/cli/handlers/config-handler';
import { ExtendHandler } from '@/cli/handlers/extend-handler';
import { FixHandler } from '@/cli/handlers/fix-handler';
import { NewHandler } from '@/cli/handlers/new-handler';
import { ShowHandler } from '@/cli/handlers/show-handler';
import { TemplateHandler } from '@/cli/handlers/template-handler';
import { ProgramBuilder } from '@/cli/program-builder';
import { BackupService } from '@/services/backup.service';
import { ConfigurationService } from '@/services/configuration.service';
import { FileOperationsService } from '@/services/file-operations.service';
import { FileSystemService } from '@/services/file-system.service';
import { InteractionService } from '@/services/interaction.service';
import { PathService } from '@/services/path.service';
import { ProjectCreationService } from '@/services/project-creation.service';
import { ProjectExtensionService } from '@/services/project-extension.service';
import { ProjectFixService } from '@/services/project-fix.service';
import { ProjectManifestService } from '@/services/project-manifest.service';
import { ProjectValidationService } from '@/services/project-validation.service';
import { TemplateCrudService } from '@/services/template-crud.service';
import { TemplateIdentifierService } from '@/services/template-identifier-service';
import { TemplateImportExportService } from '@/services/template-import-export.service';
import { TemplateLoaderService } from '@/services/template-loader.service';
import { TemplateMigrationService } from '@/services/template-migration.service';
import { TemplateService } from '@/services/template-service';
import { VariableSubstitutionCoreService } from '@/services/variable-substitution-core.service';
import { VariableSubstitutionService } from '@/services/variable-substitution.service';
import { VariableValidationService } from '@/services/variable-validation.service';

export function configureContainer(): DependencyContainer {
  return internalConfigureContainer(container);
}

export function createTestContainer(): DependencyContainer {
  const testContainer = container.createChildContainer();

  // Configure the test container with all production services
  internalConfigureContainer(testContainer);

  // Override with test-specific implementations if needed
  // For example, use temp directories for file operations
  const testAliasFilePath = path.join(
    os.tmpdir(),
    '.scaffold-test',
    'templates',
    'aliases.json'
  );
  testContainer.registerInstance('aliasFilePath', testAliasFilePath);

  return testContainer;
}

function internalConfigureContainer(
  targetContainer: DependencyContainer = container
): DependencyContainer {
  // Register the container itself as a token
  targetContainer.registerInstance('Container', targetContainer);

  // Register path tokens
  const aliasFilePath = path.join(
    os.homedir(),
    '.scaffold',
    'templates',
    'aliases.json'
  );
  targetContainer.registerInstance('aliasFilePath', aliasFilePath);

  // Phase 1: Core Services (no dependencies)
  targetContainer.registerSingleton(FileSystemService);
  targetContainer.registerSingleton(FileOperationsService);
  targetContainer.registerSingleton(BackupService);
  targetContainer.registerSingleton(PathService);
  targetContainer.registerSingleton(ConfigurationService);

  // Phase 2: CLI Infrastructure
  targetContainer.registerSingleton(ErrorHandler);
  targetContainer.registerSingleton(DisplayFactory);
  targetContainer.registerSingleton(CommandExecutor);
  targetContainer.registerSingleton(CommandFactory);
  targetContainer.registerSingleton(ProgramBuilder);

  // Phase 3: Identifier Services
  targetContainer.registerSingleton(TemplateIdentifierService);

  // Phase 4: Data Services
  targetContainer.registerSingleton(VariableSubstitutionService);
  targetContainer.registerSingleton(VariableSubstitutionCoreService);
  targetContainer.registerSingleton(VariableValidationService);
  targetContainer.registerSingleton(ProjectManifestService);
  targetContainer.registerSingleton(TemplateService);
  targetContainer.registerSingleton(TemplateLoaderService);
  targetContainer.registerSingleton(TemplateCrudService);
  targetContainer.registerSingleton(TemplateMigrationService);
  targetContainer.registerSingleton(TemplateImportExportService);

  // Phase 5: Business Logic Services
  targetContainer.registerSingleton(InteractionService);
  targetContainer.registerSingleton(ProjectCreationService);
  targetContainer.registerSingleton(ProjectValidationService);
  targetContainer.registerSingleton(ProjectFixService);
  targetContainer.registerSingleton(ProjectExtensionService);

  // Phase 6: Command Handlers
  targetContainer.registerSingleton(CheckHandler);
  targetContainer.registerSingleton(CleanHandler);
  targetContainer.registerSingleton(ConfigHandler);
  targetContainer.registerSingleton(ExtendHandler);
  targetContainer.registerSingleton(FixHandler);
  targetContainer.registerSingleton(NewHandler);
  targetContainer.registerSingleton(ShowHandler);
  targetContainer.registerSingleton(TemplateHandler);

  return targetContainer;
}

export { container };
