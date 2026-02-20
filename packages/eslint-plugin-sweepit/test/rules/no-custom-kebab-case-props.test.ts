import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/no-custom-kebab-case-props';
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

describe('no-custom-kebab-case-props', () => {
  ruleTester.run('no-custom-kebab-case-props', rule, {
    valid: [
      '<div aria-label="Close" />',
      '<button aria-hidden={true} />',
      '<div data-testid="submit" />',
      '<span data-cy="button" />',
      '<Component myCustomProp="value" />',
    ],
    invalid: [
      {
        code: '<Component my-custom-prop="value" />',
        errors: [
          {
            messageId: 'noCustomKebab',
            data: { prop: 'my-custom-prop' },
          },
        ],
      },
      {
        code: '<Button some-other-prop={handler} />',
        errors: [
          {
            messageId: 'noCustomKebab',
            data: { prop: 'some-other-prop' },
          },
        ],
      },
    ],
  });
});
