# eslint-plugin-sweepit

Opinionated architectural lint rules.

## Install

```bash
npm install --save-dev eslint-plugin-sweepit eslint
```

## Usage (Flat config)

```js
import sweepit from 'eslint-plugin-sweepit';

export default [...sweepit.configs.react];
```

## Included rules

| Rule | Description |
| --- | --- |
| [`sweepit/no-title-case-props`](https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-title-case-props.md) | Disallows TitleCase JSX props and enforces camelCase prop names. |
| [`sweepit/no-custom-kebab-case-props`](https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-custom-kebab-case-props.md) | Disallows custom kebab-case JSX props (except allowed prefixes like `aria-*` and `data-*`). |
| [`sweepit/no-set-prefix-utils`](https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-set-prefix-utils.md) | Reserves `set*` naming for `useState` setters, not utility/helper functions. |
| [`sweepit/no-useless-hook`](https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-useless-hook.md) | Disallows `use*` functions that do not call a real React hook. |
| [`sweepit/no-hook-jsx`](https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-hook-jsx.md) | Disallows hooks returning JSX; `use*` should return behavior/data, not markup. |
| [`sweepit/no-exported-context-hooks`](https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-exported-context-hooks.md) | Disallows exporting `use*Context` hooks to keep context internals private. |
| [`sweepit/no-handler-return-type`](https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-handler-return-type.md) | Enforces `void` return types for `on*` handler prop contracts. |
| [`sweepit/jsx-server-action-prop-suffix`](https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/jsx-server-action-prop-suffix.md) | Requires async callback props to be named `action` or end with `Action`. |
| [`sweepit/jsx-on-noun-verb-handler-props`](https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/jsx-on-noun-verb-handler-props.md) | Enforces handler prop naming as `on{Noun}{Verb}` (for example `onValueChange`). |
| [`sweepit/no-render-helper-functions`](https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-render-helper-functions.md) | Disallows JSX-returning functions unless they use PascalCase component naming. |
| [`sweepit/no-element-props`](https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-element-props.md) | Restricts `ReactNode`/`ReactElement` prop usage to explicit composition conventions (`children`/`render`). |
| [`sweepit/no-componenttype-props`](https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-componenttype-props.md) | Disallows `ComponentType`/`FC`/`FunctionComponent` props in component contracts. |
| [`sweepit/no-object-props`](https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-object-props.md) | Disallows object-valued JSX props (including typed identifiers/calls), encouraging explicit primitive contracts and composition. |
| [`sweepit/no-array-props`](https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-array-props.md) | Disallows array-valued JSX props (including typed identifiers/calls), encouraging explicit primitive contracts and composition. |
| [`sweepit/no-prefixed-prop-bundles`](https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-prefixed-prop-bundles.md) | Treats grouped prefixed props (for example `userName/userEmail/userRole`) as a composition-pressure signal once they hit a configured threshold (default `3`). |
| [`sweepit/jsx-bem-compound-naming`](https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/jsx-bem-compound-naming.md) | Enforces block-prefixed naming for exported compound component parts. |
| [`sweepit/jsx-compound-part-export-naming`](https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/jsx-compound-part-export-naming.md) | Enforces `Root`/part alias export naming for compound component modules. |
| [`sweepit/no-pass-through-props`](https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-pass-through-props.md) | Disallows props that are only forwarded unchanged to children. |
| [`sweepit/jsx-flat-owner-tree`](https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/jsx-flat-owner-tree.md) | Encourages flatter parent component ownership trees by limiting deep handoff chains. |
