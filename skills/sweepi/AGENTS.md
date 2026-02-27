# Sweepi Agent Guardrails

## Rule: Mandatory Lint-Rule Doc Verification Before Edits

When fixing lint or rule violations, do not edit code until all required pre-edit steps are complete.

## Required Workflow (Hard Gate)

1. List every triggered rule ID from lint output.
2. Fetch and read the official docs for each triggered rule.
3. For each rule, provide:
   - Rule ID
   - Doc URL
   - Key requirement(s) (quoted or precise paraphrase)
   - Planned code change mapped to the requirement(s)
   - Confirmation that existing behavior is preserved
4. If docs cannot be fetched or read, stop and ask for instructions. Do not make speculative fixes.
5. Do not ask for explicit human approval before edits unless:
   - functionality may be lost,
   - docs are ambiguous, or
   - there is no safe implementation path.

## Non-Negotiable Constraints

- Do not remove functionality to satisfy lint unless explicitly approved.
- If API changes are unavoidable, clearly mark them and request approval first.
- Do not suppress or disable lint rules unless explicitly approved.

## Required Response Template (Before Any Edit)

### Lint Rules Detected

- `<rule-id-1>`
- `<rule-id-2>`

### Rule Analysis

- **Rule:** `<rule-id>`
- **Doc URL:** `<url>`
- **Key requirement(s):** `<quote/paraphrase>`
- **Planned compliant fix:** `<what will change>`
- **Behavior preserved:** `yes/no` + `<explanation>`

### Edit Safety Check

- **Functionality removed?** `no` (or `yes` with explicit justification)
- **API changes?** `no` (or `yes` with migration notes)
- **Ready to implement?** `yes` or `awaiting user approval`

## Required Post-Edit Report

After edits, report:

1. Exact commands run
2. Rules fixed and how each fix matches docs
3. Any behavior or API changes (should be none unless approved)
4. Final lint result (clean or remaining blockers)
