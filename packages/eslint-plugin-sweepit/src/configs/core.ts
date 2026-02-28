import type { ESLint, Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import functionalPlugin from 'eslint-plugin-functional';

function createCoreConfig(sweepitPlugin: ESLint.Plugin): Linter.Config[] {
  const coreConfig: Linter.Config = {
    plugins: {
      '@typescript-eslint': tseslint.plugin as unknown as ESLint.Plugin,
      functional: functionalPlugin as unknown as ESLint.Plugin,
      sweepit: sweepitPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        projectService: true,
        tsconfigRootDir: process.cwd(),
      },
    },
    rules: {
      'functional/immutable-data': [
        'error',
        {
          ignoreAccessorPattern: ['*.displayName', '*.current'],
          ignoreMapsAndSets: true,
          ignoreNonConstDeclarations: {
            treatParametersAsConst: true,
          },
        },
      ],
      'no-param-reassign': ['error', { props: true }],
      'max-params': ['error', { max: 4 }],
      'prefer-const': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'sweepit/no-external-binding-mutation': 'error',
      'sweepit/complexity': ['error', { max: 5, variant: 'modified' }],
    },
  };

  return [
    ...(tseslint.configs.recommended as Linter.Config[]),
    ...(tseslint.configs.recommendedTypeChecked as Linter.Config[]),
    coreConfig,
  ];
}

export { createCoreConfig };
