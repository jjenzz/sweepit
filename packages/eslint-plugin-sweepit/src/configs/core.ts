import type { ESLint, Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import tsEslintPlugin from '@typescript-eslint/eslint-plugin';
import functionalPlugin from 'eslint-plugin-functional';

function createCoreConfig(sweepitPlugin: ESLint.Plugin): Linter.Config[] {
  const coreConfig: Linter.Config = {
    plugins: {
      '@typescript-eslint': tsEslintPlugin as unknown as ESLint.Plugin,
      functional: functionalPlugin as unknown as ESLint.Plugin,
      sweepit: sweepitPlugin,
    },
    languageOptions: {
      parser: tsParser,
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
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'sweepit/no-external-binding-mutation': 'error',
      'sweepit/complexity': ['error', { max: 5, variant: 'modified' }],
    },
  };

  return [coreConfig];
}

export { createCoreConfig };
