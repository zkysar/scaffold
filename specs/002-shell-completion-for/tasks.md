# Tasks: Shell Completion for CLI

**Input**: Design documents from `/specs/002-shell-completion-for/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 3.1: Setup
- [ ] T001 Verify Commander.js version supports completion API (package.json)
- [ ] T002 [P] Create src/cli/completion directory for completion handlers
- [ ] T003 [P] Configure Jest for completion module testing in tests/unit/completion/

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T004 [P] Contract test completion install command in tests/contract/test_completion_install.ts
- [ ] T005 [P] Contract test completion uninstall command in tests/contract/test_completion_uninstall.ts
- [ ] T006 [P] Contract test completion script generation in tests/contract/test_completion_script.ts
- [ ] T007 [P] Contract test completion status command in tests/contract/test_completion_status.ts
- [ ] T008 [P] Contract test command completion generation in tests/contract/test_completion_generation.ts
- [ ] T009 [P] Contract test dynamic completion providers in tests/contract/test_completion_dynamic.ts
- [ ] T010 [P] Contract test error handling in tests/contract/test_completion_errors.ts
- [ ] T011 [P] Integration test bash shell completion in tests/integration/test_bash_completion.ts
- [ ] T012 [P] Integration test zsh shell completion in tests/integration/test_zsh_completion.ts
- [ ] T013 [P] Integration test installation flow in tests/integration/test_installation_flow.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)
### Data Models
- [ ] T014 [P] CompletionConfig model in src/models/completion-config.ts
- [ ] T015 [P] CommandMetadata model in src/models/command-metadata.ts
- [ ] T016 [P] SubcommandMetadata model in src/models/subcommand-metadata.ts
- [ ] T017 [P] OptionMetadata model in src/models/option-metadata.ts
- [ ] T018 [P] ArgumentMetadata model in src/models/argument-metadata.ts
- [ ] T019 [P] CompletionContext model in src/models/completion-context.ts
- [ ] T020 [P] CompletionResult model in src/models/completion-result.ts
- [ ] T021 [P] CompletionItem model in src/models/completion-item.ts

### Services
- [ ] T022 [P] Shell detection service in src/services/shell-detector.ts
- [ ] T023 [P] Completion script generator in src/services/completion-generator.ts
- [ ] T024 [P] Installation service in src/services/completion-installer.ts
- [ ] T025 [P] Dynamic completion provider in src/services/dynamic-completion.ts
- [ ] T026 [P] Cache management service in src/services/completion-cache.ts
- [ ] T027 [P] Command parser service in src/services/command-parser.ts
- [ ] T028 [P] Completion filter service in src/services/completion-filter.ts

### CLI Commands
- [ ] T029 Completion install command in src/cli/completion/install-command.ts
- [ ] T030 Completion uninstall command in src/cli/completion/uninstall-command.ts
- [ ] T031 Completion status command in src/cli/completion/status-command.ts
- [ ] T032 Completion script command in src/cli/completion/script-command.ts
- [ ] T033 Internal completion handler in src/cli/completion/completion-handler.ts
- [ ] T034 Register completion commands in src/cli/index.ts

### Shell Scripts
- [ ] T035 [P] Generate bash completion script template in src/cli/completion/templates/bash-completion.sh
- [ ] T036 [P] Generate zsh completion script template in src/cli/completion/templates/zsh-completion.sh
- [ ] T037 [P] Generate fish completion script template in src/cli/completion/templates/fish-completion.fish

## Phase 3.4: Integration
- [ ] T038 Connect completion to Commander.js in src/cli/index.ts
- [ ] T039 Add dynamic project name provider in src/services/dynamic-completion.ts
- [ ] T040 Add dynamic template name provider in src/services/dynamic-completion.ts
- [ ] T041 Implement cache persistence in src/services/completion-cache.ts
- [ ] T042 Add shell configuration file detection in src/services/shell-detector.ts
- [ ] T043 Implement completion script injection in src/services/completion-installer.ts

## Phase 3.5: Polish
- [ ] T044 [P] Unit tests for shell detector in tests/unit/services/test_shell_detector.ts
- [ ] T045 [P] Unit tests for completion generator in tests/unit/services/test_completion_generator.ts
- [ ] T046 [P] Unit tests for cache management in tests/unit/services/test_completion_cache.ts
- [ ] T047 [P] Unit tests for command parser in tests/unit/services/test_command_parser.ts
- [ ] T048 Performance benchmarks for completion response in tests/performance/test_completion_speed.ts
- [ ] T049 [P] Add completion documentation to docs/cli-completion.md
- [ ] T050 [P] Create manual test procedures in tests/manual/completion-testing.md
- [ ] T051 Execute quickstart scenarios from quickstart.md

## Dependencies
- Tests (T004-T013) before implementation (T014-T037)
- Models (T014-T021) before services (T022-T028)
- Services (T022-T028) before commands (T029-T034)
- Commands before integration (T038-T043)
- Implementation before polish (T044-T051)

## Parallel Execution Examples

### Example 1: Launch all contract tests together
```javascript
// Launch T004-T010 in parallel using Task agent
Task: "Contract test completion install command in tests/contract/test_completion_install.ts"
Task: "Contract test completion uninstall command in tests/contract/test_completion_uninstall.ts"
Task: "Contract test completion script generation in tests/contract/test_completion_script.ts"
Task: "Contract test completion status command in tests/contract/test_completion_status.ts"
Task: "Contract test command completion generation in tests/contract/test_completion_generation.ts"
Task: "Contract test dynamic completion providers in tests/contract/test_completion_dynamic.ts"
Task: "Contract test error handling in tests/contract/test_completion_errors.ts"
```

### Example 2: Launch all models together
```javascript
// Launch T014-T021 in parallel using Task agent
Task: "CompletionConfig model in src/models/completion-config.ts"
Task: "CommandMetadata model in src/models/command-metadata.ts"
Task: "SubcommandMetadata model in src/models/subcommand-metadata.ts"
Task: "OptionMetadata model in src/models/option-metadata.ts"
Task: "ArgumentMetadata model in src/models/argument-metadata.ts"
Task: "CompletionContext model in src/models/completion-context.ts"
Task: "CompletionResult model in src/models/completion-result.ts"
Task: "CompletionItem model in src/models/completion-item.ts"
```

### Example 3: Launch all services together
```javascript
// Launch T022-T028 in parallel using Task agent
Task: "Shell detection service in src/services/shell-detector.ts"
Task: "Completion script generator in src/services/completion-generator.ts"
Task: "Installation service in src/services/completion-installer.ts"
Task: "Dynamic completion provider in src/services/dynamic-completion.ts"
Task: "Cache management service in src/services/completion-cache.ts"
Task: "Command parser service in src/services/command-parser.ts"
Task: "Completion filter service in src/services/completion-filter.ts"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task group
- Commander.js provides base completion support via `.completion()` method
- Dynamic completions need <100ms response time
- Shell scripts are templates, actual completion logic in TypeScript

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - Each test section → contract test task [P]
   - Installation, uninstallation, status, script, generation, dynamic, errors

2. **From Data Model**:
   - 8 model entities → 8 model creation tasks [P]
   - All models are independent data structures

3. **From User Stories (quickstart.md)**:
   - Installation flow → integration test
   - Shell-specific behavior → shell integration tests
   - Manual testing procedures → documentation task

4. **Ordering**:
   - Setup → Tests → Models → Services → Commands → Scripts → Integration → Polish
   - Dependencies block parallel execution

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All contracts have corresponding tests (T004-T013)
- [x] All entities have model tasks (T014-T021)
- [x] All tests come before implementation
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task

---
**Status**: Tasks generated from design documents
**Total Tasks**: 51
**Parallel Groups**: Models (8), Services (7), Contract Tests (7), Shell Scripts (3), Unit Tests (4)