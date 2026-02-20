import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/jsx-server-action-prop-suffix';
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

describe('jsx-server-action-prop-suffix', () => {
  ruleTester.run('jsx-server-action-prop-suffix', rule, {
    valid: [
      `
				interface FormProps {
					action: (data: FormData) => Promise<void>;
				}
			`,
      `
				interface FormProps {
					submitAction?: (data: FormData) => Promise<Response>;
				}
			`,
      `
				interface FormProps {
					onSubmit: (event: SubmitEvent) => void;
					onChange?: (value: string) => void;
				}
			`,
      `
				type FormProps = {
					action: ((data: FormData) => Promise<void>) | undefined;
				};
			`,
      `
				interface FormProps {
					submitAction?(): Promise<void>;
				}
			`,
      `
				interface FormProps {
					loadAction: () => Promise<MyResult>;
				}
			`,
      `
				interface FormProps {
					Action: () => Promise<void>;
				}
			`,
      `
				interface FormProps {
					action: () => void;
				}
			`,
    ],
    invalid: [
      {
        code: `
					interface FormProps {
						onSubmit: () => Promise<void>;
					}
				`,
        errors: [
          {
            messageId: 'asyncPropRequiresActionName',
            data: { prop: 'onSubmit', returnType: 'Promise<void>' },
          },
        ],
      },
      {
        code: `
					interface FormProps {
						submit: (data: FormData) => Promise<void>;
					}
				`,
        errors: [
          {
            messageId: 'asyncPropRequiresActionName',
            data: { prop: 'submit', returnType: 'Promise<void>' },
          },
        ],
      },
      {
        code: `
					interface FormProps {
						uploadFile: (file: File) => Promise<Response>;
					}
				`,
        errors: [
          {
            messageId: 'asyncPropRequiresActionName',
            data: { prop: 'uploadFile', returnType: 'Promise<Response>' },
          },
        ],
      },
      {
        code: `
					type FormProps = {
						onSubmit?: (() => Promise<void>) | undefined;
					};
				`,
        errors: [
          {
            messageId: 'asyncPropRequiresActionName',
            data: { prop: 'onSubmit', returnType: 'Promise<void>' },
          },
        ],
      },
      {
        code: `
					interface FormProps {
						onSave?(): Promise<void>;
					}
				`,
        errors: [
          {
            messageId: 'asyncPropRequiresActionName',
            data: { prop: 'onSave', returnType: 'Promise<void>' },
          },
        ],
      },
      {
        code: `
					type FormProps = {
						onUpload: (() => Promise<Response>) | null;
					};
				`,
        errors: [
          {
            messageId: 'asyncPropRequiresActionName',
            data: { prop: 'onUpload', returnType: 'Promise<Response>' },
          },
        ],
      },
    ],
  });
});
