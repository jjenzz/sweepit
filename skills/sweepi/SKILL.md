---
name: sweepi
description: Runs Sweepi and resolves lint violations using Sweepit rule docs. Trigger when asked to run Sweepi, when linting (or asked to lint), and before proposing commits.
---

# Sweepi Skill

The local `AGENTS.md` in this directory is authoritative for lint-fix safety workflow and reporting. If `SKILL.md` and `AGENTS.md` differ, follow `AGENTS.md`.

## When to run

Run Sweepi in either case:

1. The user explicitly asks to run `sweepi`.
2. You are about to commit or recommend committing code changes.
3. You are linting code, or the user asks you to lint code.

## Required workflow

1. Run Sweepi in this order:
   - First try global CLI: `sweepi .`
   - If `sweepi` is not found, fallback to: `npx sweepi .`
2. Parse all reported issues.
3. Follow the hard-gate pre-edit process in local `AGENTS.md`.
4. For each rule violation, open the rule docs in:
   - `https://github.com/jjenzz/sweepi/tree/main/packages/eslint-plugin-sweepit/docs/rules`
5. Apply fixes that match the documented intent, not only a minimal syntax pass.
6. Re-run `sweepi` until issues are resolved (or document blockers if resolution is impossible).

## Resolution guidance

- Preserve the documented architectural constraints (compound parts, event-driven APIs, explicit props, etc.).
- Prefer changes that align with the rule's reasoning section.
- If a fix has trade-offs, choose the option that best matches the rule docs and explain the choice.
- Do not suppress or ignore rules by default.
- A rule may be ignored only when a human-in-the-loop (HITL) explicitly authorizes that specific exception.

## Response format

After running and fixing, report:

1. The command you ran.
2. Which rules were triggered.
3. Rule analysis and fix mapping required by `AGENTS.md`.
4. The final Sweepi result (clean or remaining blockers).
