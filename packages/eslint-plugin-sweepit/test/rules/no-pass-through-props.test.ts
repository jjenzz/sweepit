import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/no-pass-through-props';
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

describe('no-pass-through-props', () => {
  ruleTester.run('no-pass-through-props', rule, {
    valid: [
      `
        function Card({ title }: { title: string }) {
          return <h2>{title.toUpperCase()}</h2>;
        }
      `,
      `
        function Dialog({ children }: { children: React.ReactNode }) {
          return <DialogRoot>{children}</DialogRoot>;
        }
      `,
      `
        const Counter = ({ count }: { count: number }) => {
          const next = count + 1;
          return <Value value={next} />;
        };
      `,
    ],
    invalid: [
      {
        code: `
          function Card({ title }: { title: string }) {
            return <Heading title={title} />;
          }
        `,
        errors: [
          {
            messageId: 'noPassThroughProp',
            data: {
              prop: 'title',
              component: 'Card',
            },
          },
        ],
      },
      {
        code: `
          const Panel = ({ subtitle: panelSubtitle }: { subtitle: string }) => {
            return <Heading subtitle={panelSubtitle} />;
          };
        `,
        errors: [
          {
            messageId: 'noPassThroughProp',
            data: {
              prop: 'subtitle',
              component: 'Panel',
            },
          },
        ],
      },
    ],
  });
});
