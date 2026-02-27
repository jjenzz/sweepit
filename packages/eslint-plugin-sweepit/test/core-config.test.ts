import { describe, expect, it } from 'vitest';
import plugin from '../src/index';

describe('plugin:sweepit/core', () => {
  it('exports a core config', () => {
    expect(plugin.configs).toBeDefined();
    expect(plugin.configs?.core).toBeDefined();
    expect(Array.isArray(plugin.configs?.core)).toBe(true);
  });

  it('enables sonarjs recommended and core baseline rules', () => {
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

    const sonarConfig = coreConfigList[0];
    const coreConfig = coreConfigList[1];

    expect(coreConfigList.length).toBeGreaterThanOrEqual(2);
    expect(sonarConfig.plugins?.sonarjs).toBeDefined();
    expect(sonarConfig.rules).toBeDefined();
    expect(coreConfig.plugins?.functional).toBeDefined();
    expect(coreConfig.plugins?.['@typescript-eslint']).toBeDefined();
    expect(coreConfig.languageOptions?.parser).toBeDefined();
    expect(coreConfig.languageOptions?.parserOptions?.projectService).toBe(true);
    expect(coreConfig.languageOptions?.parserOptions?.tsconfigRootDir).toBe(process.cwd());
    expect(coreConfig.rules?.['functional/immutable-data']).toBe('error');
    expect(coreConfig.rules?.['no-param-reassign']).toEqual(['error', { props: true }]);
    expect(coreConfig.rules?.['prefer-const']).toBe('error');
    expect(coreConfig.rules?.['@typescript-eslint/switch-exhaustiveness-check']).toBe('error');
    expect(coreConfig.rules?.complexity).toEqual(['error', { max: 3, variant: 'modified' }]);
  });
});
