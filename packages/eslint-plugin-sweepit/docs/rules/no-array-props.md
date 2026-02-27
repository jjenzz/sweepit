# Disallow array props in `*Props` type definitions (`no-array-props`)

Array props often hide component requirements behind bundled list structures.

## Why

- Passing arrays as props encourages broad contracts instead of explicit inputs.
- Arrays frequently carry extra business data the component does not actually use.
- Composition and primitive props keep APIs narrow and maintainable.

## Rule Details

- **Target**: TypeScript type definitions whose name ends with `Props`.
- **Reported**: property members typed as arrays or tuples.
- **Allowed**:
  - Primitive member types.
  - Function member types.
  - Type definitions not ending in `Props`.

### Type Information

This rule is AST-first and works without TypeScript project services.

When type information is enabled, detection is more accurate for alias-based members (for example `items: Items` where `type Items = string[]`).

## Options

This rule has no options.

## Examples

### Incorrect

```ts
interface ListProps {
  items: string[];
}

type MenuProps = {
  entries: Array<string>;
};

type TagListProps = {
  tags: { label: string }[];
};
```

### Correct

```ts
interface ListProps {
  total: number;
  label: string;
}

// not props
interface MenuOptions {
  entries: string[];
}
```

## How To Fix

1. Replace array-typed members with explicit primitive members for actual component needs.
2. Prefer children/compound-part composition for repeated UI structures.
3. If list state must be shared across composed parts, keep it in private component context instead of prop contracts.
4. Keep array-shaped data at higher ownership boundaries, not component contracts.

### Composition Guardrail

- Using `children` is valid only when the component exposes meaningful compound parts.
- Do not replace array props with a bare `children` passthrough as the only API.
- Preserve prior capability: the previous repeated structure must still be expressible through named parts.
- If a refactor cannot preserve behavior with compound parts, stop and request approval before changing API semantics.

```ts
// before
interface TagListProps {
  tags: string[];
}

// after
interface TagListProps {
  variant: 'primary' | 'secondary';
  children: React.ReactNode;
}

interface TagListItemProps {
  disabled: boolean;
  children: React.ReactNode;
}
```

If array-shaped data truly must flow to multiple compound parts, prefer context scoped to the compound component.
