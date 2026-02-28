# Ensure handler props end with a verb (`jsx-on-handler-verb-suffix`)

Enforce that handler prop names starting with `on` end with a verb (e.g. `onValueChange`, `onDialogOpen`).

## Why

Verb suffixes make handler names read consistently and support control-capable callbacks with present or neutral verbs.

## Rule Details

- **Target**: JSX attributes whose names start with `on`.
- **Behavior**: Reports `on*` handler props that do not end in an allowed verb.
- **Suggestion behavior**: If the name looks like `on{Verb}{Subject}` (e.g. `onChangeValue`), the rule suggests `on{Subject}{Verb}` (e.g. `onValueChange`).
- **Built-in vocabulary**: Uses a curated internal verb dictionary for common UI naming. Use `extendVerbs` for project-specific verbs.

## Options

This rule accepts one optional object.

### extendVerbs

Type: `string[]`  
Default: `[]` (extends built-in defaults)

Additional verbs to allow for handler suffix validation.
Values are normalized case-insensitively and whitespace is removed.

The example below adds a domain-specific verb:

```json
{
  "rules": {
    "sweepit/jsx-on-handler-verb-suffix": [
      "error",
      {
        "extendVerbs": ["archived"]
      }
    ]
  }
}
```

## Examples

### Incorrect

```tsx
<Input onChangeValue={handleChange} />
<Button onClickButton={handleClick} />
<div onSomethingCustom={handler} />
<Input onValueThing={handleThing} />
```

### Correct

```tsx
<Input onValueChange={handleChange} />
<Button onButtonClick={handleClick} />
<button onClick={handleClick} />
<input onChange={handleChange} />
<FeatureFlag onFeatureDisable={handleDisable} />
```

With custom options:

```tsx
// eslint rule options:
// { extendVerbs: ['archived'] }
<Item onItemArchived={handleArchived} />
```

## How To Fix

1. Rename the prop so it ends in a known verb.
2. For `on{Verb}{Subject}`, reorder to `on{Subject}{Verb}` when appropriate.
3. Update both component definition and all call sites.
4. If a suffix is a legitimate domain verb, add it to `extendVerbs` instead of forcing an unnatural rename.

```tsx
// before
<Input onChangeValue={handleChange} />

// after
<Input onValueChange={handleChange} />
```
