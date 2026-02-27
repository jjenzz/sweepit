import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/no-optional-props-without-defaults';
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

describe('no-optional-props-without-defaults', () => {
  ruleTester.run('no-optional-props-without-defaults', rule, {
    valid: [
      `
        interface ButtonProps {
          tone?: 'primary' | 'secondary';
        }
        function Button({ tone = 'primary' }: ButtonProps) {
          return tone;
        }
      `,
      `
        type InputProps = {
          size?: 'sm' | 'md';
        };
        const Input = ({ size = 'md' }: InputProps) => size;
      `,
      `
        interface DialogProps {
          open: boolean;
          onOpenChange: (open: boolean) => void;
        }
        function Dialog(props: DialogProps) {
          return props.open;
        }
      `,
      `
        interface ThirdPartyProps {
          fromLibrary?: boolean;
        }
        interface ButtonProps extends ThirdPartyProps {
          tone: 'primary' | 'secondary';
        }
        function Button(props: ButtonProps) {
          return props.tone;
        }
      `,
    ],
    invalid: [
      {
        code: `
          interface ButtonProps {
            tone?: 'primary' | 'secondary';
          }
          function Button(props: ButtonProps) {
            return props.tone;
          }
        `,
        errors: [
          {
            messageId: 'noOptionalPropWithoutDefault',
            data: {
              component: 'Button',
              prop: 'tone',
            },
          },
        ],
      },
      {
        code: `
          type InputProps = {
            size?: 'sm' | 'md';
          };
          const Input = ({ size }: InputProps) => size;
        `,
        errors: [
          {
            messageId: 'noOptionalPropWithoutDefault',
            data: {
              component: 'Input',
              prop: 'size',
            },
          },
        ],
      },
      {
        code: `
          const Banner = ({ dismissible }: { dismissible?: boolean }) => dismissible;
        `,
        errors: [
          {
            messageId: 'noOptionalPropWithoutDefault',
            data: {
              component: 'Banner',
              prop: 'dismissible',
            },
          },
        ],
      },
      {
        code: `
          interface CardProps {
            tone?: 'info' | 'warning';
            density?: 'comfortable' | 'compact';
          }
          const Card = ({ tone = 'info' }: CardProps) => tone;
        `,
        errors: [
          {
            messageId: 'noOptionalPropWithoutDefault',
            data: {
              component: 'Card',
              prop: 'density',
            },
          },
        ],
      },
    ],
  });
});
