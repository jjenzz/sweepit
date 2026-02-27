import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/no-object-props';
import tsParser from '@typescript-eslint/parser';
import { fileURLToPath } from 'node:url';

const tsconfigRootDir = fileURLToPath(new URL('../../', import.meta.url));

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
      projectService: {
        allowDefaultProject: ['estree.ts', 'estree.tsx'],
      },
      tsconfigRootDir,
    },
  },
});

describe('no-object-props', () => {
  ruleTester.run('no-object-props', rule, {
    valid: [
      'interface ButtonProps { tone: string; onValueChange: (value: string) => void; count: number }',
      'interface ButtonProps { style: { color: string } }',
      'type ButtonProps = { onClick: () => void; disabled: boolean }',
      'interface ButtonProps { children?: React.ReactNode }',
      "import type { ReactNode } from 'react'; interface ButtonProps { children?: ReactNode }",
      'interface UserOptions { user: { id: string } }',
      {
        code: 'interface InputProps { ref: { current: HTMLInputElement | null } }',
        options: [{ ignore: ['ref'] }],
      },
    ],
    invalid: [
      {
        code: 'interface ButtonProps { options: { dense: boolean; interactive: boolean } }',
        errors: [
          {
            messageId: 'noObjectProps',
            data: { prop: 'options', propsType: 'ButtonProps' },
          },
        ],
      },
      {
        code: 'interface UserRow { id: string; email: string } interface UserCardProps { user: UserRow }',
        errors: [
          {
            messageId: 'noObjectProps',
            data: { prop: 'user', propsType: 'UserCardProps' },
          },
        ],
      },
      {
        code: 'type Config = { dense: boolean }; type CardProps = { config: Config }',
        errors: [
          {
            messageId: 'noObjectProps',
            data: { prop: 'config', propsType: 'CardProps' },
          },
        ],
      },
      {
        code: 'interface InputProps { ref: { current: HTMLInputElement | null } }',
        errors: [
          {
            messageId: 'noObjectProps',
            data: { prop: 'ref', propsType: 'InputProps' },
          },
        ],
      },
      {
        code: 'interface ButtonProps { children: { content: string } }',
        errors: [
          {
            messageId: 'noObjectProps',
            data: { prop: 'children', propsType: 'ButtonProps' },
          },
        ],
      },
    ],
  });
});
