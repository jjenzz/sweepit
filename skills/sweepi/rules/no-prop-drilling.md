# Disallow prop drilling (`no-prop-drilling`)

Do not accept props in owner components if they are only forwarded unchanged to child props.

## Why

Prop drilling hides ownership boundaries. It makes parent components look responsible for values they never own or transform.

## Rule Details

- **Target**: PascalCase React component functions with destructured props.
- **Reported**: Props that are only used as direct JSX prop forwards when chain depth exceeds `allowedDepth`.
- **Allowed**:
  - Props that are transformed, derived, or used in local logic.
  - `children` composition.

## Options

```ts
type NoPropDrillingOptions = {
  allowedDepth?: number; // default: 1
  ignorePropsSpread?: boolean; // default: true
};
```

- `allowedDepth`: Maximum allowed pass-through chain depth before reporting.
- Default `1` allows one explicit prop-drilling layer.
- Depth `2+` becomes a composition-pressure signal and is reported.
- `ignorePropsSpread`: Ignore `...props` pass-through analysis. This defaults to `true`.

## Examples

### Incorrect

```tsx
const Heading = ({ title }: { title: string }) => <h2>{title}</h2>;

const Title = ({ title }: { title: string }) => <Heading title={title} />;

const Card = ({ title }: { title: string }) => <Title title={title} />;
```

### Correct

```tsx
function Card({ title }: { title: string }) {
  const headingText = title.toUpperCase();
  return <Heading title={headingText} />;
}

const Input: React.FC<InputProps> = ({ type = 'text', ...props }) => (
  <input type={type} {...props} />
);

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
