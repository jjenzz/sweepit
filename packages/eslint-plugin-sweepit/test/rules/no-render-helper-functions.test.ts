import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/no-render-helper-functions';
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

describe('no-render-helper-functions', () => {
  ruleTester.run('no-render-helper-functions', rule, {
    valid: [
      'function Header() { return <header>Title</header>; }',
      "const Layout = () => <div className='layout' />;",
      'function FormatLabel() { return <span><strong>Label</strong></span>; }',
      'const Card = () => <><div /></>;',
      'function useUser() { const [u, setU] = useState(null); return u; }',
      'const getData = () => ({ foo: 1 });',
      'function renderHelper() { return null; }',
      "const formatText = () => 'hello';",
    ],
    invalid: [
      {
        code: 'function renderHeader() { return <header>Title</header>; }',
        errors: [
          {
            messageId: 'noRenderHelperFunctions',
            data: { name: 'renderHeader' },
          },
        ],
      },
      {
        code: "const getLayout = () => <div className='layout' />;",
        errors: [
          {
            messageId: 'noRenderHelperFunctions',
            data: { name: 'getLayout' },
          },
        ],
      },
      {
        code: 'function formatLabel() { return <span><strong>Label</strong></span>; }',
        errors: [
          {
            messageId: 'noRenderHelperFunctions',
            data: { name: 'formatLabel' },
          },
        ],
      },
      {
        code: 'const makeCard = () => <><div /></>;',
        errors: [
          {
            messageId: 'noRenderHelperFunctions',
            data: { name: 'makeCard' },
          },
        ],
      },
      {
        code: 'const foo = () => (<div />);',
        errors: [
          {
            messageId: 'noRenderHelperFunctions',
            data: { name: 'foo' },
          },
        ],
      },
      {
        code: 'function renderItem() { return cond ? <A /> : <B />; }',
        errors: [
          {
            messageId: 'noRenderHelperFunctions',
            data: { name: 'renderItem' },
          },
        ],
      },
    ],
  });
});
