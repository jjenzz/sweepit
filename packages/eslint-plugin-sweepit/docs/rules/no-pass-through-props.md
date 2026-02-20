# Disallow pass-through-only props (`no-pass-through-props`)

Do not accept props in owner components if they are only forwarded unchanged to child props.

## Why

Pass-through-only props hide ownership boundaries. They make parent components look responsible for values they never own or transform.

## Rule Details

- **Target**: PascalCase React component functions with destructured props.
- **Reported**: Props that are only used as direct JSX prop forwards.
- **Allowed**:
  - Props that are transformed, derived, or used in local logic.
  - `children` composition.

## Options

This rule has no options.

## Examples

### Incorrect

```tsx
function Card({ title }: { title: string }) {
  return <Heading title={title} />;
}
```

### Correct

```tsx
function Card({ title }: { title: string }) {
  const headingText = title.toUpperCase();
  return <Heading title={headingText} />;
}

function Dialog({ children }: { children: React.ReactNode }) {
  return <DialogRoot>{children}</DialogRoot>;
}
```

## How To Fix

1. Keep value ownership local where possible.
2. Derive values before passing them down.
3. Prefer `children` for composition boundaries instead of pass-through prop relays.

```tsx
// before
function Card({ title }: { title: string }) {
  return <Heading title={title} />;
}

// after
function Card({ title }: { title: string }) {
  const headingText = title.toUpperCase();
  return <Heading title={headingText} />;
}
```

## When Not To Use It

Disable this rule if your architecture intentionally uses prop relay wrappers as a primary API pattern.
