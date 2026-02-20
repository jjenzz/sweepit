import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/jsx-flat-owner-tree';
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

describe('jsx-flat-owner-tree', () => {
  ruleTester.run('jsx-flat-owner-tree', rule, {
    valid: [
      `
        function Page() {
          return (
            <AppShell>
              <Dialog />
            </AppShell>
          );
        }
      `,
      `
        function Wrapper({ children }: { children: React.ReactNode }) {
          return (
            <Dialog>
              <DialogContent>
                <DialogHeader>{children}</DialogHeader>
              </DialogContent>
            </Dialog>
          );
        }
      `,
    ],
    invalid: [
      {
        code: `
          function Page() {
            return (
              <AppShell>
                <Dialog>
                  <DialogContent>
                    <DialogHeader />
                  </DialogContent>
                </Dialog>
              </AppShell>
            );
          }
        `,
        errors: [
          {
            messageId: 'flatOwnerTree',
            data: {
              component: 'Page',
              depth: '4',
            },
          },
        ],
      },
    ],
  });
});
