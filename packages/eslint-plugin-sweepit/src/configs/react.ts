import type { ESLint, Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactNoEffectPlugin from 'eslint-plugin-react-you-might-not-need-an-effect';

function createReactConfig(sweepitPlugin: ESLint.Plugin): Linter.Config[] {
  const reactConfig: Linter.Config = {
    plugins: {
      sweepit: sweepitPlugin,
      react: reactPlugin,
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        projectService: true,
        tsconfigRootDir: process.cwd(),
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'react/jsx-handler-names': [
        'error',
        {
          eventHandlerPrefix: 'handle',
          eventHandlerPropPrefix: 'on',
        },
      ],
      'react/jsx-no-constructed-context-values': 'error',
      'react/jsx-no-useless-fragment': 'error',
      'react/jsx-pascal-case': 'error',
      'react/no-unstable-nested-components': 'error',
      'sweepit/no-title-case-props': 'error',
      'sweepit/no-custom-kebab-case-props': 'error',
      'sweepit/no-set-prefix-utils': 'error',
      'sweepit/no-handle-prefix-utils': 'error',
      'sweepit/no-useless-hook': 'error',
      'sweepit/no-hook-jsx': 'error',
      'sweepit/no-exported-context-hooks': 'error',
      'sweepit/no-handler-return-type': 'error',
      'sweepit/jsx-server-action-prop-suffix': 'error',
      'sweepit/jsx-on-handler-verb-suffix': 'error',
      'sweepit/no-render-helper-functions': 'error',
      'sweepit/no-element-props': 'error',
      'sweepit/no-componenttype-props': 'error',
      'sweepit/no-object-props': [
        'error',
        {
          ignore: ['ref'],
        },
      ],
      'sweepit/no-array-props': 'error',
      'sweepit/no-prefixed-prop-bundles': 'error',
      'sweepit/no-optional-props-without-defaults': [
        'error',
        {
          ignore: ['on*', 'ref', 'render'],
        },
      ],
      'sweepit/no-boolean-capability-props': [
        'error',
        {
          ignore: ['asChild'],
          ignoreNativeBooleanProps: true,
        },
      ],
      'sweepit/max-custom-props': 'error',
      'sweepit/jsx-bem-compound-naming': 'error',
      'sweepit/jsx-compound-part-export-naming': 'error',
      'sweepit/no-prop-drilling': [
        'error',
        {
          allowedDepth: 1,
          ignorePropsSpread: true,
        },
      ],
      'sweepit/jsx-flat-owner-tree': 'error',
    },
  };

  return [
    reactHooksPlugin.configs.flat.recommended,
    reactNoEffectPlugin.configs.recommended,
    reactConfig,
  ];
}

export { createReactConfig };
