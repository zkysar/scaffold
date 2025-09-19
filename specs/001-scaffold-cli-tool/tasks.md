# Tasks: Scaffold CLI Tool

**Input**: Design documents from `/specs/001-scaffold-cli-tool/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Extract: Node.js 20+, TypeScript 5.3+, Commander.js, Inquirer, fs-extra
2. Load design documents:
   → data-model.md: 5 entities (Template, Project, Config, ValidationReport, TemplateLibrary)
   → contracts/cli-commands.json: 8 commands (new, template, check, fix, extend, show, config, clean)
   → research.md: Docker-based development, mock-fs testing
3. Generate tasks by category:
   → Setup: Docker config, TypeScript project, dependencies
   → Tests: Contract tests for each command, integration tests
   → Core: Models, services, CLI command handlers
   → Integration: File system operations, config cascade
   → Polish: Unit tests, performance validation
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T056)
6. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- Commands in `src/cli/`, services in `src/services/`, models in `src/models/`

## Phase 3.1: Setup
- [ ] T001 Create project structure with src/, tests/, docker/ directories
- [ ] T002 Initialize Node.js project with TypeScript 5.3+ configuration
- [ ] T003 [P] Create Docker Compose setup in docker-compose.yml
- [ ] T004 [P] Configure ESLint and Prettier in .eslintrc.json and .prettierrc
- [ ] T005 Install core dependencies: commander, inquirer, fs-extra, chalk, uuid
- [ ] T006 [P] Create TypeScript build configuration in tsconfig.json
- [ ] T007 [P] Setup Jest testing framework with mock-fs in jest.config.js

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (Commands)
- [ ] T008 [P] Contract test 'scaffold new' command in tests/contract/test-new-command.ts
- [ ] T009 [P] Contract test 'scaffold template' subcommands in tests/contract/test-template-command.ts
- [ ] T010 [P] Contract test 'scaffold check' command in tests/contract/test-check-command.ts
- [ ] T011 [P] Contract test 'scaffold fix' command in tests/contract/test-fix-command.ts
- [ ] T012 [P] Contract test 'scaffold extend' command in tests/contract/test-extend-command.ts
- [ ] T013 [P] Contract test 'scaffold show' command in tests/contract/test-show-command.ts
- [ ] T014 [P] Contract test 'scaffold config' command in tests/contract/test-config-command.ts
- [ ] T015 [P] Contract test 'scaffold clean' command in tests/contract/test-clean-command.ts

### Integration Tests (User Scenarios)
- [ ] T016 [P] Integration test project lifecycle in tests/integration/test-project-lifecycle.ts
- [ ] T017 [P] Integration test template management in tests/integration/test-template-management.ts
- [ ] T018 [P] Integration test configuration cascade in tests/integration/test-configuration.ts
- [ ] T019 [P] Integration test structure validation and repair in tests/integration/test-validation-sync.ts
- [ ] T020 [P] Integration test conflict resolution in tests/integration/test-conflicts.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Data Models
- [ ] T021 [P] Template model and interfaces in src/models/template.ts
- [ ] T022 [P] ProjectManifest model in src/models/project.ts
- [ ] T023 [P] ScaffoldConfig model in src/models/configuration.ts
- [ ] T024 [P] ValidationReport model in src/models/validation.ts
- [ ] T025 [P] TemplateLibrary model in src/models/template-library.ts

### Service Layer
- [ ] T026 [P] TemplateService CRUD operations in src/services/template-service.ts
- [ ] T027 [P] ProjectService management in src/services/project-service.ts
- [ ] T028 [P] ConfigurationService with cascade logic in src/services/config-service.ts
- [ ] T029 [P] ValidationService with rule engine in src/services/validation-service.ts
- [ ] T030 [P] FileSystemService abstraction in src/services/filesystem-service.ts
- [ ] T031 [P] ConflictResolutionService in src/services/conflict-service.ts
- [ ] T032 [P] BackupService for rollback capability in src/services/backup-service.ts

### CLI Command Handlers
- [ ] T033 Main CLI entry point with Commander setup in src/cli/index.ts
- [ ] T034 'scaffold new' command handler in src/cli/commands/new.ts
- [ ] T035 'scaffold template' command handler in src/cli/commands/template.ts
- [ ] T036 'scaffold check' command handler in src/cli/commands/check.ts
- [ ] T037 'scaffold fix' command handler in src/cli/commands/fix.ts
- [ ] T038 'scaffold extend' command handler in src/cli/commands/extend.ts
- [ ] T039 'scaffold show' command handler in src/cli/commands/show.ts
- [ ] T040 'scaffold config' command handler in src/cli/commands/config.ts
- [ ] T041 'scaffold clean' command handler in src/cli/commands/clean.ts

### Utility Functions
- [ ] T042 [P] Variable replacement utility in src/lib/variables.ts
- [ ] T043 [P] Path validation utility in src/lib/path-utils.ts
- [ ] T044 [P] Progress reporting utility in src/lib/progress.ts
- [ ] T045 [P] Error formatting utility in src/lib/errors.ts

## Phase 3.4: Integration
- [ ] T046 Connect services to file system operations
- [ ] T047 Wire up CLI commands to services
- [ ] T048 Implement interactive prompts with inquirer
- [ ] T049 Add colored output with chalk
- [ ] T050 Implement dry-run mode for destructive operations
- [ ] T051 Add verbose and quiet output modes

## Phase 3.5: Polish
- [ ] T052 [P] Unit tests for all services in tests/unit/services/
- [ ] T053 [P] Unit tests for utilities in tests/unit/lib/
- [ ] T054 Performance validation: < 1 second for operations
- [ ] T055 [P] Generate CLI documentation in docs/commands.md
- [ ] T056 Execute quickstart.md scenarios for validation

## Dependencies
- Setup (T001-T007) must complete first
- Tests (T008-T020) before implementation (T021-T045)
- Models (T021-T025) before services (T026-T032)
- Services before CLI handlers (T033-T041)
- All implementation before integration (T046-T051)
- Integration before polish (T052-T056)

## Parallel Execution Examples

### Parallel Test Creation
```bash
# Launch T008-T015 together (contract tests):
Task agent: "Contract test 'scaffold new' command in tests/contract/test-new-command.ts"
Task agent: "Contract test 'scaffold template' subcommands in tests/contract/test-template-command.ts"
Task agent: "Contract test 'scaffold check' command in tests/contract/test-check-command.ts"
Task agent: "Contract test 'scaffold fix' command in tests/contract/test-fix-command.ts"
Task agent: "Contract test 'scaffold extend' command in tests/contract/test-extend-command.ts"
Task agent: "Contract test 'scaffold show' command in tests/contract/test-show-command.ts"
Task agent: "Contract test 'scaffold config' command in tests/contract/test-config-command.ts"
Task agent: "Contract test 'scaffold clean' command in tests/contract/test-clean-command.ts"
```

### Parallel Model Creation
```bash
# Launch T021-T025 together (models):
Task agent: "Template model and interfaces in src/models/template.ts"
Task agent: "ProjectManifest model in src/models/project.ts"
Task agent: "ScaffoldConfig model in src/models/configuration.ts"
Task agent: "ValidationReport model in src/models/validation.ts"
Task agent: "TemplateLibrary model in src/models/template-library.ts"
```

### Parallel Service Implementation
```bash
# Launch T026-T032 together (services):
Task agent: "TemplateService CRUD operations in src/services/template-service.ts"
Task agent: "ProjectService management in src/services/project-service.ts"
Task agent: "ConfigurationService with cascade logic in src/services/config-service.ts"
Task agent: "ValidationService with rule engine in src/services/validation-service.ts"
Task agent: "FileSystemService abstraction in src/services/filesystem-service.ts"
Task agent: "ConflictResolutionService in src/services/conflict-service.ts"
Task agent: "BackupService for rollback capability in src/services/backup-service.ts"
```

## Notes
- Docker-based development from start (T003)
- TDD approach: All tests must fail before implementation
- Use mock-fs for file system testing (T007)
- Commander.js for CLI framework (T033)
- Inquirer for interactive prompts (T048)
- Each command gets its own handler file
- Services abstract business logic from CLI
- Models match data-model.md exactly

## Validation Checklist
*Verified during task generation*

- [x] All 8 commands have contract tests (T008-T015)
- [x] All 5 entities have model tasks (T021-T025)
- [x] All tests come before implementation
- [x] Parallel tasks use different files
- [x] Each task specifies exact file path
- [x] No parallel tasks modify same file