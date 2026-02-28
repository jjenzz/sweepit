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

### Allowed call patterns

Top-level `for...of` source calls can be allowed via glob-like callee patterns.

Default allow patterns:

- `*.entries`
- `*.values`
- `*.keys`

Pattern matching applies to the call's callee path (for example, `Object.entries`, `map.values`, `set.keys`).

## Options

```json
{
  "rules": {
    "sweepit/no-inline-call-expressions": [
      "error",
      {
        "contexts": ["for-header", "call-arg"],
        "allowCallPatterns": ["*.entries", "*.values", "*.keys"]
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

### `allowCallPatterns`

- Type: `string[]`
- Default: `["*.entries", "*.values", "*.keys"]`

Controls which top-level `for...of` source calls are exempt from `for-header` reporting.

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

With default `allowCallPatterns`:

```ts
for (const [key, value] of Object.entries(record)) {
  // ...
}
```

## How To Fix

1. Compute values before the loop or call site.
2. Name intermediate values according to intent.
3. Keep iteration and invocation sites focused on behavior, not computation.
