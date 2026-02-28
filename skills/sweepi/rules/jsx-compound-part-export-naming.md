# Enforce compound export alias naming (`jsx-compound-part-export-naming`)

When a file looks like a compound component module, enforce root/part export aliases from the inferred block name.

## Why

Aliased root/part exports make compound APIs predictable and easy to scan at import sites (`* as Header`, `Header.Root`, `Header.UserArea`).

## Rule Details

- **Target**: ESM exports in files with 2+ exported local components.
- **Heuristic**:
  - Infer block from file stem matching an exported local component name.
  - Skip files where no exported component matches the stem.
  - Skip `index.*` and re-export-only files.
- **Reported**:
  - Part exports not aliased to their suffix (`ButtonGroupItem` must export as `Item`).
  - Missing root export when parts are exported (`export { ButtonGroup as Root }`).
  - Root exported without `Root` alias.
  - Runtime object export APIs for the inferred block (`export const ButtonGroup = { ... }`).
- **Allowed**:
  - `export { ButtonGroup as Root, ButtonGroupItem as Item }`.
  - Non-compound files and unrelated component groups where stem does not identify a block.

## Options

This rule has no options.

## Examples

### Incorrect

```ts
// button-group.tsx
const ButtonGroup = () => null;
const ButtonGroupItem = () => null;
export { ButtonGroupItem as Item }; // missing ButtonGroup as Root

const ButtonGroup = () => null;
const ButtonGroupItem = () => null;
export { ButtonGroup, ButtonGroupItem as Item }; // ButtonGroup must be aliased as Root

const ButtonGroupItem = () => null;
export const ButtonGroup = { Item: ButtonGroupItem };
```

### Correct

```ts
// button-group.tsx
const ButtonGroup = () => null;
const ButtonGroupItem = () => null;
export { ButtonGroup as Root, ButtonGroupItem as Item };

// button.tsx
const Button = () => null;
export { Button };
```

## How To Fix

1. Export the inferred block as `Root`.
2. Export each block-prefixed part with alias equal to the suffix after the block.
3. Avoid runtime object export APIs for the inferred block.

```ts
// before
export { ButtonGroup, ButtonGroupItem };

// after
export { ButtonGroup as Root, ButtonGroupItem as Item };
```
