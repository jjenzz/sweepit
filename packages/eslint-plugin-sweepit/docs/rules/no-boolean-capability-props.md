# Disallow boolean capability props (`no-boolean-capability-props`)

Disallow boolean component props that do not have an associated control handler.

## Why

Capability booleans turn one component into many hidden variants.
Each additional boolean doubles possible states, which quickly creates fragile conditional branches and unmaintainable APIs.
Prefer event-driven APIs, controlled contracts, or explicit compound composition where each variant is clear in JSX.

## Rule Details

- **Target**: TypeScript `*Props` declarations (`interface` and object `type` members).
- **Reported**: Boolean-like props without an associated handler in the same contract.
- **Associated handlers**: any handler prop starting with `on{PropName}` (for example `open` -> `onOpenChange` or `onOpenToggle`).
- **Boolean-like** includes `boolean`, `true | false`, and unions containing boolean.

## Options

```json
{
  "ignore": ["asChild"],
  "ignoreNativeBooleanProps": true
}
```

- `ignore` (`string[]`): prop names to skip.
- `ignoreNativeBooleanProps` (`boolean`): skip native HTML/React boolean attributes (for example `disabled`, `checked`, `required`, `multiple`).

## Examples

### Incorrect

```tsx
interface DialogProps {
  open: boolean;
  isEditing: boolean;
  onOpenChange: (open: boolean) => void;
}
```

### Correct

```tsx
interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EditorProps {
  isEditing: boolean;
  onIsEditingChange: (next: boolean) => void;
}
```

## How To Fix

1. Add a matching handler to each boolean state prop (for example `open` + `onOpenChange`, where handler names start with `on{PropName}`).
2. If a boolean only toggles presentation variants, prefer explicit compound composition first (for example separate parts or composed branches in JSX).
3. If composition is not practical, replace the boolean with an explicit prop (see [### Naming Guardrail](#user-content-naming-guardrail)).
4. Keep state transitions explicit through events rather than hidden conditional branches.

### Naming Guardrail

- When replacing a forbidden boolean, preserve domain intent in the new prop name.
- Use semantic names for meaning/state (for example `status`, `priority`, `severity`).
- Use style-coupled names (for example `variant`, `appearance`, `color`) only for visual design-system primitives.
- If both are lint-compliant, prefer semantic state naming over visual naming.

## Fix Safety (Required)

- Do not remove existing functionality to satisfy this rule.
- Preserve the same user-facing behaviors when refactoring boolean props.
- If behavior parity cannot be maintained with composition or a variant prop, stop and request human approval before changing the API.
