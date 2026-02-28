# Disallow element-typed props except children/render (`no-element-props`)

In TypeScript interfaces and types for component props, disallow `ReactNode`/`ReactElement`-typed props except `children` and `render`.

## Why

Arbitrary element props can turn components into passthrough containers with unclear boundaries.
Restricting to `children`/`render` preserves explicit composition points and reduces API sprawl.

## Rule Details

- **Target**: `TSInterfaceDeclaration` and `TSTypeAliasDeclaration` with object-like type bodies.
- **ReactNode**: Props that resolve to React's `ReactNode` type are forbidden unless the prop name is `children`.
- **ReactElement**: Props that resolve to React's `ReactElement` type are treated the same way and are only allowed on `children` or `render`.

Custom element-typed props encourage passing arbitrary JSX through props, which can make components harder to reason about. Prefer `children`, and use `render` when polymorphic render-slot style APIs are intentional.

## Options

This rule has no options.

## Examples

### Incorrect

```tsx
interface CardProps {
  header: React.ReactNode; // ReactNode only allowed for children
  footer?: ReactNode;
  slot: ReactNode; // not allowed
}

type ModalProps = {
  title: ReactNode;
  content: React.ReactNode;
  header: ReactElement; // not allowed
};
```

### Correct

```tsx
interface CardProps {
  children: ReactNode;
  render?: ReactNode;
}

interface ModalProps {
  children?: ReactElement;
  render?: ReactElement;
}
```

## How To Fix

1. Replace non-`children`/`render` element-typed props with explicit composition APIs.
2. Keep `children` as the primary arbitrary-content slot.
3. Use `render` when polymorphic rendering behavior is intentional.
4. Move variant structures into compound component parts where needed.

```tsx
// before
interface CardProps {
  header: ReactNode;
}

// after
interface CardProps {
  children: ReactNode;
}
```
