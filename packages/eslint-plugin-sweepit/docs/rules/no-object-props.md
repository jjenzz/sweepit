# Disallow object props in `*Props` type definitions (`no-object-props`)

Object props often couple components to data models and business-layer shapes.

## Why

- Passing object props encourages broad, tightly coupled component contracts.
- Teams often pass whole row/domain objects when components only need a few fields.
- This couples low-level UI components to domain model shapes (for example database row fields), which reduces reusability.
- When business data changes, leaf UI component APIs churn too, even when the visual concern is small.
- Composition with primitive props keeps APIs explicit and reusable.

## Rule Details

- **Target**: TypeScript type definitions whose name ends with `Props`.
- **Reported**: property members typed as objects.
- **Allowed**:
  - Primitive member types.
  - Function member types.
  - `style` object members (for style contracts).
  - Object members matching configured `ignore` patterns.
  - Type definitions not ending in `Props`.

### Type Information

This rule is AST-first and works without TypeScript project services.

When type information is enabled, detection is more accurate for alias-based members (for example `user: UserRow` where `UserRow` is an object type).

## Options

```json
{
  "ignore": ["ref", "on*"]
}
```

- `ignore` (`string[]`, optional): glob patterns of prop names to skip.

## Examples

### Incorrect

```ts
interface UserCardProps {
  user: { id: string; email: string };
}

type CardProps = {
  config: { dense: boolean };
};
```

### Correct

```ts
interface CardProps {
  tone: 'info' | 'warning';
  elevation: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ignored via config
interface InputProps {
  ref: { current: HTMLInputElement | null };
}

// not props
interface UserOptions {
  user: { id: string; email: string };
}
```

## How To Fix

1. Replace object-typed members with explicit primitive members for only what the component needs.
2. Move structure into component composition (compound parts + children) instead of data bundles.
3. If object state must be shared across composed parts, keep it in private component context instead of prop contracts.
4. Keep object-shaped data at ownership boundaries, not leaf component APIs.

```ts
// before
interface UserRowProps {
  user: User;
}

// after
interface UserRowProps {
  name: string;
  email: string;
}
```

If object-shaped data truly must flow to multiple compound parts, prefer context scoped to the compound component:

```ts
interface UserCardRootProps {
  id: string;
}
```
