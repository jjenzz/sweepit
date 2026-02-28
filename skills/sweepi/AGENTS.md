## Required Workflow (Hard Gate)

1. List every triggered rule ID from lint output.
2. Fetch and read the official docs for each triggered rule.
3. For each rule, provide:
   - **Rule:** `<rule-id>`
   - **Doc URL:** `<url>`
   - **Key requirement(s):** `<quote/paraphrase>`
4. If docs cannot be fetched or read, stop and ask for instructions. Do not make speculative fixes.
5. Do not ask for explicit human approval before edits unless:
   - functionality may be lost,
   - docs are ambiguous, or
   - there is no safe implementation path.

## Non-Negotiable Constraints

- Preserve documented architectural constraints (compound parts, event-driven APIs, explicit props, and related project conventions).
- Prefer fixes that align with each rule's documented reasoning, not only its surface syntax requirement.
- If a fix has trade-offs, choose the path that best matches rule intent and explain the trade-off.
- Never trade behavior-preserving architecture for a smaller lint-only diff.
- Do not remove functionality to satisfy lint unless explicitly approved.
- Do not suppress or ignore rules by default.
- A rule may be ignored only when a human-in-the-loop (HITL) explicitly authorizes that specific exception.

## Conflict Resolution Order

When constraints conflict, apply this priority:

1. Preserve runtime behavior and user-visible capability.
2. Preserve project architectural conventions from user/rule docs.
3. Satisfy lint-rule compliance.
4. Minimize diff size.

If a lower-priority fix would violate a higher-priority constraint, choose the higher-priority path and explain why.

## Required Post-Edit Report

After edits, report:

1. Exact commands run
2. Rules fixed and how each fix matches docs
3. Any behavior or API changes (should be none unless approved)
4. Final lint result (clean or remaining blockers)
