# Disallow TitleCase JSX props (`no-title-case-props`)

JSX props should use camelCase, not TitleCase (PascalCase). This rule flags props that start with an uppercase letter.

## Why

CamelCase props match JSX and DOM conventions, which keeps component APIs predictable.
When prop casing varies, code review and grep/navigation become noisier and mistakes are easier to miss.

## Rule Details

Props like `SomeProp` or `HelloWorld` are disallowed. Use `someProp` or `helloWorld` instead.

## Options

This rule has no options.

## Examples

### Incorrect

```jsx
<Component SomeProp="value" />
<Button HelloWorld={handler} />
```

### Correct

```jsx
<Component someProp="value" />
<Button helloWorld={handler} />
```

## How To Fix

1. Rename each TitleCase prop to camelCase.
2. Update all call sites to the same camelCase prop.
3. Keep native HTML attributes unchanged (`aria-*`, `data-*`).

```jsx
// before
<Button HelloWorld={handler} />

// after
<Button helloWorld={handler} />
```
