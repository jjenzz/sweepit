# Encourage flat parent component trees (`jsx-flat-owner-tree`)

Keep parent component chains shallow. Flag files where self-closing custom component handoffs exceed the allowed chain depth.

## Why

Deep parent chains make control flow harder to track and spread ownership across many tiny wrappers.

## Rule Details

- **Target**: PascalCase React component functions.
- **Reported**: Components in chains deeper than `allowedChainDepth` of self-closing custom components found anywhere in returned JSX (the component may contain any number of elements or markup).
- **Allowed**:
  - Shallow parent chains.
  - Component trees where no self-closing chain reaches depth 3.

## Options

This rule accepts one optional object.

### allowedChainDepth

Type: `integer`\
Minimum: `1`\
Default: `2`

Maximum allowed chain depth before reporting.

- `allowedChainDepth: 2` reports depth `3+`
- `allowedChainDepth: 4` reports depth `5+`

```json
{
  "rules": {
    "sweepit/jsx-flat-owner-tree": [
      "error",
      {
        "allowedChainDepth": 2
      }
    ]
  }
}
```

## Examples

### Incorrect

```tsx
function Root() {
  return <Page />;
}

function Page() {
  return (
    <div>
      <Header />
    </div>
  );
}

function Header() {
  return (
    <div>
      <UserArea />
    </div>
  );
}

function UserArea() {
  return (
    <div>
      <Avatar />
    </div>
  );
}
```

### Correct

```tsx
function Root() {
  return (
    <div>
      <Header.Root>
        <Header.UserArea />
      </Header.Root>
    </div>
  );
}

// header.tsx
function Header({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

function HeaderUserArea() {
  return (
    <div>
      <Avatar />
    </div>
  );
}

export { Header as Root, HeaderUserArea as UserArea };
```

## How To Fix

1. Collapse deep self-closing relay chains into a compound boundary.
2. Move internal steps into compound parts (`Header.UserArea`, etc).
3. Keep the parent component owning composition directly.

```tsx
// before
function Root() {
  return <Page />;
}
function Page() {
  return (
    <div>
      <Header />
    </div>
  );
}
function Header() {
  return (
    <div>
      <UserArea />
    </div>
  );
}

// after
function Root() {
  return (
    <div>
      <Header.Root>
        <Header.UserArea />
      </Header.Root>
    </div>
  );
}
```
