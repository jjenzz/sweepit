# complexity

Enforce a maximum cyclomatic complexity allowed in a program.

This rule is based on ESLint's built-in `complexity` rule with one project-specific behavior:

- functions with PascalCase names are ignored

That allows larger inline React view components while still enforcing complexity limits for utility functions and hooks.

## Rule Details

This rule reports when function complexity exceeds the configured threshold.

It supports the same options as ESLint's `complexity` rule:

- `max` / `maximum`: numeric threshold
- `variant`: `'classic'` or `'modified'`

## Examples

With configuration:

```json
{
  "rules": {
    "sweepit/complexity": ["error", { "max": 5, "variant": "modified" }]
  }
}
```

Examples of **incorrect** code:

```ts
function computeValue(input: number) {
  if (input > 0) {
  }
  if (input > 1) {
  }
  if (input > 2) {
  }
  if (input > 3) {
  }
  if (input > 4) {
  }
  if (input > 5) {
  }
}
```

Examples of **correct** code:

```tsx
function DashboardView() {
  if (true) {
  }
  if (true) {
  }
  if (true) {
  }
  if (true) {
  }
  if (true) {
  }
  if (true) {
  }
  return <div />;
}
```

## Attribution

This rule is adapted from ESLint's `complexity` rule:

- Source: <https://github.com/eslint/eslint/blob/main/lib/rules/complexity.js>
- License: MIT (see repository `LICENSE` for third-party attribution)
