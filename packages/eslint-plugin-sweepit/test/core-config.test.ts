import { describe, expect, it } from 'vitest';
import plugin from '../src/index';

describe('plugin:sweepit/core', () => {
  it('exports a core config', () => {
    expect(plugin.configs).toBeDefined();
    expect(plugin.configs?.core).toBeDefined();
    expect(Array.isArray(plugin.configs?.core)).toBe(true);
  });

  it('enables core baseline rules', () => {
    const coreConfigList = plugin.configs?.core as Array<{
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

    const coreConfig = coreConfigList[coreConfigList.length - 1];
    const hasTsEslintRecommended = coreConfigList.some((config) => {
      return config.rules?.['@typescript-eslint/ban-ts-comment'] === 'error';
    });
    const hasNoFloatingPromises = coreConfigList.some((config) => {
      return config.rules?.['@typescript-eslint/no-floating-promises'] === 'error';
    });

    expect(coreConfigList.length).toBeGreaterThanOrEqual(1);
    expect(hasTsEslintRecommended).toBe(true);
    expect(hasNoFloatingPromises).toBe(true);
    expect(coreConfig.plugins?.functional).toBeDefined();
    expect(coreConfig.plugins?.['@typescript-eslint']).toBeDefined();
    expect(coreConfig.languageOptions?.parser).toBeDefined();
    expect(coreConfig.languageOptions?.parserOptions?.projectService).toBe(true);
    expect(coreConfig.languageOptions?.parserOptions?.tsconfigRootDir).toBe(process.cwd());
    expect(coreConfig.rules?.['functional/immutable-data']).toEqual([
      'error',
      {
        ignoreClasses: true,
        ignoreAccessorPattern: ['*.displayName', '*.current'],
        ignoreMapsAndSets: true,
        ignoreNonConstDeclarations: {
          treatParametersAsConst: true,
        },
      },
    ]);
    expect(coreConfig.rules?.['no-param-reassign']).toEqual(['error', { props: true }]);
    expect(coreConfig.rules?.['max-params']).toEqual(['error', { max: 4 }]);
    expect(coreConfig.rules?.['prefer-const']).toBe('error');
    expect(coreConfig.rules?.['@typescript-eslint/switch-exhaustiveness-check']).toBe('error');
    expect(coreConfig.plugins?.sweepit).toBeDefined();
    expect(coreConfig.rules?.['sweepit/no-external-binding-mutation']).toBe('error');
    expect(coreConfig.rules?.['sweepit/complexity']).toEqual([
      'error',
      { max: 10, variant: 'modified' },
    ]);
    expect(coreConfig.rules?.['sweepit/no-inline-call-expressions']).toEqual([
      'error',
      {
        contexts: ['for-header', 'call-arg'],
        allowCallPatterns: ['*.entries', '*.values', '*.keys'],
      },
    ]);
  });
});
