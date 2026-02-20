# Prefer noun before verb in handler props (`jsx-on-noun-verb-handler-props`)

Enforce that handler prop names starting with `on` use the pattern `on{Noun}{Verb}` (e.g. `onValueChange`) instead of `on{Verb}{Noun}` (e.g. `onChangeValue`).

## Why

`on{Noun}{Verb}` scales better in larger component APIs because related handlers group naturally (`onValueChange`, `onValueFocus`, `onValueBlur`).
This makes discovery and autocomplete easier than mixed verb-first naming.

## Rule Details

- **Target**: JSX attributes whose names start with `on`.
- **Behavior**: Detects `on{Verb}{Noun}` patterns and suggests renaming to `on{Noun}{Verb}`.
- **Default verbs** include common UI actions (examples, non-exhaustive) such as `Change`, `Click`, `Submit`, `Focus`, `Blur`, `Select`, `Open`, `Close`, `Toggle`, `Input`, `KeyDown`, `KeyUp`, `Press`, `Hover`, `Drag`, `Drop`, `Scroll`, `Disable`, `Enable`, `Activate`, `Deactivate`, `Show`, `Hide`, `Expand`, `Collapse`, `Create`, `Update`, `Delete`, `Load`, `Save`, `Validate`, and related past-tense forms.
- **Default nouns** include common UI/domain nouns such as `Input`, `Value`, `Form`, `Option`, `Modal`, `Button`, `Dialog`, `Dropdown`, `Item`, `Field`, `Feature`, `State`, `Status`, `Theme`, `Mode`, `User`, `Filter`, `Panel`, `Section`, `Tab`, `Menu`, `Page`, `Route`, `View`, `Drawer`, `Sidebar`, `Tooltip`, `Popover`, and others.

## Options

This rule accepts an optional object:

```json
{
  "allowedVerbs": ["Change", "Disable", "Disabled"],
  "allowedNouns": ["Value", "Feature", "Item"]
}
```

- `allowedVerbs`: replaces the default verb list.
- `allowedNouns`: replaces the default noun list.

Use options when your domain uses verbs or nouns not covered by defaults.

## Examples

### Incorrect

```tsx
<Input onChangeValue={handleChange} />
<Form onSubmitForm={handleSubmit} />
<Modal onCloseModal={handleClose} />
<Select onChangeOption={handleChange} />
<Button onClickButton={handleClick} />
<FeatureFlag onDisableFeature={handleDisable} />
<FeatureFlag onDisabledFeature={handleDisabled} />
```

### Correct

```tsx
<Input onValueChange={handleChange} />
<Form onFormSubmit={handleSubmit} />
<Modal onModalClose={handleClose} />
<Select onOptionChange={handleChange} />
<Button onButtonClick={handleClick} />
<button onClick={handleClick} />
<input onChange={handleChange} />
<FeatureFlag onFeatureDisable={handleDisable} />
<FeatureFlag onFeatureDisabled={handleDisabled} />
```

With custom options:

```tsx
// eslint rule options:
// { allowedVerbs: ['Archived'], allowedNouns: ['Item'] }
<Item onItemArchived={handleArchived} />
```

## How To Fix

1. For `on{Verb}{Noun}`, reorder to `on{Noun}{Verb}`.
2. Keep the same handler implementation; only rename the prop API.
3. Update both component definition and all call sites.

```tsx
// before
<Input onChangeValue={handleChange} />

// after
<Input onValueChange={handleChange} />
```

## When Not To Use It

Disable this rule if:

- Your codebase uses a different convention for handler prop names.
- You prefer `on{Verb}{Noun}` for consistency with existing APIs.
- You have third-party components that require the opposite pattern.
