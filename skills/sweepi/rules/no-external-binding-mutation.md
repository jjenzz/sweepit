# no-external-binding-mutation

Disallow mutating bindings that are external to the current function.

## Why

Mutating outer bindings (or function parameters) introduces hidden coupling and undermines referential purity.

## Rule Details

This rule reports mutations inside a function when the target identifier resolves to:

- an outer scope binding, or
- a parameter binding.

Reported operations:

- direct assignment (`value = ...`)
- update operations (`value++`, `value += ...`)
- method calls where the identifier is the receiver (`value.set(...)`, `value.clear()`)

Receiver call requirement:

- calls on external or parameter bindings are only allowed when the receiver is readonly-typed (for example `ReadonlyArray<T>`, `ReadonlyMap<K, V>`, `ReadonlySet<T>`, or `readonly` tuples).

## Examples

### Incorrect

```ts
const counter = { value: 0 };
function bump() {
  counter.increment();
}

function normalize(input: string) {
  input = input.trim();
}
```

### Correct

```ts
function bump() {
  let count = 0;
  count = count + 1;
}

function inspect(cache: ReadonlyMap<string, number>) {
  cache.get('count');
  cache.has('count');
}
```

## How To Fix

1. Mutate only bindings declared inside the current function.
2. Type external receivers and parameters as readonly before calling methods.
3. Return new values instead of mutating outer bindings.
