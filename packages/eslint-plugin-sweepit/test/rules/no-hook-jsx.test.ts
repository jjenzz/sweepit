import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/no-hook-jsx';
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

describe('no-hook-jsx', () => {
  ruleTester.run('no-hook-jsx', rule, {
    valid: [
      'function useUser() { const [u, setU] = useState(null); return u; }',
      'const useToggle = (init: boolean) => { const [on, setOn] = useState(init); return [on, () => setOn(v => !v)]; };',
      'function useOuter() { function Inner() { return <div />; } return null; }',
      'function useOuter() { const Inner = () => <div />; return null; }',
      'function useData() { return { items: [], count: 0 }; }',
      'function useItems() { return [1, 2, 3]; }',
      'function Header() { return <header>Title</header>; }',
      'const Layout = () => <div />;',
    ],
    invalid: [
      {
        code: 'function useHeader() { return <header>Title</header>; }',
        errors: [
          {
            messageId: 'noHookJsx',
            data: { name: 'useHeader' },
          },
        ],
      },
      {
        code: "const useLayout = () => <div className='layout' />;",
        errors: [
          {
            messageId: 'noHookJsx',
            data: { name: 'useLayout' },
          },
        ],
      },
      {
        code: 'function useCard() { return <div><span>Card</span></div>; }',
        errors: [
          {
            messageId: 'noHookJsx',
            data: { name: 'useCard' },
          },
        ],
      },
      {
        code: 'const useFragment = () => <><div /></>;',
        errors: [
          {
            messageId: 'noHookJsx',
            data: { name: 'useFragment' },
          },
        ],
      },
      {
        code: 'function useList() { return { List: <ul></ul> }; }',
        errors: [
          {
            messageId: 'noHookJsx',
            data: { name: 'useList' },
          },
        ],
      },
      {
        code: 'const useItems = () => ({ Item: <li /> });',
        errors: [
          {
            messageId: 'noHookJsx',
            data: { name: 'useItems' },
          },
        ],
      },
      {
        code: "function useArray() { return [<div key='a' />, <span key='b' />]; }",
        errors: [
          {
            messageId: 'noHookJsx',
            data: { name: 'useArray' },
          },
        ],
      },
      {
        code: 'const useCond = (x: boolean) => x ? <div /> : null;',
        errors: [
          {
            messageId: 'noHookJsx',
            data: { name: 'useCond' },
          },
        ],
      },
      {
        code: 'function useLogical() { return cond && <span />; }',
        errors: [
          {
            messageId: 'noHookJsx',
            data: { name: 'useLogical' },
          },
        ],
      },
      {
        code: 'const useInline = () => () => <div />;',
        errors: [
          {
            messageId: 'noHookJsx',
            data: { name: 'useInline' },
          },
        ],
      },
    ],
  });
});
