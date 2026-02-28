# Prefer extracted call results (`no-inline-call-expressions`)

Prefer extracting function-call results into named variables instead of placing calls directly in loop headers or nested as function arguments.

## Why

Inline call chains in control-flow and arguments make execution flow harder to scan.
Extracting values first improves readability, naming clarity, and debugging.

## Rule Details

This rule can enforce two contexts:

- `for-header`: disallow call expressions in `for (...)` headers and in `for...of`/`for...in` right-hand expressions.
- `call-arg`: disallow passing call expressions as arguments to other calls.

By default, both contexts are enabled.

### Iterator factory allowance

When `allowIteratorFactories` is `true` (default), top-level calls in `for...of` right-hand expressions are allowed when the TypeScript type checker resolves the call result to an iterable type (has `[Symbol.iterator]`).

This is type-based behavior, not a hard-coded callee-name allowlist.
If type information is unavailable, the rule falls back to allowing top-level `for...of` calls when this option is enabled.

## Options

```json
{
  "rules": {
    "sweepit/no-inline-call-expressions": [
      "error",
      {
        "contexts": ["for-header", "call-arg"],
        "allowIteratorFactories": true
      }
    ]
  }
}
```

### `contexts`

Allowed values:

- `for-header`
- `call-arg`

Default:

```json
["for-header", "call-arg"]
```

### `allowIteratorFactories`

- Type: `boolean`
- Default: `true`

Controls whether supported iterator factory calls are allowed for top-level `for...of` sources.
Controls whether type-checked iterable-producing calls are allowed for top-level `for...of` sources.

## Examples

### Incorrect

```ts
for (let i = 0; i < getLimit(); i += 1) {
  // ...
}

for (const report of getReports()) {
  // ...
}

consume(formatValue(input));
consume(buildValue(loadValue()));
```

### Correct

```ts
const limit = getLimit();
for (let i = 0; i < limit; i += 1) {
  // ...
}

const reports = getReports();
for (const report of reports) {
  // ...
}

const formattedValue = formatValue(input);
consume(formattedValue);

const loadedValue = loadValue();
const builtValue = buildValue(loadedValue);
consume(builtValue);
```

With `allowIteratorFactories: true`:

```ts
for (const [key, value] of Object.entries(record)) {
  // ...
}
```

## How To Fix

1. Compute values before the loop or call site.
2. Name intermediate values according to intent.
3. Keep iteration and invocation sites focused on behavior, not computation.
