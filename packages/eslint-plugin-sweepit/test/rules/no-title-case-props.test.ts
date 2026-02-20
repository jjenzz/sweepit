import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/no-title-case-props';
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

describe('no-title-case-props', () => {
  ruleTester.run('no-title-case-props', rule, {
    valid: [
      '<Component someProp="value" />',
      '<Button onClick={handler} />',
      '<div className="foo" />',
      '<span aria-label="Close" />',
    ],
    invalid: [
      {
        code: '<Component SomeProp="value" />',
        errors: [
          {
            messageId: 'noTitleCase',
            data: { prop: 'SomeProp', suggestion: 'someProp' },
          },
        ],
      },
      {
        code: '<Button HelloWorld={handler} />',
        errors: [
          {
            messageId: 'noTitleCase',
            data: { prop: 'HelloWorld', suggestion: 'helloWorld' },
          },
        ],
      },
    ],
  });
});
