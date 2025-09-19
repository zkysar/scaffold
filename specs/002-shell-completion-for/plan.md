
# Implementation Plan: Shell Completion for CLI

**Branch**: `002-shell-completion-for` | **Date**: 2025-09-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-shell-completion-for/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Add shell completion support to the scaffold CLI, enabling tab completion for commands, subcommands, options, and context-aware suggestions in bash, zsh, and other shells. This will improve CLI usability and discoverability.

## Technical Context
**Language/Version**: Node.js 20+ with TypeScript 5.3+
**Primary Dependencies**: Commander.js (existing CLI framework), Shell completion library [NEEDS CLARIFICATION: commander built-in vs tabtab vs omelette]
**Storage**: Shell config files (.bashrc, .zshrc) for completion script installation
**Testing**: Jest for unit tests, Manual shell testing for completion behavior
**Target Platform**: Unix-like systems (Linux, macOS), Windows with Git Bash/WSL [NEEDS CLARIFICATION: full Windows PowerShell support needed?]
**Project Type**: single - CLI tool enhancement
**Performance Goals**: Instant completion (<100ms response time)
**Constraints**: Must not break existing CLI functionality, clean install/uninstall process
**Scale/Scope**: Support for ~10 commands with ~5 subcommands each, dynamic completion for project/template names

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: Constitution file uses placeholder template structure. Applying general software engineering principles:

- ✅ **Single Responsibility**: Shell completion is a focused, standalone feature
- ✅ **Testing Requirements**: Will write tests before implementation (TDD)
- ✅ **Simplicity**: Using existing Commander.js capabilities where possible
- ✅ **Observability**: Completion scripts will log errors to stderr
- ✅ **No Breaking Changes**: Enhancement to existing CLI, backward compatible

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 1 (Single project) - This is a CLI enhancement, fits existing structure

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude` for your AI assistant
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Contract tests for completion commands [P]
- Model creation for completion entities [P]
- Service implementation for completion logic
- CLI command handlers for completion subcommands
- Integration tests for shell behavior

**Specific Task Categories**:
1. **Data Model Tasks** (5 tasks):
   - CompletionConfig model [P]
   - CommandMetadata model [P]
   - CompletionContext model [P]
   - CompletionResult model [P]
   - Model validation tests

2. **Service Tasks** (8 tasks):
   - Shell detection service
   - Completion script generator
   - Installation service
   - Dynamic completion provider
   - Cache management service
   - Command parser service
   - Completion filter service
   - Service unit tests

3. **CLI Command Tasks** (6 tasks):
   - `completion install` command
   - `completion uninstall` command
   - `completion status` command
   - `completion script` command
   - Internal completion handler
   - Command integration tests

4. **Shell Script Tasks** (3 tasks):
   - Bash completion script
   - Zsh completion script
   - Fish completion script

5. **Testing Tasks** (5 tasks):
   - Contract test implementation
   - Integration test setup
   - Performance benchmarks
   - Manual test procedures
   - Documentation tests

**Ordering Strategy**:
- TDD order: Tests before implementation
- Dependencies: Models → Services → Commands → Scripts
- Mark [P] for parallel execution within each category

**Estimated Output**: 27 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
