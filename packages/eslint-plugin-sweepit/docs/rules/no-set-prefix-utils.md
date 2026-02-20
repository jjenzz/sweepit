# Forbid util/helper functions prefixed with set\* (`no-set-prefix-utils`)

Reserve the `set*` prefix for React state setter identifiers from `useState` tuple destructuring. Util and helper functions should not use this prefix.

## Why

`set*` has a strong React meaning: state setter from `useState`.
Reusing that prefix for unrelated helpers increases cognitive load and makes stateful code harder to scan.

## Rule Details

- **Forbidden**: Function declarations and variable assignments where the identifier starts with `set` and is a util/helper function (e.g. `function setUserActive() {}`, `const setPrefix = () => {}`).
- **Allowed**: The second identifier in `useState` tuple destructuring (e.g. `const [count, setCount] = useState(0)`).

## Options

This rule has no options.

## Examples

### Incorrect

```ts
function setUserActive(user: User) {
  user.active = true;
}

const setPrefix = (str: string) => str.toUpperCase();

const setFormData = function (data: FormData) {
  // ...
};
```

### Correct

```ts
const [count, setCount] = useState(0);
const [user, setUser] = useState<User | null>(null);

function updateUserActive(user: User) {
  user.active = true;
}

const applyPrefix = (str: string) => str.toUpperCase();
```

## How To Fix

1. Rename non-state utility functions so they do not start with `set`.
2. Reserve `set*` only for `useState` setters.
3. Update all references to the new utility name.

```ts
// before
const setPrefix = (str: string) => str.toUpperCase();

// after
const applyPrefix = (str: string) => str.toUpperCase();
```

## When Not To Use It

Disable this rule if your codebase intentionally uses `set*` for non-React util/helper functions and the team accepts that naming convention.
