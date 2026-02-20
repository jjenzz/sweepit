# Encourage flat JSX owner trees (`jsx-flat-owner-tree`)

Keep owner components shallow. Flag component trees that nest custom components three or more levels deep without `children` composition.

## Why

Deep owner trees make control flow harder to track. Flatter trees keep boundaries explicit and reduce indirection.

## Rule Details

- **Target**: PascalCase React component functions.
- **Reported**: Returned JSX with custom-component nesting depth greater than two when the component does not accept `children`.
- **Allowed**:
  - Shallow owner trees.
  - Deep composition when the component explicitly accepts `children`.

## Options

This rule has no options.

## Examples

### Incorrect

```tsx
function Page() {
  return (
    <AppShell>
      <Dialog>
        <DialogContent>
          <DialogHeader />
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
```

### Correct

```tsx
function Page() {
  return (
    <AppShell>
      <Dialog />
    </AppShell>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>{children}</DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
```

## How To Fix

1. Flatten owner-level nesting where possible.
2. Extract composition boundaries that accept `children`.
3. Keep top-level pages/components declarative and easy to scan.

```tsx
// before
<AppShell><Dialog><DialogContent><DialogHeader /></DialogContent></Dialog></AppShell>

// after
<AppShell><Dialog /></AppShell>
```

## When Not To Use It

Disable this rule if your architecture intentionally relies on deep owner trees and you accept the resulting complexity.
