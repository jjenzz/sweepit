import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/no-handle-prefix-utils';
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

describe('no-handle-prefix-utils', () => {
  ruleTester.run('no-handle-prefix-utils', rule, {
    valid: [
      'function formatDate(date: Date) { return String(date); }',
      'const applyFilter = () => true;',
      'function handleClick() {}; <button onClick={handleClick} />;',
      'const handleClick = () => {}; <button onClick={handleClick} />;',
      'const handleClick = (event: MouseEvent) => {}; <button onClick={(event) => handleClick(event)} />;',
      'const handleSubmit = () => {}; <Form onSubmit={handleSubmit} />;',
      "import { useCallback } from 'react'; const handleClick = useCallback(() => {}, []); <button onClick={handleClick} />;",
      'const handleClick = () => {}; <button {...{ onClick: handleClick }} />;',
    ],
    invalid: [
      {
        code: 'function handleFormatDate(date: Date) { return String(date); }',
        errors: [
          {
            messageId: 'noHandlePrefixUtil',
            data: { name: 'handleFormatDate' },
          },
        ],
      },
      {
        code: 'const handleFormatDate = (date: Date) => String(date);',
        errors: [
          {
            messageId: 'noHandlePrefixUtil',
            data: { name: 'handleFormatDate' },
          },
        ],
      },
      {
        code: 'const handleClick = () => {}; <button foo={handleClick} />;',
        errors: [
          {
            messageId: 'noHandlePrefixUtil',
            data: { name: 'handleClick' },
          },
        ],
      },
      {
        code: "import { useCallback } from 'react'; const handleClick = useCallback(() => {}, []); <button foo={handleClick} />;",
        errors: [
          {
            messageId: 'noHandlePrefixUtil',
            data: { name: 'handleClick' },
          },
        ],
      },
    ],
  });
});
