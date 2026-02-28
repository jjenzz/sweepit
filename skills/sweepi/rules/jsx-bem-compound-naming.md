# Enforce block-element compound naming (`jsx-bem-compound-naming`)

When a file appears to define a compound component family, enforce block-prefixed exported component names.

## Why

Block-element naming makes it easier to track which parts belong to which block when scanning the JSX tree.
Names like `ButtonGroupItem` and `ButtonGroupIcon` carry ownership context directly, while generic names like `Item` or `Icon` hide that relationship.

This improves readability in large trees, reduces ambiguity during refactors, and keeps compound APIs predictable.

## Rule Details

- **Target**: Exported local function components in modules with 2+ exported components.
- **Heuristic**:
  - If any exported component name matches the file stem (case-insensitive, separator-insensitive),
    that export is treated as the block.
  - Other exported components in that file must be prefixed with that block.
- **Reported**:
  - Exported component names that do not use the inferred block prefix.
- **Allowed**:
  - Files where no exported component matches the file stem.
  - `index.*` files (skipped).
  - Re-export-only files (`export { X } from ...`).
  - Non-component exports.

## Options

This rule has no options.

## Examples

### Incorrect

```tsx
// button-group.tsx
const ButtonGroup = () => null;
const Item = () => null;
const GroupItemIcon = () => null;

export { ButtonGroup, Item, GroupItemIcon };
```

### Correct

```tsx
// button-group.tsx
const ButtonGroup = () => null;
const ButtonGroupItem = () => null;
const ButtonGroupIcon = () => null;

export { ButtonGroup, ButtonGroupItem, ButtonGroupIcon };
```

## How To Fix

1. Ensure one exported component matches the file stem (for example `button-group.tsx` -> `ButtonGroup`).
2. Prefix other exported components with that block (`ButtonGroupItem`, `ButtonGroupItemIcon`, and so on).
3. Keep unrelated grouped exports in files whose stem does not imply a single compound block.

```tsx
// before
// button-group.tsx
export { ButtonGroup, Item, GroupItemIcon };

// after
// button-group.tsx
export { ButtonGroup, ButtonGroupItem, ButtonGroupItemIcon };
```
