import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/no-handler-return-type';
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

describe('no-handler-return-type', () => {
  ruleTester.run('no-handler-return-type', rule, {
    valid: [
      `
				interface ComponentProps {
					onClose: () => void;
				}
			`,
      `
				type ComponentProps = {
					onChange?: (() => void) | undefined;
				};
			`,
      `
				interface ComponentProps {
					onExpand?(): void;
				}
			`,
      `
				interface ComponentProps {
					close: () => boolean;
				}
			`,
    ],
    invalid: [
      {
        code: `
					interface ComponentProps {
						onClose: () => boolean;
					}
				`,
        errors: [
          {
            messageId: 'noHandlerReturnType',
            data: {
              prop: 'onClose',
              returnType: 'boolean',
            },
          },
        ],
      },
      {
        code: `
					interface ComponentProps {
						onSelect?: (value: string) => number;
					}
				`,
        errors: [
          {
            messageId: 'noHandlerReturnType',
            data: {
              prop: 'onSelect',
              returnType: 'number',
            },
          },
        ],
      },
      {
        code: `
					interface ComponentProps {
						onSubmit: () => Promise<boolean>;
					}
				`,
        errors: [
          {
            messageId: 'noHandlerReturnType',
            data: {
              prop: 'onSubmit',
              returnType: 'Promise<boolean>',
            },
          },
        ],
      },
      {
        code: `
					interface ComponentProps {
						onSubmit: () => Promise<void>;
					}
				`,
        errors: [
          {
            messageId: 'noHandlerReturnType',
            data: {
              prop: 'onSubmit',
              returnType: 'Promise<void>',
            },
          },
        ],
      },
      {
        code: `
					interface ComponentProps {
						onOpen?(): string;
					}
				`,
        errors: [
          {
            messageId: 'noHandlerReturnType',
            data: {
              prop: 'onOpen',
              returnType: 'string',
            },
          },
        ],
      },
      {
        code: `
					type ComponentProps = {
						onClose?: (() => boolean) | undefined;
					};
				`,
        errors: [
          {
            messageId: 'noHandlerReturnType',
            data: {
              prop: 'onClose',
              returnType: 'boolean',
            },
          },
        ],
      },
      {
        code: `
					type ComponentProps = {
						onSave: (() => Promise<number>) | null;
					};
				`,
        errors: [
          {
            messageId: 'noHandlerReturnType',
            data: {
              prop: 'onSave',
              returnType: 'Promise<number>',
            },
          },
        ],
      },
      {
        code: `
					type ComponentProps = {
						onSave: (() => Promise<void>) | null;
					};
				`,
        errors: [
          {
            messageId: 'noHandlerReturnType',
            data: {
              prop: 'onSave',
              returnType: 'Promise<void>',
            },
          },
        ],
      },
    ],
  });
});
