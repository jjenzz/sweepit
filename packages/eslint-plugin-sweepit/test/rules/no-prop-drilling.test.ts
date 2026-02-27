import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/no-prop-drilling';
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

describe('no-prop-drilling', () => {
  ruleTester.run('no-prop-drilling', rule, {
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
      `
        const Input: React.FC<InputProps> = ({ type = 'text', ...props }) => (
          <input
            type={type}
            {...props}
          />
        );
      `,
      {
        code: `
        const Leaf = ({ title }: { title: string }) => <h2>{title}</h2>;

        const Card = ({ title }: { title: string }) => {
          return <Leaf title={title} />;
        };
      `,
        options: [{ allowedDepth: 2 }],
      },
      `
        const Native = ({ ...props }: InputProps) => <input {...props} />;

        const LevelOne = ({ ...props }: InputProps) => <Native {...props} />;

        const LevelTwo = ({ ...props }: InputProps) => <LevelOne {...props} />;

        const LevelThree = ({ ...props }: InputProps) => <LevelTwo {...props} />;
      `,
    ],
    invalid: [
      {
        code: `
          const BaseInput = ({ ...props }: InputProps) => {
            return <input {...props} />;
          };

          const Input = ({ ...props }: InputProps) => {
            return <BaseInput {...props} />;
          };
        `,
        options: [{ allowedDepth: 1, ignorePropsSpread: false }],
        errors: [
          {
            messageId: 'noPassThroughProp',
            data: {
              prop: '...props',
              component: 'Input',
              forwardedTo: 'props spread',
              depth: '2',
              allowedDepth: '1',
            },
          },
        ],
      },
      {
        code: `
          const Leaf = ({ title }: { title: string }) => <h2>{title}</h2>;

          const Middle = ({ title }: { title: string }) => {
            return <Leaf title={title} />;
          };

          const Top = ({ title }: { title: string }) => {
            return <Middle title={title} />;
          };
        `,
        options: [{ allowedDepth: 1 }],
        errors: [
          {
            messageId: 'noPassThroughProp',
            data: {
              prop: 'title',
              component: 'Top',
              forwardedTo: 'title',
              depth: '2',
              allowedDepth: '1',
            },
          },
        ],
      },
      {
        code: `
          const Native = ({ ...props }: InputProps) => <input {...props} />;

          const LevelOne = ({ ...props }: InputProps) => <Native {...props} />;

          const LevelTwo = ({ ...props }: InputProps) => <LevelOne {...props} />;

          const LevelThree = ({ ...props }: InputProps) => <LevelTwo {...props} />;
        `,
        options: [{ allowedDepth: 2, ignorePropsSpread: false }],
        errors: [
          {
            messageId: 'noPassThroughProp',
            data: {
              prop: '...props',
              component: 'LevelThree',
              forwardedTo: 'props spread',
              depth: '4',
              allowedDepth: '2',
            },
          },
        ],
      },
    ],
  });
});
