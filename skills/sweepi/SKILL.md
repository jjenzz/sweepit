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

1. Launch one lint sub-agent with a strict task contract (template below).
2. Wait for sub-agent report.
3. If blockers remain, either:
   - re-run sub-agent with narrowed instructions, or
   - escalate to user when docs are missing/ambiguous or safe fix path is unavailable.
4. Summarize final status for user (fixed rules, blockers, final lint state).

## Required sub-agent task template

Use this template when launching the sub-agent:

- **Objective:** Run Sweepi linting, resolve violations according to rule docs, re-run until clean or blocked.
- **Must:** Load and obey sweepi skill `AGENTS.md`.
- **Run:** `command -v sweepi >/dev/null 2>&1 && sweepi . || npx sweepi .`
- **Do not:** suppress rules, disable linting, or make speculative fixes without docs.
- **Return:** structured report including commands run, rule/doc mapping, fixes applied, final result, and blockers.

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
