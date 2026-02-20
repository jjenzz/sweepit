# Enforce compound part export naming (`jsx-compound-part-export-naming`)

Compound parts should be exported as alias names suitable for namespace imports (`export { DialogTrigger as Trigger }`).

## Why

Aliased part exports pair naturally with compound member usage (`<Dialog.Trigger />`) and avoid runtime object assembly patterns that hide API shape.

## Rule Details

- **Target**: ESM named exports.
- **Reported**:
  - Compound part exports without alias (`export { DialogTrigger }`).
  - Compound part exports aliased to the wrong name.
  - Runtime object exports for compound APIs (`export const Dialog = { Trigger: DialogTrigger }`).
- **Allowed**:
  - `export { DialogTrigger as Trigger }`.
  - Non-compound exports.

## Options

This rule has no options.

## Examples

### Incorrect

```ts
const DialogTrigger = () => null;
export { DialogTrigger };

const TooltipContent = () => null;
export { TooltipContent as TooltipContent };

const DialogTrigger = () => null;
export const Dialog = { Trigger: DialogTrigger };
```

### Correct

```ts
const DialogTrigger = () => null;
const TooltipContent = () => null;

export { DialogTrigger as Trigger, TooltipContent as Content };
```

## How To Fix

1. Export each compound part with its part alias (`Trigger`, `Content`, `Item`, and so on).
2. Avoid runtime object exports for compound APIs.
3. Keep the namespace shape in import usage, not in exported runtime objects.

```ts
// before
export { DialogTrigger };

// after
export { DialogTrigger as Trigger };
```

## When Not To Use It

Disable this rule if your architecture intentionally exports runtime objects for compound APIs instead of alias-based part exports.
