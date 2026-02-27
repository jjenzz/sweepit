import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/complexity';
import tsParser from '@typescript-eslint/parser';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  },
});

describe('complexity', () => {
  ruleTester.run('complexity', rule, {
    valid: [
      {
        code: `
          function DashboardView(value: number) {
            if (value > 0) {}
            if (value > 1) {}
            if (value > 2) {}
            if (value > 3) {}
            if (value > 4) {}
            return <div />;
          }
        `,
        options: [{ max: 4, variant: 'modified' }],
      },
      {
        code: `
          const UserProfile = (value: number) => {
            if (value > 0) {}
            if (value > 1) {}
            if (value > 2) {}
            if (value > 3) {}
            if (value > 4) {}
            return <div />;
          };
        `,
        options: [{ max: 4, variant: 'modified' }],
      },
      {
        code: `
          function helper(value: number) {
            if (value > 0) {}
            if (value > 1) {}
            return value;
          }
        `,
        options: [{ max: 4, variant: 'modified' }],
      },
    ],
    invalid: [
      {
        code: `
          function helper(value: number) {
            if (value > 0) {}
            if (value > 1) {}
            if (value > 2) {}
            if (value > 3) {}
            if (value > 4) {}
            return value;
          }
        `,
        options: [{ max: 4, variant: 'modified' }],
        errors: [{ messageId: 'complex' }],
      },
      {
        code: `
          const renderDetails = (value: number) => {
            if (value > 0) {}
            if (value > 1) {}
            if (value > 2) {}
            if (value > 3) {}
            if (value > 4) {}
            return value;
          };
        `,
        options: [{ max: 4, variant: 'modified' }],
        errors: [{ messageId: 'complex' }],
      },
    ],
  });
});
