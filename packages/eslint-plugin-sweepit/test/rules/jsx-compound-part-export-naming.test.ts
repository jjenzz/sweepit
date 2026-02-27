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
        const Dialog = () => null;
        export { Dialog };
      `,
      `
        export const Theme = { light: '#fff', dark: '#000' };
      `,
      `
        const Button = () => null;
        export { Button };
      `,
      {
        filename: '/tmp/button-group.tsx',
        code: `
          const ButtonGroup = () => null;
          const ButtonGroupItem = () => null;
          export { ButtonGroup as Root, ButtonGroupItem as Item };
        `,
      },
      {
        filename: '/tmp/button-group.tsx',
        code: `
          const ButtonGroup = () => null;
          const ButtonGroupItem = () => null;
          export { ButtonGroup as Root, ButtonGroupItem };
          export { ButtonGroupItem as Item };
        `,
      },
      {
        filename: '/tmp/index.tsx',
        code: `
          const Dialog = () => null;
          const DialogTrigger = () => null;
          export { Dialog, DialogTrigger };
        `,
      },
      {
        filename: '/tmp/button-group.tsx',
        code: `
          export { ButtonGroup, ButtonGroupItem } from './button-group';
        `,
      },
    ],
    invalid: [
      {
        filename: '/tmp/button-group.tsx',
        code: `
          const ButtonGroup = () => null;
          const ButtonGroupItem = () => null;
          export { ButtonGroup as Root, ButtonGroupItem };
        `,
        errors: [
          {
            messageId: 'requirePartAlias',
            data: {
              local: 'ButtonGroupItem',
              part: 'Item',
              block: 'ButtonGroup',
            },
          },
        ],
      },
      {
        filename: '/tmp/button-group.tsx',
        code: `
          const ButtonGroup = () => null;
          export function ButtonGroupItem() {
            return null;
          }
          export { ButtonGroup as Root };
        `,
        errors: [
          {
            messageId: 'requirePartAlias',
            data: {
              local: 'ButtonGroupItem',
              part: 'Item',
              block: 'ButtonGroup',
            },
          },
        ],
      },
      {
        filename: '/tmp/button-group.tsx',
        code: `
          const ButtonGroup = () => null;
          export const ButtonGroupItem = () => null;
          export { ButtonGroup };
        `,
        errors: [
          {
            messageId: 'requirePartAlias',
            data: {
              local: 'ButtonGroupItem',
              part: 'Item',
              block: 'ButtonGroup',
            },
          },
          {
            messageId: 'requireRootAlias',
            data: {
              block: 'ButtonGroup',
            },
          },
        ],
      },
      {
        filename: '/tmp/button-group.tsx',
        code: `
          const ButtonGroup = () => null;
          const ButtonGroupItem = () => null;
          export { ButtonGroup as Root };
          export { ButtonGroupItem as ButtonGroupItem };
        `,
        errors: [
          {
            messageId: 'requirePartAlias',
            data: {
              local: 'ButtonGroupItem',
              part: 'Item',
              block: 'ButtonGroup',
            },
          },
        ],
      },
      {
        filename: '/tmp/button-group.tsx',
        code: `
          const ButtonGroupItem = () => null;
          const ButtonGroupIcon = () => null;
          export { ButtonGroupItem as Item, ButtonGroupIcon as Icon };
          export const ButtonGroup = { Item: ButtonGroupItem };
        `,
        errors: [
          {
            messageId: 'requireRootExport',
            data: {
              block: 'ButtonGroup',
            },
          },
          {
            messageId: 'noRuntimeObjectExport',
            data: {
              name: 'ButtonGroup',
            },
          },
        ],
      },
      {
        filename: '/tmp/button-group.tsx',
        code: `
          const ButtonGroup = () => null;
          const ButtonGroupItem = () => null;
          const ButtonGroupIcon = () => null;
          export { ButtonGroupItem as Item, ButtonGroupIcon as Icon };
        `,
        errors: [
          {
            messageId: 'requireRootExport',
            data: {
              block: 'ButtonGroup',
            },
          },
        ],
      },
      {
        filename: '/tmp/button-group.tsx',
        code: `
          const ButtonGroup = () => null;
          const ButtonGroupItem = () => null;
          export { ButtonGroup, ButtonGroupItem as Item };
        `,
        errors: [
          {
            messageId: 'requireRootAlias',
            data: {
              block: 'ButtonGroup',
            },
          },
        ],
      },
    ],
  });
});
