import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/no-boolean-capability-props';
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

describe('no-boolean-capability-props', () => {
  ruleTester.run('no-boolean-capability-props', rule, {
    valid: [
      `
        interface DialogProps {
          open: boolean;
          onOpenChange: (open: boolean) => void;
        }
      `,
      `
        interface TableProps {
          canEdit: string;
          hasAudit: number;
        }
      `,
      `
        type MenuProps = {
          isOpen?: boolean;
          onIsOpenToggle?: () => void;
        }
      `,
      `
        interface VisibilityProps {
          visible: boolean;
          onVisibleToggle: (value: boolean) => void;
        }
      `,
      {
        code: `
          interface SlotProps {
            asChild?: boolean;
          }
        `,
        options: [{ ignore: ['asChild'] }],
      },
      {
        code: `
          interface InputProps {
            disabled?: boolean;
            checked?: boolean;
          }
        `,
        options: [{ ignoreNativeBooleanProps: true }],
      },
      `
        interface FeatureFlags {
          open: boolean;
        }
      `,
    ],
    invalid: [
      {
        code: `
          interface DialogProps {
            open: boolean;
          }
        `,
        errors: [
          {
            messageId: 'noBooleanCapabilityProp',
            data: { prop: 'open', handlerPrefix: 'onOpen' },
          },
        ],
      },
      {
        code: `
          interface FeatureProps {
            visible?: boolean;
            onOpenChange?: (open: boolean) => void;
          }
        `,
        errors: [
          {
            messageId: 'noBooleanCapabilityProp',
            data: { prop: 'visible', handlerPrefix: 'onVisible' },
          },
        ],
      },
      {
        code: `
          type PanelProps = {
            isCollapsible: true | false;
          };
        `,
        errors: [
          {
            messageId: 'noBooleanCapabilityProp',
            data: { prop: 'isCollapsible', handlerPrefix: 'onIsCollapsible' },
          },
        ],
      },
      {
        code: `
          type DrawerProps = {
            isEditing: boolean;
            onCloseChange?: () => void;
          };
        `,
        errors: [
          {
            messageId: 'noBooleanCapabilityProp',
            data: { prop: 'isEditing', handlerPrefix: 'onIsEditing' },
          },
        ],
      },
      {
        code: `
          interface CardProps {
            isOpen: boolean;
            onOpenClick: () => void;
          }
        `,
        errors: [
          {
            messageId: 'noBooleanCapabilityProp',
            data: { prop: 'isOpen', handlerPrefix: 'onIsOpen' },
          },
        ],
      },
      {
        code: `
          interface InputProps {
            disabled?: boolean;
          }
        `,
        errors: [
          {
            messageId: 'noBooleanCapabilityProp',
            data: { prop: 'disabled', handlerPrefix: 'onDisabled' },
          },
        ],
      },
    ],
  });
});
