---
name: sweepi
description: Orchestrate Sweepi linting via a dedicated sub-agent, apply rule-aligned fixes, and report outcomes. Trigger when asked to run sweepi or linting, and before proposing commits.
---

# Sweepi Skill (Orchestrator)

This skill is for the **parent agent**. It must delegate lint execution and lint-fix loops to a **sub-agent**.

## When to run

Run this skill when:

1. The user asks to run `sweepi` or linting.
2. You are about to propose a commit.
3. You changed files that may trigger lint rules.

## Non-Negotiable Execution Rule

- The parent agent **must not** run `sweepi` directly.
- Linting and lint-fix work **must** be performed by a dedicated sub-agent.
- Required sub-agent type: `shell` (preferred) or `generalPurpose` if shell is unavailable.

## Workflow

1. Gather list of changed file paths `git diff --name-only` or `all` if linting everything.
1. Launch one lint sub-agent with a strict lint prompt (template below).
1. Wait for sub-agent report.
1. If blockers remain, either:
   - re-run sub-agent with narrowed instructions, or
   - escalate to user when docs are missing/ambiguous or safe fix path is unavailable.
1. Summarize final status for user (fixed rules, blockers, final lint state).

## Required sub-agent lint prompt

Pass this prompt to the lint sub-agent (substitue `--file "<path-one>" --file "<path-two>"`):

```
Run Sweepi linting, resolve violations according to rule docs, re-run until clean or blocked.

- Load and obey sweepi skill `AGENTS.md`.
- Run `sweepi . --file "<path-one>" --file "<path-two>"` (use `npx` if not installed globally)
- If the user asks to lint everything, use `--all` instead of `--file`.
- DO NOT suppress rules, disable linting, or make speculative fixes without docs.
- Return: CLEAN or BLOCKED with structured report.
```

## Completion criteria

This skill is complete only when one of the following is true:

1. Sweepi output is clean, or
2. A blocker report is produced with explicit rule IDs, missing/ambiguous docs, and requested human decision.

## Handoff format (parent → user)

Include:

1. Final lint status (clean/blocked)
2. Rules fixed and rationale
3. Any behavior/API impact (should be none unless approved)
4. Remaining blockers and required decisions
