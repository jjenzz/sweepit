# Disallow use\* functions that return JSX (`no-hook-jsx`)

Functions named `use*` are hooks and should return data or callbacks, not JSX. Components that render JSX should use PascalCase and not the `use` prefix.

## Why

Hooks are behavioral units; components are rendering units.
Mixing both responsibilities in one API makes ownership and flow harder to follow, especially as code grows.

## Rule Details

- **Forbidden**: Functions named `use*` that return JSX in any structure—direct returns, or JSX nested inside objects, arrays, conditionals, logicals, or inline arrow functions (e.g. `return <div />`, `return { List: <ul></ul> }`, `return cond ? <div /> : null`, `return () => <div />`).
- **Allowed**: Functions named `use*` that return non-JSX values (primitives, objects, arrays, etc.).

## Options

This rule has no options.

## Examples

### Incorrect

```ts
function useHeader() {
  return <header>Title</header>;
}

const useLayout = () => <div className="layout" />;

function useCard() {
  return (
    <div>
      <span>Card</span>
    </div>
  );
}

function useList() {
  return { List: <ul></ul> };
}

const useItems = () => ({ Item: <li /> });

function useArray() {
  return [<div key="a" />, <span key="b" />];
}

const useCond = (x: boolean) => (x ? <div /> : null);

function useLogical() {
  return cond && <span />;
}

const useInline = () => () => <div />;
```

### Correct

```ts
function Header() {
  return <header>Title</header>;
}

const useUser = () => {
  const [user, setUser] = useState(null);
  return user;
};

function useToggle(initial: boolean) {
  const [on, setOn] = useState(initial);
  return [on, () => setOn((v) => !v)] as const;
}

function useData() {
  return { items: [], count: 0 };
}

function useItems() {
  return [1, 2, 3];
}
```

## How To Fix

1. Move JSX rendering into a PascalCase component.
2. Keep the hook focused on data/state/callbacks.
3. Return values from the hook that the component can render.

```ts
// before
function useHeader() {
  return <header>Title</header>;
}

// after
function useHeaderData() {
  return { title: "Title" };
}

function Header() {
  const data = useHeaderData();
  return <header>{data.title}</header>;
}
```
