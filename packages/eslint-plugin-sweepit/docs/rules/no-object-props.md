# Disallow object props in JSX (`no-object-props`)

Object props often couple components to data models and business-layer shapes.

## Why

- Passing object props encourages broad, tightly coupled component contracts.
- Teams often pass whole row/domain objects when components only need a few fields.
- This couples low-level UI components to domain model shapes (for example database row fields), which reduces reusability.
- When business data changes, leaf UI component APIs churn too, even when the visual concern is small.
- Composition with primitive props keeps APIs explicit and reusable.

## Rule Details

- **Target**: JSX attributes with expression values.
- **Reported**:
  - Inline object literals (`{{ ... }}`).
  - Expressions whose TypeScript type resolves to an object (for example identifiers, member access, and function calls returning objects).
- **Allowed**:
  - Primitive values.
  - Function values (for event handlers, callbacks, etc.).
  - Non-object expressions.

## Options

This rule has no options.

## Examples

### Incorrect

```tsx
<Card style={{ color: 'red' }} />
<UserRow user={userRow} />
<Card config={getCardConfig()} />
```

### Correct

```tsx
<Card tone="info" elevation={2} />
<UserRow name={user.name} email={user.email} />
<Dialog onOpenChange={onOpenChange} />
```

## How To Fix

1. Replace object props with explicit primitive props for only what the component needs.
2. Move structure into component composition (compound parts + children) instead of data bundles.
3. If object state must be shared across composed parts, keep it in private component context instead of prop contracts.
4. Keep object-shaped data at ownership boundaries, not leaf component APIs.

```tsx
// before
<UserRow user={user} />;

// after
<UserRow name={user.name} email={user.email} />;
```

If object-shaped data truly must flow to multiple compound parts, prefer context scoped to the compound component:

```tsx
<UserCard.Root id={user.id}>
  <UserCard.Header />
  <UserCard.Body />
</UserCard.Root>
```

## When Not To Use It

Disable this rule if your architecture intentionally uses object-shaped prop contracts.
