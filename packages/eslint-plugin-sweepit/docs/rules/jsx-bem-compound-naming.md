# Prefer compound member JSX naming (`jsx-bem-compound-naming`)

Use compound component parts with member syntax (`<Dialog.Trigger />`) instead of flattened names (`<DialogTrigger />`).

## Why

Member syntax keeps compound APIs declarative and predictable. It also makes ownership boundaries explicit between a block and its parts.

## Rule Details

- **Target**: JSX opening element names.
- **Reported**: Flattened compound part names like `DialogTrigger`, `TooltipContent`, `PopoverTitle`.
- **Allowed**:
  - Member syntax (`Dialog.Trigger`, `Tooltip.Content`).
  - Non-compound component names.
  - Native elements.

## Options

This rule has no options.

## Examples

### Incorrect

```tsx
<DialogTrigger />
<TooltipContent />
```

### Correct

```tsx
<Dialog.Trigger />
<Tooltip.Content />
```

## How To Fix

1. Replace flattened component part names with member syntax.
2. Keep the compound block as the namespace (`Dialog`, `Tooltip`, and so on).

```tsx
// before
<DialogTrigger />

// after
<Dialog.Trigger />
```

## When Not To Use It

Disable this rule if your project intentionally uses flattened compound part component names as public API.
