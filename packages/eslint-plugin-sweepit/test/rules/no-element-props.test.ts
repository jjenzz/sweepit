import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/no-element-props';
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

describe('no-element-props', () => {
  ruleTester.run('no-element-props', rule, {
    valid: [
      // ReactNode: children allowed
      "import type React from 'react'; interface Props { children: React.ReactNode; }",
      "import type { ReactNode } from 'react'; interface Props { children?: ReactNode; }",
      "import type React from 'react'; type Props = { children: React.ReactNode };",
      // ReactElement: render allowed
      "import type { ReactElement } from 'react'; interface Props { render: ReactElement; }",
      "import type React from 'react'; interface Props { render?: React.ReactElement; }",
      "import type { ReactElement } from 'react'; type Props = { render: ReactElement };",
      // Non-element props
      'interface Props { title: string; count: number; }',
    ],
    invalid: [
      // ReactNode: disallow non-children
      {
        code: "import type React from 'react'; interface Props { header: React.ReactNode; }",
        errors: [
          {
            messageId: 'noElementPropsReactNode',
            data: { prop: 'header' },
          },
        ],
      },
      {
        code: "import type { ReactNode } from 'react'; interface Props { footer?: ReactNode; }",
        errors: [
          {
            messageId: 'noElementPropsReactNode',
            data: { prop: 'footer' },
          },
        ],
      },
      {
        code: "import type React from 'react'; type Props = { content: React.ReactNode };",
        errors: [
          {
            messageId: 'noElementPropsReactNode',
            data: { prop: 'content' },
          },
        ],
      },
      // ReactNode: render is no longer allowed (only children)
      {
        code: "import type { ReactNode } from 'react'; interface Props { render: ReactNode; }",
        errors: [
          {
            messageId: 'noElementPropsReactNode',
            data: { prop: 'render' },
          },
        ],
      },
      // ReactElement: disallow non-render
      {
        code: "import type { ReactElement } from 'react'; interface Props { header: ReactElement; }",
        errors: [
          {
            messageId: 'noElementPropsReactElement',
            data: { prop: 'header' },
          },
        ],
      },
      {
        code: "import type React from 'react'; interface Props { footer?: React.ReactElement; }",
        errors: [
          {
            messageId: 'noElementPropsReactElement',
            data: { prop: 'footer' },
          },
        ],
      },
      {
        code: "import type { ReactElement } from 'react'; type Props = { content: ReactElement };",
        errors: [
          {
            messageId: 'noElementPropsReactElement',
            data: { prop: 'content' },
          },
        ],
      },
      // ReactElement: children is not allowed (only render)
      {
        code: "import type { ReactElement } from 'react'; interface Props { children: ReactElement; }",
        errors: [
          {
            messageId: 'noElementPropsReactElement',
            data: { prop: 'children' },
          },
        ],
      },
    ],
  });
});
