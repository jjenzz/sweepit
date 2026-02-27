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
2. If boolean flags are only toggling variants, split them into explicit composed variants.
3. Keep state transitions explicit through events rather than hidden conditional branches.
4. AI agents: if a boolean has no valid control handler, add one or extract separate composed variants instead of adding more flags.
