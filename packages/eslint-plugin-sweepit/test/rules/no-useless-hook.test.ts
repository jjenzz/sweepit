import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/no-useless-hook';
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

describe('no-useless-hook', () => {
  ruleTester.run('no-useless-hook', rule, {
    valid: [
      "import { useState } from 'react'; function useCount() { const [c, setC] = useState(0); return c; }",
      "import { useEffect } from 'react'; function useFetch() { useEffect(() => {}, []); return null; }",
      "import { useRef } from 'react'; function useRefValue() { const r = useRef(0); return r; }",
      "import { useContext } from 'react'; function useCtx() { return useContext(X); }",
      "import { useReducer } from 'react'; function useR() { const [s, d] = useReducer(f, 0); return s; }",
      'function formatDate(d: Date) { return d.toISOString(); }',
      "const getUser = () => fetch('/user');",
    ],
    invalid: [
      {
        code: 'function useUser() { return fetchUser(); }',
        errors: [
          {
            messageId: 'noUselessHook',
            data: { name: 'useUser' },
          },
        ],
      },
      {
        code: 'const useFormatDate = (d: Date) => d.toISOString();',
        errors: [
          {
            messageId: 'noUselessHook',
            data: { name: 'useFormatDate' },
          },
        ],
      },
      {
        code: "function useConfig() { return { theme: 'dark' }; }",
        errors: [
          {
            messageId: 'noUselessHook',
            data: { name: 'useConfig' },
          },
        ],
      },
      {
        code: 'const useData = function () { return 42; };',
        errors: [
          {
            messageId: 'noUselessHook',
            data: { name: 'useData' },
          },
        ],
      },
    ],
  });
});
