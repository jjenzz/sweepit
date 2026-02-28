import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/no-external-binding-mutation';
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

describe('no-external-binding-mutation', () => {
  ruleTester.run('no-external-binding-mutation', rule, {
    valid: [
      {
        code: `
          function increment() {
            let count = 0;
            count = count + 1;
          }
        `,
      },
      {
        code: `
          function increment() {
            let value = 1;
            if (true) {
              value = 2;
            }
          }
        `,
      },
      {
        code: `
          function increment(items: Array<number>) {
            let value = 1;
            value += items.length;
          }
        `,
      },
      {
        code: `
          const increment = () => {
            const state = new Map<string, number>();
            state.set('count', 1);
            state.clear();
          };
        `,
      },
      {
        code: `
          function inspect(input: ReadonlyMap<string, number>, values: ReadonlyArray<string>) {
            input.get('count');
            input.has('count');
            const test = values.toString();
            test.includes('x');
          }
        `,
      },
    ],
    invalid: [
      {
        code: `
          let count = 0;
          function increment() {
            count = count + 1;
          }
        `,
        errors: [{ messageId: 'noExternalBindingMutation', data: { name: 'count' } }],
      },
      {
        code: `
          function increment(count: number) {
            count++;
          }
        `,
        errors: [{ messageId: 'noExternalBindingMutation', data: { name: 'count' } }],
      },
      {
        code: `
          const cache = new Map<string, number>();
          function read() {
            cache.set('count', 1);
          }
        `,
        errors: [{ messageId: 'noExternalBindingCallRequiresReadonly', data: { name: 'cache' } }],
      },
      {
        code: `
          function save(target: Map<string, number>) {
            target.clear();
          }
        `,
        errors: [{ messageId: 'noExternalBindingCallRequiresReadonly', data: { name: 'target' } }],
      },
      {
        code: `
          const counter = { count: 0 };
          function update() {
            counter.increment();
          }
        `,
        errors: [{ messageId: 'noExternalBindingCallRequiresReadonly', data: { name: 'counter' } }],
      },
      {
        code: `
          function inspect(values: Array<string>) {
            values.includes('x');
          }
        `,
        errors: [{ messageId: 'noExternalBindingCallRequiresReadonly', data: { name: 'values' } }],
      },
    ],
  });
});
