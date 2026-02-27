import type { ESLint, Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import tsEslintPlugin from '@typescript-eslint/eslint-plugin';
import functionalPlugin from 'eslint-plugin-functional';
import sonarjs from 'eslint-plugin-sonarjs';

function createCoreConfig(_sweepitPlugin: ESLint.Plugin): Linter.Config[] {
  const sonarRecommended = (sonarjs.configs?.recommended ?? {}) as unknown as Linter.Config;

  const coreConfig: Linter.Config = {
    plugins: {
      '@typescript-eslint': tsEslintPlugin as unknown as ESLint.Plugin,
      functional: functionalPlugin as unknown as ESLint.Plugin,
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
      'functional/immutable-data': 'error',
      'no-param-reassign': ['error', { props: true }],
      'prefer-const': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      complexity: ['error', { max: 3, variant: 'modified' }],
    },
  };

  return [sonarRecommended, coreConfig];
}

export { createCoreConfig };
