# Disallow use\* functions that do not call any React hook (`no-useless-hook`)

Functions named `use*` should follow the React hooks convention: they must call at least one of `useState`, `useEffect`, `useReducer`, `useRef`, or `useContext`. Otherwise, the `use` prefix is misleading and should be removed.

## Why

Hook names communicate behavior and constraints to readers and tooling.
If `use*` functions are not real hooks, the API becomes misleading and harder to reason about.

## Rule Details

- **Forbidden**: Functions named `use*` (e.g. `useUser`, `useData`) that do not call any of: `useState`, `useEffect`, `useReducer`, `useRef`, `useContext`.
- **Allowed**: Functions named `use*` that call at least one of the above hooks.

## Options

This rule has no options.

## Examples

### Incorrect

```ts
function useUser() {
  return fetchUser();
}

const useFormatDate = (d: Date) => d.toISOString();

function useConfig() {
  return { theme: 'dark' };
}
```

### Correct

```ts
function useUser() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetchUser().then(setUser);
  }, []);
  return user;
}

const formatDate = (d: Date) => d.toISOString();

function useConfig() {
  const config = useContext(ConfigContext);
  return config;
}
```

## How To Fix

1. If the function is not a hook, rename it to remove the `use` prefix.
2. If it should be a hook, add real hook usage (`useState`, `useEffect`, `useReducer`, `useRef`, `useContext`).
3. Keep naming aligned with behavior.

```ts
// before
function useConfig() {
  return { theme: 'dark' };
}

// after (non-hook utility)
function getConfig() {
  return { theme: 'dark' };
}
```

## When Not To Use It

Disable this rule if your codebase uses the `use*` prefix for non-hook utilities and the team accepts that convention.
