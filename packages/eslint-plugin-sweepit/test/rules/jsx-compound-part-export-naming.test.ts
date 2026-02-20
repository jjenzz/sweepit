import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/jsx-compound-part-export-naming';
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

describe('jsx-compound-part-export-naming', () => {
  ruleTester.run('jsx-compound-part-export-naming', rule, {
    valid: [
      `
        const DialogTrigger = () => null;
        export { DialogTrigger as Trigger };
      `,
      `
        const TooltipContent = () => null;
        export { TooltipContent as Content };
      `,
      `
        const Dialog = () => null;
        export { Dialog };
      `,
      `
        export const Theme = { light: '#fff', dark: '#000' };
      `,
    ],
    invalid: [
      {
        code: `
          const DialogTrigger = () => null;
          export { DialogTrigger };
        `,
        errors: [
          {
            messageId: 'requirePartAlias',
            data: {
              local: 'DialogTrigger',
              part: 'Trigger',
            },
          },
        ],
      },
      {
        code: `
          const TooltipContent = () => null;
          export { TooltipContent as TooltipContent };
        `,
        errors: [
          {
            messageId: 'requirePartAlias',
            data: {
              local: 'TooltipContent',
              part: 'Content',
            },
          },
        ],
      },
      {
        code: `
          const DialogTrigger = () => null;
          export const Dialog = { Trigger: DialogTrigger };
        `,
        errors: [
          {
            messageId: 'noRuntimeObjectExport',
            data: {
              name: 'Dialog',
            },
          },
        ],
      },
    ],
  });
});
