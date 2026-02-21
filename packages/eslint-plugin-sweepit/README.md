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
| `sweepit/no-title-case-props` | Disallows TitleCase JSX props and enforces camelCase prop names. |
| `sweepit/no-custom-kebab-case-props` | Disallows custom kebab-case JSX props (except allowed prefixes like `aria-*` and `data-*`). |
| `sweepit/no-set-prefix-utils` | Reserves `set*` naming for `useState` setters, not utility/helper functions. |
| `sweepit/no-useless-hook` | Disallows `use*` functions that do not call a real React hook. |
| `sweepit/no-hook-jsx` | Disallows hooks returning JSX; `use*` should return behavior/data, not markup. |
| `sweepit/no-exported-context-hooks` | Disallows exporting `use*Context` hooks to keep context internals private. |
| `sweepit/no-handler-return-type` | Enforces `void` return types for `on*` handler prop contracts. |
| `sweepit/jsx-server-action-prop-suffix` | Requires async callback props to be named `action` or end with `Action`. |
| `sweepit/jsx-on-noun-verb-handler-props` | Enforces handler prop naming as `on{Noun}{Verb}` (for example `onValueChange`). |
| `sweepit/no-render-helper-functions` | Disallows JSX-returning functions unless they use PascalCase component naming. |
| `sweepit/no-element-props` | Restricts `ReactNode`/`ReactElement` prop usage to explicit composition conventions (`children`/`render`). |
| `sweepit/no-componenttype-props` | Disallows `ComponentType`/`FC`/`FunctionComponent` props in component contracts. |
| `sweepit/no-object-props` | Disallows object-valued JSX props (including typed identifiers/calls), encouraging explicit primitive contracts and composition. |
| `sweepit/no-array-props` | Disallows array-valued JSX props (including typed identifiers/calls), encouraging explicit primitive contracts and composition. |
| `sweepit/no-prefixed-prop-bundles` | Treats grouped prefixed props (for example `userName/userEmail/userRole`) as a composition-pressure signal once they hit a configured threshold (default `3`). |
| `sweepit/jsx-bem-compound-naming` | Enforces block-prefixed naming for exported compound component parts. |
| `sweepit/jsx-compound-part-export-naming` | Enforces `Root`/part alias export naming for compound component modules. |
| `sweepit/no-pass-through-props` | Disallows props that are only forwarded unchanged to children. |
| `sweepit/jsx-flat-owner-tree` | Encourages flatter parent component ownership trees by limiting deep handoff chains. |
