import type { ESLint, Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import tsEslintPlugin from '@typescript-eslint/eslint-plugin';
import functionalPlugin from 'eslint-plugin-functional';
import sonarjs from 'eslint-plugin-sonarjs';

function createCoreConfig(sweepitPlugin: ESLint.Plugin): Linter.Config[] {
  const sonarRecommended = (sonarjs.configs?.recommended ?? {}) as unknown as Linter.Config;

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
      'sonarjs/prefer-read-only-props': 'off',
      'functional/immutable-data': [
        'error',
        {
          ignoreAccessorPattern: ['*.displayName', '*.current'],
          ignoreMapsAndSets: true,
          ignoreNonConstDeclarations: true,
        },
      ],
      'no-param-reassign': ['error', { props: true }],
      'max-params': ['error', { max: 4 }],
      'prefer-const': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'sweepit/complexity': ['error', { max: 5, variant: 'modified' }],
    },
  };

  return [sonarRecommended, coreConfig];
}

export { createCoreConfig };
