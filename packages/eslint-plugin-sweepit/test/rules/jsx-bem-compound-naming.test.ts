import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/jsx-bem-compound-naming';
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

describe('jsx-bem-compound-naming', () => {
  ruleTester.run('jsx-bem-compound-naming', rule, {
    valid: [
      '<Dialog.Trigger />',
      '<Tooltip.Content />',
      '<Dialog />',
      '<div />',
    ],
    invalid: [
      {
        code: '<DialogTrigger />',
        errors: [
          {
            messageId: 'preferMemberSyntax',
            data: {
              name: 'DialogTrigger',
              block: 'Dialog',
              part: 'Trigger',
            },
          },
        ],
      },
      {
        code: '<TooltipContent />',
        errors: [
          {
            messageId: 'preferMemberSyntax',
            data: {
              name: 'TooltipContent',
              block: 'Tooltip',
              part: 'Content',
            },
          },
        ],
      },
    ],
  });
});
