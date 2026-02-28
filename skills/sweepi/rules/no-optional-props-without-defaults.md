# Disallow optional props without defaults (`no-optional-props-without-defaults`)

Disallow optional component props unless they are defaulted at the component boundary.

## Why

Optional props are often used to represent "data not ready yet", which spreads nullability and weakens component contracts. Configurable props are fine when they have explicit defaults at the component entry point.

## Rule Details

- **Target**: PascalCase function components and arrow-function components.
- **Reported**: Optional props in the component prop type that are not defaulted in the component parameter.
- **Allowed**: Optional props with explicit defaults in destructured parameters.
- **Ignored**: Optional props matched by `ignore` glob patterns.

### Type Information

This rule works without TypeScript project services by checking explicit local type declarations.

Only authored optional props are checked (type literals and local `interface`/`type` members).
Inherited props from `extends` chains are ignored.

## Options

| Option   | Type       | Default | Description                                                                      |
| -------- | ---------- | ------- | -------------------------------------------------------------------------------- |
| `ignore` | `string[]` | `[]`    | Optional prop-name glob patterns to ignore (for example `on*`, `ref`, `render`). |

## Examples

### Incorrect

```tsx
interface ButtonProps {
  tone?: 'primary' | 'secondary';
}

function Button(props: ButtonProps) {
  return props.tone;
}
```

### Correct

```tsx
interface ButtonProps {
  tone?: 'primary' | 'secondary';
}

function Button({ tone = 'primary' }: ButtonProps) {
  return tone;
}
```

## How To Fix

1. Default optional configurable props in the component parameter.
2. Move time/readiness checks higher in the tree before rendering the component.
3. Keep component contracts strict and explicit.
4. AI agents: default missing optional props at the boundary or move readiness branching out of the component contract.
