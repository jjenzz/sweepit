import type { ESLint, Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import functionalPlugin from 'eslint-plugin-functional';

function createCoreConfig(sweepitPlugin: ESLint.Plugin): Linter.Config[] {
  const coreConfig: Linter.Config = {
    plugins: {
      functional: functionalPlugin as unknown as ESLint.Plugin,
      '@typescript-eslint': tseslint.plugin,
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
          ignoreClasses: true,
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
      'sweepit/complexity': ['error', { max: 10, variant: 'modified' }],
      'sweepit/no-inline-call-expressions': [
        'error',
        {
          contexts: ['for-header', 'call-arg'],
          allowCallPatterns: ['*.entries', '*.values', '*.keys'],
        },
      ],
    },
  };

  return [...tseslint.configs.recommended, ...tseslint.configs.recommendedTypeChecked, coreConfig];
}

export { createCoreConfig };
