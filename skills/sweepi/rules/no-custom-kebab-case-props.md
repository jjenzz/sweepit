# Disallow custom kebab-case JSX props (`no-custom-kebab-case-props`)

Custom kebab-case props are disallowed. Native HTML kebab attributes (`aria-*`, `data-*`) are allowed.

## Why

Custom kebab-case props blur the line between DOM attributes and component APIs.
Keeping custom props camelCase preserves a single naming system while still allowing standards-based `aria-*` and `data-*` attributes.

## Rule Details

Props containing hyphens (kebab-case) are disallowed unless they are native HTML attributes:

- `aria-*` (e.g. `aria-label`, `aria-hidden`)
- `data-*` (e.g. `data-testid`, `data-cy`)

## Options

This rule accepts one optional object.

### extendPrefixes

Type: `string[]`\
Default: `[]` (extends built-in defaults)

Additional kebab-case prefixes to allow. This list is merged with built-in allowed prefixes:

- `aria-`
- `data-`

### allowedProps

Type: `string[]`\
Default: `[]`

Exact kebab-case prop names to allow.

The example below allows the `x-` prefix and one exact prop:

```json
{
  "rules": {
    "sweepit/no-custom-kebab-case-props": [
      "error",
      {
        "extendPrefixes": ["x-"],
        "allowedProps": ["feature-flag-enabled"]
      }
    ]
  }
}
```

## Examples

### Incorrect

```jsx
<Component my-custom-prop="value" />
<Button some-other-prop={handler} />
```

### Correct

```jsx
<Component aria-label="Close" data-testid="modal" />
<div data-cy="submit-button" />
<Component myCustomProp="value" />
```

## How To Fix

1. Rename custom kebab-case props to camelCase.
2. Keep `aria-*` and `data-*` attributes as-is.
3. Update component prop definitions to use the camelCase name.

```jsx
// before
<Component my-custom-prop="value" />

// after
<Component myCustomProp="value" />
```
