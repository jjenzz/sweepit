# eslint-plugin-sweepit

Opinionated architectural lint rules.

## Install

```bash
npm install --save-dev eslint-plugin-sweepit eslint
```

## Usage (Flat config)

```js
import sweepit from 'eslint-plugin-sweepit';

export default [...sweepit.configs.core, ...sweepit.configs.react];
```

## Type Information (Accuracy Boost)

`configs.core` and `configs.react` enable TypeScript project services by default:

```js
languageOptions: {
  parserOptions: {
    projectService: true,
    tsconfigRootDir: process.cwd(),
  },
}
```

This improves accuracy for rules like:

- `sweepit/no-array-props`
- `sweepit/no-object-props`
- `sweepit/no-optional-props-without-defaults`
- `@typescript-eslint/no-floating-promises`
- `@typescript-eslint/switch-exhaustiveness-check`

## What `configs.core` includes

The exported core config enables:

- all rules from `typescript-eslint` `recommended` and `recommendedTypeChecked` flat configs
- `functional/immutable-data`
- `no-param-reassign` with `{ props: true }`
- `prefer-const`
- `@typescript-eslint/switch-exhaustiveness-check`
- `sweepit/no-external-binding-mutation`
- `sweepit/complexity` with `{ max: 5, variant: 'modified' }`

## What `configs.react` includes

The exported React config is opinionated. It enables:

- Third-party React/TS plugins:
  - `eslint-plugin-react`
  - `eslint-plugin-react-hooks`
  - `eslint-plugin-react-you-might-not-need-an-effect`
  - `typescript-eslint` (flat plugin + parser APIs)
- Third-party rules:
  - `react/jsx-handler-names`
  - `react/jsx-no-constructed-context-values`
  - `react/jsx-no-useless-fragment`
  - `react/jsx-pascal-case`
  - `react/no-unstable-nested-components`
  - `@typescript-eslint/no-floating-promises`
  - all rules from `eslint-plugin-react-hooks` `recommended` config
  - all rules from `eslint-plugin-react-you-might-not-need-an-effect` `recommended` config
- Sweepit rules listed below (all as `error` in the default config)

## Customize rule defaults

Override any default rule from `sweepit.configs.core` and `sweepit.configs.react`.

```js
import sweepit from 'eslint-plugin-sweepit';

export default [
  ...sweepit.configs.core,
  ...sweepit.configs.react,
  {
    rules: {
      // disable a default rule
      'react-hooks/exhaustive-deps': 'off',
      // tune sweepit rules
      'sweepit/no-array-props': 'warn',
      'sweepit/no-prefixed-prop-bundles': ['error', { threshold: 4 }],
    },
  },
];
```

## Included rules

| Rule                                                                                                                                                  | Description                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`sweepit/no-title-case-props`](https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-title-case-props.md)                               | Disallows TitleCase JSX props and enforces camelCase prop names.                                                                                                           |
| [`sweepit/no-custom-kebab-case-props`](https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-custom-kebab-case-props.md)                 | Disallows custom kebab-case JSX props (except allowed prefixes like `aria-*` and `data-*`).                                                                                |
| [`sweepit/no-set-prefix-utils`](https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-set-prefix-utils.md)                               | Reserves `set*` naming for `useState` setters, not utility/helper functions.                                                                                               |
| [`sweepit/no-useless-hook`](https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-useless-hook.md)                                       | Disallows `use*` functions that do not call a real React hook.                                                                                                             |
| [`sweepit/no-hook-jsx`](https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-hook-jsx.md)                                               | Disallows hooks returning JSX; `use*` should return behavior/data, not markup.                                                                                             |
| [`sweepit/no-exported-context-hooks`](https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-exported-context-hooks.md)                   | Disallows exporting `use*Context` hooks to keep context internals private.                                                                                                 |
| [`sweepit/no-handler-return-type`](https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-handler-return-type.md)                         | Enforces `void` return types for `on*` handler prop contracts.                                                                                                             |
| [`sweepit/jsx-server-action-prop-suffix`](https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/jsx-server-action-prop-suffix.md)           | Requires async callback props to be named `action` or end with `Action`.                                                                                                   |
| [`sweepit/jsx-on-handler-verb-suffix`](https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/jsx-on-handler-verb-suffix.md)                 | Ensures `on*` handler prop names end with a verb (for example `onValueChange`).                                                                                            |
| [`sweepit/no-render-helper-functions`](https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-render-helper-functions.md)                 | Disallows JSX-returning functions unless they use PascalCase component naming.                                                                                             |
| [`sweepit/no-element-props`](https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-element-props.md)                                     | Restricts `ReactNode`/`ReactElement` prop usage to explicit composition conventions (`children`/`render`).                                                                 |
| [`sweepit/no-componenttype-props`](https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-componenttype-props.md)                         | Disallows `ComponentType`/`FC`/`FunctionComponent` props in component contracts.                                                                                           |
| [`sweepit/no-object-props`](https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-object-props.md)                                       | Disallows object-typed members in `*Props` type definitions (except `style`).                                                                                              |
| [`sweepit/no-array-props`](https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-array-props.md)                                         | Disallows array/tuple-typed members in `*Props` type definitions.                                                                                                          |
| [`sweepit/no-prefixed-prop-bundles`](https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-prefixed-prop-bundles.md)                     | Treats grouped prefixed prop declarations (for example `userName/userEmail/userRole`) as a composition-pressure signal once they hit a configured threshold (default `3`). |
| [`sweepit/no-optional-props-without-defaults`](https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-optional-props-without-defaults.md) | Disallows optional component props unless defaulted at the component boundary; type info improves optional-prop detection accuracy.                                        |
| [`sweepit/no-boolean-capability-props`](https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-boolean-capability-props.md)               | Disallows boolean props without associated control handlers (for example `open` without `onOpenChange`) in component contracts.                                            |
| [`sweepit/no-external-binding-mutation`](https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-external-binding-mutation.md)             | Enforces function-level mutation purity by disallowing mutation of outer bindings/parameters and requiring readonly typing for method calls on those bindings.             |
| [`sweepit/max-custom-props`](https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/max-custom-props.md)                                     | Limits custom prop count in `*Props` contracts (default max `8`) to surface composition pressure early.                                                                    |
| [`sweepit/jsx-bem-compound-naming`](https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/jsx-bem-compound-naming.md)                       | Enforces block-prefixed naming for exported compound component parts.                                                                                                      |
| [`sweepit/jsx-compound-part-export-naming`](https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/jsx-compound-part-export-naming.md)       | Enforces `Root`/part alias export naming for compound component modules.                                                                                                   |
| [`sweepit/no-prop-drilling`](https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-prop-drilling.md)                                     | Disallows props that are only forwarded unchanged to children.                                                                                                             |
| [`sweepit/jsx-flat-owner-tree`](https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/jsx-flat-owner-tree.md)                               | Encourages flatter parent component ownership trees by limiting deep handoff chains.                                                                                       |
