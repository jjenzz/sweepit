import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/no-componenttype-props';
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

describe('no-componenttype-props', () => {
  ruleTester.run('no-componenttype-props', rule, {
    valid: [
      'interface Props { children: React.ReactNode; }',
      'interface Props { asChild?: boolean; }',
      'interface Props { renderItem?: (item: Item) => ReactNode; }',
      'interface Props { render?: (props: Props) => ReactNode | React.ReactElement; }',
      'type Props = { icon?: ReactNode };',
      'interface Props { Component?: string; }',
    ],
    invalid: [
      {
        code: "import type React from 'react'; interface Props { wrapper: React.ComponentType<{ children: React.ReactNode }>; }",
        errors: [
          {
            messageId: 'noComponentTypeProps',
            data: { prop: 'wrapper' },
          },
        ],
      },
      {
        code: "import type { ComponentType } from 'react'; interface Props { Icon: ComponentType<{ size?: number }>; }",
        errors: [
          {
            messageId: 'noComponentTypeProps',
            data: { prop: 'Icon' },
          },
        ],
      },
      {
        code: "import type { FC } from 'react'; type Props = { ItemComponent: FC<{ id: string }>; }",
        errors: [
          {
            messageId: 'noComponentTypeProps',
            data: { prop: 'ItemComponent' },
          },
        ],
      },
      {
        code: "import type { FunctionComponent } from 'react'; interface Props { Layout: FunctionComponent<{ children: React.ReactNode }>; }",
        errors: [
          {
            messageId: 'noComponentTypeProps',
            data: { prop: 'Layout' },
          },
        ],
      },
      {
        code: "import type React from 'react'; import type { ComponentType } from 'react'; interface Props { A: ComponentType; B: React.ComponentType; }",
        errors: [
          {
            messageId: 'noComponentTypeProps',
            data: { prop: 'A' },
          },
          {
            messageId: 'noComponentTypeProps',
            data: { prop: 'B' },
          },
        ],
      },
    ],
  });
});
