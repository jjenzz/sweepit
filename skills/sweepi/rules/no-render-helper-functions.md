# Forbid JSX from non-component functions (`no-render-helper-functions`)

Functions that return JSX should be named with PascalCase (component convention). This rule forbids JSX returned from functions whose names are not PascalCase.

## Why

PascalCase JSX-returning functions are recognizable as components at a glance.
Keeping render paths component-shaped improves readability and avoids hidden render helpers.

## Rule Details

- **Target**: `FunctionDeclaration` and variable-assigned functions/arrows (e.g. `const foo = () => ...`).
- **Forbidden**: Functions that return JSX and whose name is not PascalCase (e.g. `renderHeader`, `getLayout`, `formatLabel`).
- **Allowed**: Functions with PascalCase names that return JSX (e.g. `Header`, `Layout`, `FormatLabel`).

JSX return detection uses heuristics:

- Arrow expression body: `() => <div />` or `() => (<div />)`.
- Return statements: `return <div />` or `return cond ? <A /> : <B />`.

## Options

This rule has no options.

## Examples

### Incorrect

```tsx
function renderHeader() {
  return <header>Title</header>;
}

const getLayout = () => <div className="layout" />;

function formatLabel() {
  return (
    <span>
      <strong>Label</strong>
    </span>
  );
}

const makeCard = () => (
  <>
    <div />
  </>
);
```

### Correct

```tsx
function Header() {
  return <header>Title</header>;
}

const Layout = () => <div className="layout" />;

function FormatLabel() {
  return (
    <span>
      <strong>Label</strong>
    </span>
  );
}

const Card = () => (
  <>
    <div />
  </>
);
```

## How To Fix

1. If JSX is returned, rename the function to PascalCase and treat it as a component.
2. If it is a helper utility, stop returning JSX and return data instead.
3. Move rendering to a component boundary.

```tsx
// before
function renderHeader() {
  return <header>Title</header>;
}

// after
function Header() {
  return <header>Title</header>;
}
```
