import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/no-prefixed-prop-bundles';
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

describe('no-prefixed-prop-bundles', () => {
  ruleTester.run('no-prefixed-prop-bundles', rule, {
    valid: [
      '<UserRow name={user.name} email={user.email} />',
      '<UserRow userName={user.name} userEmail={user.email} />',
      '<Dialog onOpen={handleOpen} onClose={handleClose} onChange={handleChange} />',
      '<Comp dataState={state} dataKind={kind} dataMode={mode} />',
      '<Comp isOpen={open} isLoading={loading} isDisabled={disabled} />',
      {
        code: '<UserRow userName={user.name} userEmail={user.email} />',
        options: [{ threshold: 4 }],
      },
    ],
    invalid: [
      {
        code: '<UserRow userName={user.name} userEmail={user.email} userAvatarUrl={user.avatarUrl} />',
        errors: [
          {
            messageId: 'noPrefixedPropBundle',
            data: { prop: 'userName', prefix: 'user', count: '3' },
          },
          {
            messageId: 'noPrefixedPropBundle',
            data: { prop: 'userEmail', prefix: 'user', count: '3' },
          },
          {
            messageId: 'noPrefixedPropBundle',
            data: { prop: 'userAvatarUrl', prefix: 'user', count: '3' },
          },
        ],
      },
      {
        code: '<Card orderId={order.id} orderStatus={order.status} orderTotal={order.total} />',
        errors: [
          {
            messageId: 'noPrefixedPropBundle',
            data: { prop: 'orderId', prefix: 'order', count: '3' },
          },
          {
            messageId: 'noPrefixedPropBundle',
            data: { prop: 'orderStatus', prefix: 'order', count: '3' },
          },
          {
            messageId: 'noPrefixedPropBundle',
            data: { prop: 'orderTotal', prefix: 'order', count: '3' },
          },
        ],
      },
      {
        code: '<UserRow userName={user.name} userEmail={user.email} />',
        options: [{ threshold: 2 }],
        errors: [
          {
            messageId: 'noPrefixedPropBundle',
            data: { prop: 'userName', prefix: 'user', count: '2' },
          },
          {
            messageId: 'noPrefixedPropBundle',
            data: { prop: 'userEmail', prefix: 'user', count: '2' },
          },
        ],
      },
      {
        code: '<Card className={rootClass} classHeader={headerClass} classBody={bodyClass} />',
        errors: [
          {
            messageId: 'noPrefixedPropBundle',
            data: { prop: 'className', prefix: 'class', count: '3' },
          },
          {
            messageId: 'noPrefixedPropBundle',
            data: { prop: 'classHeader', prefix: 'class', count: '3' },
          },
          {
            messageId: 'noPrefixedPropBundle',
            data: { prop: 'classBody', prefix: 'class', count: '3' },
          },
        ],
      },
    ],
  });
});
