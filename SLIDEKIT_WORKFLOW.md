# SlideKit Development Workflow

This document describes the exact process for implementing SlideKit. It is designed so that an AI agent can pick up this document, the design doc (`SLIDEKIT_DESIGN.md`), and the implementation plan (`SLIDEKIT_IMPLEMENTATION_PLAN.md`) with **zero prior context** and begin (or resume) implementation.

---

## Roles

### Orchestrator (outer agent)

The orchestrator manages the overall progress:

1. Reads the implementation plan to determine the next incomplete subtask
2. Spawns a sub-agent to execute that subtask (one at a time, sequentially)
3. When the sub-agent finishes, verifies all changes are committed
4. Updates the implementation plan to mark the subtask as done (add a `[DONE]` marker)
5. Commits the plan update
6. After all subtasks in a milestone are done, creates a git tag: `m1-done`, `m2-done`, etc.
7. Moves to the next subtask

### Sub-Agent (inner agent)

The sub-agent implements one subtask. It follows the pipeline described below **exactly**.

---

## Sub-Agent Pipeline (per subtask)

Every subtask follows these steps in order. Do not skip steps.

### Step 0: Orient

1. Read `SLIDEKIT_DESIGN.md` — understand what we're building and why
2. Read `SLIDEKIT_IMPLEMENTATION_PLAN.md` — find your assigned subtask, understand its requirements, dependencies, and deliverables
3. Read `SLIDEKIT_WORKFLOW.md` (this file) — understand the process you must follow
4. Read existing source code in `slidekit/` — understand what's already been built by previous subtasks. You are building on top of existing work. Do not duplicate or conflict with it.
5. If this is the first subtask (M1.1), there is no existing code yet — skip step 4.

### Step 1: Implement

Write the code for your subtask. Follow the implementation plan's specification closely.

Guidelines:
- Write clean, well-structured JavaScript (ES modules)
- Follow existing code conventions from previous subtasks
- Add clear section comments in the source for your additions
- Do NOT write tests yet (that comes in Step 5)
- Do NOT implement more than your assigned subtask

### Step 2: Commit implementation

```
git add <files>
git commit -m "M{X}.{Y}: <brief description of what was implemented>"
```

Example: `M1.1: Implement core element model with creation functions`

### Step 3: Get reviews

Get code reviews from **Gemini Pro 3** and **GPT 5.2** using the PAL MCP `codereview` or `consensus` tool.

Send them:
- The files you changed (via `relevant_files` parameter)
- A description of what you implemented and what subtask it corresponds to
- Ask them to review for: correctness, edge cases, API design, compatibility with the rest of the design doc

**Exception:** For trivially simple subtasks (a single pure function with < 20 lines, like anchor resolution), you may do a thorough self-review instead of external review. Document that you self-reviewed and why.

### Step 4: Address review feedback

Read the review feedback. For each issue raised:
- **Fix it** if you agree it's a real problem
- **Note and skip** if you disagree, but document why (in a comment or commit message)
- **Defer** if it's a valid concern but belongs to a later milestone — note this

Commit the fixes:
```
git commit -m "M{X}.{Y}: Address review feedback — <brief summary of changes>"
```

If there were no issues to fix, skip this commit.

### Step 5: Write or update tests

Write tests for your subtask following the testing strategy in the implementation plan:
- Tests go in the appropriate `test/test-*.js` file
- Follow the existing test structure (describe/it blocks)
- Cover: happy path, edge cases, error conditions
- For text measurement tests: use tolerance-based assertions
- Tests must be async-compatible (use async it() where needed)

Also run ALL existing tests (not just yours) to verify no regressions. If any existing tests break due to your changes, fix them.

**Test execution:** Load `test/test.html` in a browser (via Playwright or local server). The test runner outputs results to a DOM element. Check that all tests pass.

