# Disallow ComponentType/FC/FunctionComponent in props (`no-componenttype-props`)

Disallow prop types `ComponentType`, `React.ComponentType`, `FC`, or `FunctionComponent` in component prop definitions.

## Why

Component-type props often introduce indirection that hides render ownership.
Favoring composition (`children`, `asChild`, render props) keeps APIs flatter and easier to reason about.

## Rule Details

- **Target**: `TSInterfaceDeclaration` and `TSTypeAliasDeclaration` with object-like type bodies.
- **Forbidden**: Props typed as `ComponentType<T>`, `React.ComponentType<T>`, `FC<T>`, or `FunctionComponent<T>`.
- **Recommendation**: Use `asChild` (Radix-style) or a render prop for polymorphism instead.

Passing component types as props often leads to unnecessary indirection and makes the component API harder to use. The `asChild` pattern or a render prop provides clearer polymorphism.

## Options

This rule has no options.

## Examples

### Incorrect

```tsx
interface LayoutProps {
  wrapper: React.ComponentType<{ children: ReactNode }>;
}

type CardProps = {
  Icon: ComponentType<IconProps>;
};

interface ListProps {
  ItemComponent: FC<ListItemProps>;
}
```

### Correct

```tsx
// asChild pattern
interface LayoutProps {
  asChild?: boolean;
}

// Render prop
interface LayoutProps {
  render?: (props: Props) => ReactNode | React.ReactElement;
}

// Or pass children and let the consumer compose
interface CardProps {
  children?: ReactNode;
}
```

## How To Fix

1. Remove `ComponentType`/`FC`/`FunctionComponent` prop contracts.
2. Replace with composition (`children`, `asChild`) or render callbacks.
3. Update consumers to pass elements/composition instead of component constructors.

```tsx
// before
interface ListProps {
  ItemComponent: FC<ListItemProps>;
}

// after
interface ListProps {
  render?: React.ReactElement | ((props: ListItemProps) => React.ReactNode);
}
```

## When Not To Use It

Disable this rule if your codebase intentionally uses component-type props for dynamic component rendering (e.g. icon components, list item renderers) and the team accepts that pattern.
