# Disallow handler prop contracts with non-void return types (`no-handler-return-type`)

Handler prop **definitions** (names starting with `on`) should not expect return values. This rule requires handler prop contracts to return `void` only.

## Why

This rule enforces an API shape that is easier to reason about: **data down, actions up**.

- Parents pass state and derived data down as props.
- Children notify intent upward through handlers.
- Parents decide what state changes happen next.

When handler props return values, child-to-parent control flow becomes implicit (`if (onClose()) ...`), which increases coupling and makes component behavior harder to follow. A `void`-only handler contract keeps directionality explicit and aligns with React's one-way data flow guidance.

## Rule Details

- **Target**: `*Props` contracts only. Within those contracts, checks definitions with names starting with `on` (for example `onClose`, `onSubmit`).
- **Reported**: Function-type prop contracts that return anything other than `void` (including `Promise<void>`).
- **Allowed**:
  - `on*` props returning `void`.
  - Non-handler prop names (not starting with `on`).

## Options

This rule has no options.

## Examples

### Incorrect

```tsx
interface ComponentProps {
  onClose: () => boolean;
  onSubmit?: () => Promise<void>;
}

type DialogProps = {
  onOpen?(): string;
};
```

### Correct

```tsx
interface ComponentProps {
  onClose: () => void;
}

type DialogProps = {
  onOpen?: (() => void) | undefined;
};
```

## How To Fix

1. Change `on*` prop return types to `void`.
2. Lift state into the parent and expose a controlled component API (for example `value` + `onValueChange`) so flow stays data-down/actions-up.
3. Use separate callbacks for follow-up events when needed.

```ts
// before
interface DialogProps {
  onClose: () => boolean;
}

// after
interface DialogProps {
  onClose: () => void;
}
```
