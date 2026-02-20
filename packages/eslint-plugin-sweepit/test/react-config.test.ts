import { describe, expect, it } from 'vitest';
import plugin from '../src/index';

describe('plugin:sweepit/react', () => {
  it('exports a react config', () => {
    expect(plugin.configs).toBeDefined();
    expect(plugin.configs?.react).toBeDefined();
    expect(Array.isArray(plugin.configs?.react)).toBe(true);
  });

  it('enables the expected third-party rule set', () => {
    const reactConfigList = plugin.configs?.react as Array<{
      plugins?: Record<string, unknown>;
      languageOptions?: { parser?: unknown };
      rules?: Record<string, unknown>;
    }>;
    const reactConfig = reactConfigList[0];

    expect(reactConfig.rules).toBeDefined();
    expect(reactConfig.plugins?.react).toBeDefined();
    expect(reactConfig.plugins?.['react-hooks']).toBeDefined();
    expect(reactConfig.plugins?.['@typescript-eslint']).toBeDefined();
    expect(reactConfig.languageOptions?.parser).toBeDefined();
    expect(reactConfig.rules?.['react/jsx-handler-names']).toBeDefined();
    expect(reactConfig.rules?.['react/jsx-no-constructed-context-values']).toBe('error');
    expect(reactConfig.rules?.['react/jsx-no-useless-fragment']).toBe('error');
    expect(reactConfig.rules?.['react/jsx-pascal-case']).toBe('error');
    expect(reactConfig.rules?.['react/no-unstable-nested-components']).toBe('error');
    expect(reactConfig.rules?.['react-hooks/rules-of-hooks']).toBe('error');
    expect(reactConfig.rules?.['react-hooks/exhaustive-deps']).toBe('error');
    expect(reactConfig.rules?.['react-you-might-not-need-an-effect/no-effect']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-title-case-props']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-custom-kebab-case-props']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-set-prefix-utils']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-useless-hook']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-hook-jsx']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-exported-context-hooks']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-handler-return-type']).toBe('error');
    expect(reactConfig.rules?.['sweepit/jsx-server-action-prop-suffix']).toBe('error');
    expect(reactConfig.rules?.['sweepit/jsx-on-noun-verb-handler-props']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-render-helper-functions']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-element-props']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-componenttype-props']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-object-props']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-array-props']).toBe('error');
    expect(reactConfig.rules?.['sweepit/jsx-bem-compound-naming']).toBe('error');
    expect(reactConfig.rules?.['sweepit/jsx-compound-part-export-naming']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-pass-through-props']).toBe('error');
    expect(reactConfig.rules?.['sweepit/jsx-flat-owner-tree']).toBe('error');
  });
});
