import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/no-set-prefix-utils';
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

describe('no-set-prefix-utils', () => {
  ruleTester.run('no-set-prefix-utils', rule, {
    valid: [
      "import { useState } from 'react'; const [count, setCount] = useState(0);",
      "import { useState } from 'react'; const [user, setUser] = useState(null);",
      'function updateUser(u: User) {}',
      'const applyPrefix = (s: string) => s;',
    ],
    invalid: [
      {
        code: 'function setUserActive(user: User) {}',
        errors: [
          {
            messageId: 'noSetPrefixUtil',
            data: { name: 'setUserActive' },
          },
        ],
      },
      {
        code: 'const setPrefix = (str: string) => str.toUpperCase();',
        errors: [
          {
            messageId: 'noSetPrefixUtil',
            data: { name: 'setPrefix' },
          },
        ],
      },
      {
        code: 'const setFormData = function (data: FormData) {};',
        errors: [
          {
            messageId: 'noSetPrefixUtil',
            data: { name: 'setFormData' },
          },
        ],
      },
    ],
  });
});
