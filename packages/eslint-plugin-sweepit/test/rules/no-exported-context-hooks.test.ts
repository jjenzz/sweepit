import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/no-exported-context-hooks';
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

describe('no-exported-context-hooks', () => {
  ruleTester.run('no-exported-context-hooks', rule, {
    valid: [
      `
				function useDialogContext() {
					return useContext(DialogContext);
				}
			`,
      `
				const useThemeContext = () => useContext(ThemeContext);
			`,
      `
				export function useDialog() {
					return useDialogState();
				}
			`,
      `
				const useFormContext = () => useContext(FormContext);
				function getFormData() {}
				export { getFormData };
			`,
      `
				const useDialogContext = () => useContext(DialogContext);
				export default function DialogRoot() {
					return null;
				}
			`,
    ],
    invalid: [
      {
        code: `
					export function useDialogContext() {
						return useContext(DialogContext);
					}
				`,
        errors: [
          {
            messageId: 'noExportedContextHook',
            data: { name: 'useDialogContext' },
          },
        ],
      },
      {
        code: `
					export const useThemeContext = () => useContext(ThemeContext);
				`,
        errors: [
          {
            messageId: 'noExportedContextHook',
            data: { name: 'useThemeContext' },
          },
        ],
      },
      {
        code: `
					const usePopoverContext = () => useContext(PopoverContext);
					export { usePopoverContext };
				`,
        errors: [
          {
            messageId: 'noExportedContextHook',
            data: { name: 'usePopoverContext' },
          },
        ],
      },
      {
        code: `
					const useDrawerContext = () => useContext(DrawerContext);
					export default useDrawerContext;
				`,
        errors: [
          {
            messageId: 'noExportedContextHook',
            data: { name: 'useDrawerContext' },
          },
        ],
      },
    ],
  });
});
