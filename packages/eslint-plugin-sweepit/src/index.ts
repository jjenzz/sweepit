import type { ESLint } from 'eslint';
import { createReactConfig } from './configs/react';
import noTitleCaseProps from './rules/no-title-case-props';
import noCustomKebabCaseProps from './rules/no-custom-kebab-case-props';
import noSetPrefixUtils from './rules/no-set-prefix-utils';
import noUselessHook from './rules/no-useless-hook';
import noHookJsx from './rules/no-hook-jsx';
import noExportedContextHooks from './rules/no-exported-context-hooks';
import noHandlerReturnType from './rules/no-handler-return-type';
import jsxServerActionPropSuffix from './rules/jsx-server-action-prop-suffix';
import jsxOnNounVerbHandlerProps from './rules/jsx-on-noun-verb-handler-props';
import noRenderHelperFunctions from './rules/no-render-helper-functions';
import noElementProps from './rules/no-element-props';
import noComponentTypeProps from './rules/no-componenttype-props';
import noObjectProps from './rules/no-object-props';
import noArrayProps from './rules/no-array-props';
import jsxBemCompoundNaming from './rules/jsx-bem-compound-naming';
import jsxCompoundPartExportNaming from './rules/jsx-compound-part-export-naming';
import noPassThroughProps from './rules/no-pass-through-props';
import jsxFlatOwnerTree from './rules/jsx-flat-owner-tree';

const plugin: ESLint.Plugin = {
  meta: {
    name: 'eslint-plugin-sweepit',
    version: '0.0.0',
  },
  rules: {
    'no-title-case-props': noTitleCaseProps,
    'no-custom-kebab-case-props': noCustomKebabCaseProps,
    'no-set-prefix-utils': noSetPrefixUtils,
    'no-useless-hook': noUselessHook,
    'no-hook-jsx': noHookJsx,
    'no-exported-context-hooks': noExportedContextHooks,
    'no-handler-return-type': noHandlerReturnType,
    'jsx-server-action-prop-suffix': jsxServerActionPropSuffix,
    'jsx-on-noun-verb-handler-props': jsxOnNounVerbHandlerProps,
    'no-render-helper-functions': noRenderHelperFunctions,
    'no-element-props': noElementProps,
    'no-componenttype-props': noComponentTypeProps,
    'no-object-props': noObjectProps,
    'no-array-props': noArrayProps,
    'jsx-bem-compound-naming': jsxBemCompoundNaming,
    'jsx-compound-part-export-naming': jsxCompoundPartExportNaming,
    'no-pass-through-props': noPassThroughProps,
    'jsx-flat-owner-tree': jsxFlatOwnerTree,
  },
  configs: {},
};

plugin.configs = {
  react: createReactConfig(plugin),
};

export default plugin;
export { plugin };
