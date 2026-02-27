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
      languageOptions?: {
        parser?: unknown;
        parserOptions?: {
          projectService?: boolean;
          tsconfigRootDir?: string;
        };
      };
      rules?: Record<string, unknown>;
    }>;
    const reactHooksConfig = reactConfigList[0];
    const noEffectConfig = reactConfigList[1];
    const reactConfig = reactConfigList[2];

    expect(reactConfigList.length).toBeGreaterThanOrEqual(3);
    expect(reactHooksConfig.rules).toBeDefined();
    expect(reactHooksConfig.rules?.['react-hooks/rules-of-hooks']).toBe('error');
    expect(reactHooksConfig.rules?.['react-hooks/exhaustive-deps']).toBe('warn');
    expect(noEffectConfig.rules).toBeDefined();
    expect(
      Object.keys(noEffectConfig.rules ?? {}).some((ruleName) =>
        ruleName.startsWith('react-you-might-not-need-an-effect/'),
      ),
    ).toBe(true);
    expect(reactConfig.rules).toBeDefined();
    expect(reactConfig.plugins?.react).toBeDefined();
    expect(reactConfig.plugins?.['@typescript-eslint']).toBeDefined();
    expect(reactConfig.languageOptions?.parser).toBeDefined();
    expect(reactConfig.languageOptions?.parserOptions?.projectService).toBe(true);
    expect(reactConfig.languageOptions?.parserOptions?.tsconfigRootDir).toBe(process.cwd());
    expect(reactConfig.rules?.['react/jsx-handler-names']).toBeDefined();
    expect(reactConfig.rules?.['react/jsx-no-constructed-context-values']).toBe('error');
    expect(reactConfig.rules?.['react/jsx-no-useless-fragment']).toBe('error');
    expect(reactConfig.rules?.['react/jsx-pascal-case']).toBe('error');
    expect(reactConfig.rules?.['react/no-unstable-nested-components']).toBe('error');
    expect(reactConfig.rules?.['@typescript-eslint/no-floating-promises']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-title-case-props']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-custom-kebab-case-props']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-set-prefix-utils']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-useless-hook']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-hook-jsx']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-exported-context-hooks']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-handler-return-type']).toBe('error');
    expect(reactConfig.rules?.['sweepit/jsx-server-action-prop-suffix']).toBe('error');
    expect(reactConfig.rules?.['sweepit/jsx-on-handler-verb-suffix']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-render-helper-functions']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-element-props']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-componenttype-props']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-object-props']).toEqual([
      'error',
      {
        ignore: ['ref'],
      },
    ]);
    expect(reactConfig.rules?.['sweepit/no-array-props']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-prefixed-prop-bundles']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-optional-props-without-defaults']).toEqual([
      'error',
      {
        ignore: ['on*', 'ref', 'render'],
      },
    ]);
    expect(reactConfig.rules?.['sweepit/no-boolean-capability-props']).toEqual([
      'error',
      {
        ignore: ['asChild'],
        ignoreNativeBooleanProps: true,
      },
    ]);
    expect(reactConfig.rules?.['sweepit/max-custom-props']).toBe('error');
    expect(reactConfig.rules?.['sweepit/jsx-bem-compound-naming']).toBe('error');
    expect(reactConfig.rules?.['sweepit/jsx-compound-part-export-naming']).toBe('error');
    expect(reactConfig.rules?.['sweepit/no-prop-drilling']).toEqual([
      'error',
      {
        allowedDepth: 1,
        ignorePropsSpread: true,
      },
    ]);
    expect(reactConfig.rules?.['sweepit/jsx-flat-owner-tree']).toBe('error');
  });
});
