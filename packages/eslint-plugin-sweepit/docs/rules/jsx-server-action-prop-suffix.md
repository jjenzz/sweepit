# Enforce action prop suffix for async handlers (`jsx-server-action-prop-suffix`)

Enforce that props expecting async functions are named `action` or end with `Action`.

## Why

Async action-like callbacks have different behavior and lifecycle expectations than synchronous UI handlers.
Making async callback props explicit keeps component APIs clearer and prevents accidental async contracts on event-style props like `onSubmit`.

## Rule Details

- **Target**: TypeScript prop definitions (`interface` and `type` object shapes).
- **Behavior**:
  1. If a prop's function type returns `Promise<...>`, that prop name must be exactly `action` or end with `Action`.
  2. Async function types on other prop names (e.g. `onSubmit`, `submit`, `onSave`) are reported.
  3. Synchronous function types are unaffected.

The rule inspects function return types in prop signatures, including unions/intersections (for example `(() => Promise<void>) | undefined`).

## Options

This rule has no options.

## Examples

### Incorrect

```ts
interface FormProps {
  onSubmit: () => Promise<void>;
  submit: (data: FormData) => Promise<Response>;
}

type UploadProps = {
  onUpload?: (() => Promise<Response>) | null;
};
```

### Correct

```ts
interface FormProps {
  action: (data: FormData) => Promise<void>;
  submitAction?: (data: FormData) => Promise<Response>;
  onSubmit: (event: SubmitEvent) => void;
}

type UploadProps = {
  uploadAction?: (() => Promise<Response>) | undefined;
  onUpload?: (file: File) => void;
};
```

## How To Fix

1. Identify props whose function type returns `Promise<...>`.
2. Rename those props to `action` or `*Action`.
3. Keep synchronous handler props (`on*`) as `void`-returning callbacks.

```ts
// before
interface FormProps {
  onSubmit: () => Promise<void>;
}

// after
interface FormProps {
  submitAction: () => Promise<void>;
}
```

## When Not To Use It

Disable this rule if:

- Your codebase intentionally allows async function contracts on non-`action` props.
- You use a different naming scheme for action-like async callback props.
