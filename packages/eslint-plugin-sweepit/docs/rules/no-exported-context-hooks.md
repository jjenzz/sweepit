# Disallow exported context hooks (`no-exported-context-hooks`)

Forbid exporting hooks named `use*Context`.

## Why

Context hooks are implementation details of a component boundary.
Keeping them private avoids leaking internal architecture and encourages explicit component APIs.

## Rule Details

- **Target**: ES module exports.
- **Reported**: Exported identifiers that match `use*Context`.
- **Allowed**:
  - Non-exported `use*Context` hooks.
  - Exported hooks that do not end with `Context`.

## Options

This rule has no options.

## Examples

### Incorrect

```ts
export function useDialogContext() {
  return useContext(DialogContext);
}

export const useThemeContext = () => useContext(ThemeContext);

const usePopoverContext = () => useContext(PopoverContext);
export { usePopoverContext };
```

### Correct

```ts
function useDialogContext() {
  return useContext(DialogContext);
}

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

## How To Fix

When this rule reports an exported `use*Context` hook, migrate to a controlled API so state is lifted and flow stays data-down/actions-up.

1. Keep `use*Context` private to the module.
2. Export component props/state contracts instead of the hook.
3. Expose mutations as events (`on*Change`) rather than returning internal stateful helpers.

Example migration:

```ts
// before
export function useDialogContext() {
  return useContext(DialogContext);
}

// after
function useDialogContext() {
  return useContext(DialogContext);
}

export interface DialogRootProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

## When Not To Use It

Disable this rule if your architecture intentionally exposes context hooks as part of the public module API.