If you cannot run the tests in-browser (no Playwright available), verify that:
- Test files parse without syntax errors (load them as modules)
- Test assertions are logically correct by reading them
- Note in your commit message that browser execution was not verified

### Step 6: Commit tests

```
git commit -m "M{X}.{Y}: Add tests for <what was tested>"
```

### Step 7: Get test reviews

Get the tests reviewed by **Gemini Pro 3** and **GPT 5.2**:
- Send the test files
- Ask them to review for: coverage gaps, missing edge cases, assertion correctness, test isolation

**Exception:** Same as Step 3 — skip external review for trivially simple test suites.

### Step 8: Address test review feedback

Fix any issues raised. Commit:
```
git commit -m "M{X}.{Y}: Address test review feedback — <brief summary>"
```

### Step 9: Run tests (final verification)

Run the full test suite one final time. If anything fails:
1. Diagnose the failure
2. Fix the code (not the test, unless the test is wrong)
3. Commit the fix:
   ```
   git commit -m "M{X}.{Y}: Fix test failure — <what broke and why>"
   ```
4. Re-run all tests. Repeat until all pass.

### Step 10: Return to orchestrator

Report back to the orchestrator:
- What you implemented
- How many commits you made
- Any deferred issues or notes for future subtasks
- Whether all tests pass
- Any concerns about the design or plan that came up during implementation

---

## Commit Message Convention

Format: `M{milestone}.{subtask}: <description>`

Examples:
```
M1.1: Implement core element model with creation functions
M1.1: Address review feedback — add input validation for props
M1.1: Add tests for element creation and default values
M1.1: Address test review feedback — add edge case for empty content
M1.1: Fix test failure — text() with null content should throw
M1.3: Implement CSS property filtering with camelCase normalization
M2.3: Implement measureText using div-based DOM measurement
```

For orchestrator commits:
```
Progress: Mark M1.1 as done in implementation plan
Progress: Mark M1 milestone complete
```

---

## Git Tags

After all subtasks in a milestone are complete:

```
git tag m1-done -m "Milestone 1: Foundation — complete"
git tag m2-done -m "Milestone 2: Text Measurement — complete"
```

---

## Resuming From Cold Start

To resume implementation with no prior context:

1. Read `SLIDEKIT_DESIGN.md` — the full specification
2. Read `SLIDEKIT_IMPLEMENTATION_PLAN.md` — find the first subtask not marked `[DONE]`
3. Read `SLIDEKIT_WORKFLOW.md` (this file) — follow the sub-agent pipeline
4. Read existing source code in `slidekit/` — understand what's built so far
5. Check `git log --oneline` — see recent commits for context
6. Begin the sub-agent pipeline for the next incomplete subtask

---

## File Structure Reference

```
presentation_maker/
├── SLIDEKIT_DESIGN.md              # What to build (specification)
├── SLIDEKIT_IMPLEMENTATION_PLAN.md # How to build it (milestones + subtasks)
├── SLIDEKIT_WORKFLOW.md            # This file (process)
├── SLIDEKIT_IDEAS.md               # Future ideas (not in current scope)
└── slidekit/                       # The library (created during M1)
    ├── slidekit.js
    ├── slidekit-debug.js
    ├── test/
    │   ├── test.html
    │   ├── test-runner.js
    │   └── test-*.js
    └── examples/
```

---

## Notes

- **One sub-agent per subtask.** Never combine subtasks. Each gets its own agent invocation and its own set of commits.
- **Reviews are non-negotiable** (except for trivially simple code as noted). The two-model review catches issues that single-model implementation misses.
- **Tests run after every subtask.** Not just the new tests — the full suite. Regressions caught early are easy to fix.
- **The implementation plan is the source of truth** for what to build next. The `[DONE]` markers in the plan are how we track progress.
- **If a sub-agent discovers a design issue** (something in the plan that won't work, or a conflict with the design doc), it should note it in its return message. The orchestrator decides whether to update the plan before proceeding.
