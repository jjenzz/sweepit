# Disallow prefixed prop bundles in prop contracts (`no-prefixed-prop-bundles`)

Repeated domain-style prop prefixes (for example `userName`, `userEmail`, `userRole`) often signal over-grouped component contracts.

## Why

- This rule is a composition-pressure signal, not a naming-style preference.
- Prefix bundles hide the real component API behind domain names.
- They usually indicate the component should expose a simpler contract or compound parts.
- They couple low-level UI components to domain model shapes (for example database row fields), which reduces reusability.
- When business data changes, leaf UI component APIs churn too, even when the visual concern is small.

## Rule Details

- **Target**: TypeScript component prop contracts named `*Props` (`interface` and object `type` declarations).
- **Reported**: Sets of prop fields that share the same prefix and meet the configured threshold.
  - Example prefix extraction: `userName`, `userEmail`, `userRole` -> `user*`.
- **Ignored prefixes**: `on*`, `aria*`, `data*`, `is*`, `has*`, `can*`, `should*`.

## Options

```json
{
  "threshold": 3
}
```

- `threshold` (integer, minimum `2`, default `3`): number of same-prefix props required before reporting.

## Examples

### Incorrect

```tsx
interface CardProps {
  userName: string;
  userEmail: string;
  userRole: string;
}
```

### Correct

```tsx
<Card.Root>
  <Card.Avatar name={user.name} emphasise={user.role === 'ADMIN'} />
  <Card.Content>{user.email}</Card.Content>
</Card.Root>
```

## How To Fix

1. Prefer compound composition and colocate structure in component parts.
2. If a simple API is still appropriate, pass explicit unprefixed props for what the component actually needs.
3. If grouped data must be shared across parts, keep it in private context within the compound root.
4. AI agents: split bundled prefixes into compound parts before introducing object/array prop bundles.
