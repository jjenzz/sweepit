import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { fileURLToPath } from 'node:url';
import rule from '../../src/rules/no-inline-call-expressions';

const tsconfigRootDir = fileURLToPath(new URL('../../', import.meta.url));

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      projectService: {
        allowDefaultProject: ['estree.ts', 'estree.tsx'],
      },
      tsconfigRootDir,
    },
  },
});

describe('no-inline-call-expressions', () => {
  ruleTester.run('no-inline-call-expressions', rule, {
    valid: [
      `
      const reports = getReports();
      for (const report of reports) {
        consume(report);
      }
      `,
      `
      const result = buildResult();
      handle(result);
      `,
      `
      for (const entry of Object.entries(record)) {
        consume(entry);
      }
      `,
      {
        code: `
        for (const entry of getEntries()) {
          consume(entry);
        }
        `,
        options: [{ contexts: ['call-arg'] }],
      },
      {
        code: `
        for (const key in source) {
          consume(key);
        }
        `,
        options: [{ contexts: ['for-header'] }],
      },
    ],
    invalid: [
      {
        code: `
        for (let index = 0; index < getLimit(); index += 1) {
          consume(index);
        }
        `,
        errors: [{ messageId: 'noCallInForHeader' }],
      },
      {
        code: `
        for (const report of getReports()) {
          consume(report);
        }
        `,
        options: [{ contexts: ['for-header'], allowCallPatterns: [] }],
        errors: [{ messageId: 'noCallInForHeader' }],
      },
      {
        code: `
        function createIterable(): Iterable<string> {
          return new Set(['value']);
        }
        for (const value of createIterable()) {
          consume(value);
        }
        `,
        errors: [{ messageId: 'noCallInForHeader' }],
      },
      {
        code: `
        function getItems(): string[] {
          return ['a', 'b'];
        }
        for (const item of getItems()) {
          consume(item);
        }
        `,
        errors: [{ messageId: 'noCallInForHeader' }],
      },
      {
        code: `
        consume(formatValue(input));
        `,
        errors: [{ messageId: 'noCallArg' }],
      },
      {
        code: `
        consume(buildValue(loadValue()));
        `,
        errors: [{ messageId: 'noCallArg' }, { messageId: 'noCallArg' }],
      },
    ],
  });
});
