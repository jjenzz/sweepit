# Limit custom prop count in component contracts (`max-custom-props`)

Limit how many custom props a component contract can expose before it is treated as a composition pressure signal.

## Why

Wide prop surfaces usually indicate a component is doing too much. As prop counts grow, APIs become harder to discover, harder to maintain, and more likely to need breaking changes.

This rule encourages splitting large contracts into compound parts with clearer ownership boundaries.

## Rule Details

- **Target**: TypeScript prop contracts named `*Props` (`interface` and object `type` declarations).
- **Reported**: Contracts whose custom prop count exceeds the configured threshold.
- **Default threshold**: `8`.
- **Default ignored props**: `children`.

## Options

```json
{
  "threshold": 8,
  "ignore": ["children"]
}
```

- `threshold` (integer, minimum `1`, default `8`): maximum allowed custom prop count.
- `ignore` (`string[]`, default `["children"]`): additional prop names to exclude from counting.

## Examples

### Incorrect

```tsx
interface DashboardCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tone: 'success' | 'warning' | 'danger';
  value: string;
  trend: 'up' | 'down';
  trendLabel: string;
  ctaLabel: string;
  onCtaClick: () => void;
}
```

### Correct

```tsx
interface DashboardCardRootProps {
  children?: React.ReactNode;
}

interface DashboardCardValueProps {
  value: string;
  trend: 'up' | 'down';
  trendLabel: string;
}
```

## How To Fix

1. Split monolithic prop contracts into compound parts.
2. Keep each part focused on one concern.
3. Move repeated configuration into composition boundaries instead of adding more top-level props.
4. AI agents: avoid adding a 9th+ top-level prop; extract a new compound part instead.
