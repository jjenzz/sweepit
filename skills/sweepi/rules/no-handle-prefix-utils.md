# Forbid util/helper functions prefixed with handle\* (`no-handle-prefix-utils`)

Reserve the `handle*` prefix for functions used in JSX `on*` props. Utility and helper functions should not use this prefix.

## Why

`handle*` strongly implies React event-handler semantics.
Using it for general utilities adds cognitive overhead and makes handler wiring harder to scan.

## Rule Details

- **Forbidden**: Function declarations and function-valued variables where the identifier starts with `handle` and is not used in an `on*` JSX prop expression.
- **Allowed**: `handle*` functions referenced from `on*` JSX props, including inline wrappers like `onClick={(event) => handleClick(event)}`.

## Options

This rule has no options.

## Examples

### Incorrect

```ts
function handleFormatDate(date: Date) {
  return date.toISOString();
}

const handlePrefix = (value: string) => value.trim();

const handleClick = () => {};
<button foo={handleClick} />;
```

### Correct

```tsx
const formatDate = (date: Date) => date.toISOString();

const handleClick = () => {};
<button onClick={handleClick} />;

const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {};
<form onSubmit={(event) => handleSubmit(event)} />;
```

## How To Fix

1. Rename non-handler helpers to names that do not start with `handle`.
2. Keep `handle*` for functions actually wired through JSX `on*` props.
3. If a function is a real handler, pass it through an `on*` prop (directly or via inline wrapper).

```ts
// before
const handlePrefix = (value: string) => value.trim();

// after
const normalizePrefix = (value: string) => value.trim();
```
