# Disallow element-typed props except children/render (`no-element-props`)

In TypeScript interfaces and types for component props, disallow `ReactNode`-typed props except `children`, and disallow `ReactElement`-typed props except `render`.

## Why

Arbitrary element props can turn components into passthrough containers with unclear boundaries.
Restricting to `children` and `render` preserves explicit composition points and reduces API sprawl.

## Rule Details

- **Target**: `TSInterfaceDeclaration` and `TSTypeAliasDeclaration` with object-like type bodies.
- **ReactNode**: Props typed as `ReactNode` or `React.ReactNode` are forbidden unless the prop name is `children`.
- **ReactElement**: Props typed as `ReactElement` or `React.ReactElement` are forbidden unless the prop name is `render`.

Custom ReactNode props encourage passing arbitrary JSX through props, which can make components harder to reason about. Prefer `children` for composition. ReactElement props are typically used for render props; only the conventional `render` name is allowed.

## Options

This rule has no options.

## Examples

### Incorrect

```tsx
interface CardProps {
  header: React.ReactNode; // ReactNode only allowed for children
  footer?: ReactNode;
  render: ReactNode; // ReactNode not allowed for render (use ReactElement)
}

type ModalProps = {
  title: ReactNode;
  content: React.ReactNode;
  header: ReactElement; // ReactElement only allowed for render
  children: ReactElement; // ReactElement not allowed for children (use ReactNode)
};
```

### Correct

```tsx
interface CardProps {
  children: React.ReactNode;
}

interface CardProps {
  render?: React.ReactElement;
}

interface CardProps {
  children: ReactNode;
  render?: ReactElement;
}
```

## How To Fix

1. Replace non-`children` `ReactNode` props with explicit composition APIs.
2. Restrict `ReactElement` props to `render` only (or rename accordingly).
3. Keep `children` as the primary arbitrary-content slot.

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

## When Not To Use It

Disable this rule if your design system or component library intentionally uses multiple ReactNode-typed props (e.g. `header`, `footer`, `sidebar`) or ReactElement props with non-`render` names, and the team accepts that pattern.
