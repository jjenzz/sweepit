import type { Rule } from 'eslint';

interface JSXIdentifier {
  type: 'JSXIdentifier';
  name: string;
}

interface JSXNamespacedName {
  type: 'JSXNamespacedName';
  namespace: JSXIdentifier;
  name: JSXIdentifier;
}

const DEFAULT_VERBS = [
  'abort',
  'access',
  'activate',
  'add',
  'blur',
  'cancel',
  'change',
  'clear',
  'click',
  'close',
  'collapse',
  'complete',
  'connect',
  'copy',
  'create',
  'deactivate',
  'delete',
  'disable',
  'dismiss',
  'drag',
  'drop',
  'edit',
  'enable',
  'end',
  'error',
  'expand',
  'finish',
  'focus',
  'generate',
  'get',
  'hide',
  'hover',
  'input',
  'install',
  'keydown',
  'keyup',
  'load',
  'mount',
  'move',
  'open',
  'paste',
  'pause',
  'persist',
  'play',
  'press',
  'progress',
  'query',
  'ready',
  'remove',
  'rename',
  'request',
  'reset',
  'resize',
  'retry',
  'revalidate',
  'revert',
  'save',
  'scroll',
  'seek',
  'select',
  'show',
  'skip',
  'start',
  'submit',
  'success',
  'track',
  'undo',
  'update',
  'upgrade',
  'upload',
  'validate',
  'wheel',
] as const;

interface RuleOptions {
  extendVerbs?: string[];
}

function mergeAllowedValues(defaults: readonly string[], configured?: string[]): string[] {
  const configuredValues = configured ?? [];
  const allValues = [...defaults, ...configuredValues];
  return [...new Set<string>(allValues.map(normalizeConfigValue).filter(Boolean))];
}

function normalizeConfigValue(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function getPropName(node: JSXIdentifier | JSXNamespacedName): string | null {
  if (node.type === 'JSXIdentifier') {
    return node.name;
  }
  if (node.type === 'JSXNamespacedName') {
    return `${node.namespace.name}:${node.name.name}`;
  }
  return null;
}

function isHandlerProp(name: string): boolean {
  if (!name.startsWith('on') || name.length <= 2) return false;
  const third = name[2];
  return third >= 'A' && third <= 'Z';
}

function hasVerbSuffix(rest: string, verbs: readonly string[]): boolean {
  const restLower = rest.toLowerCase();
  return verbs.some((verb) => restLower.endsWith(verb));
}

/**
 * Detects on{Verb}{Noun} and suggests on{Noun}{Verb} when possible.
 */
function getVerbSuffixSuggestion(propName: string, verbs: readonly string[]): string | null {
  if (!isHandlerProp(propName)) return null;

  const rest = propName.slice(2);
  const restLower = rest.toLowerCase();
  if (rest.length < 2) return null;

  if (hasVerbSuffix(rest, verbs)) return null;

  for (const verb of verbs) {
    if (!restLower.startsWith(verb)) continue;
    const verbOriginal = rest.slice(0, verb.length);
    const subject = rest.slice(verb.length);
    if (subject.length < 1) continue;
    if (subject[0] !== subject[0].toUpperCase()) continue;

    return `on${subject}${verbOriginal}`;
  }

  return null;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Ensure on* handler prop names end with a verb (for example onValueChange).',
      url: 'https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/jsx-on-handler-verb-suffix.md',
    },
    messages: {
      mustEndWithVerb:
        "Handler prop '{{prop}}' should end with a verb (for example 'onValueChange').",
      preferVerbSuffix:
        "Prefer '{{suggestion}}' over '{{prop}}' so the handler name ends with a verb.",
    },
    schema: [
      {
        type: 'object',
        properties: {
          extendVerbs: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context: Readonly<Rule.RuleContext>) {
    const options = (context.options[0] as RuleOptions | undefined) ?? {};
    const verbs = mergeAllowedValues(DEFAULT_VERBS, options.extendVerbs);
    const sortedVerbs = [...verbs].sort((a, b) => b.length - a.length);

    return {
      JSXAttribute(node: Rule.Node) {
        const attr = node as unknown as {
          name: JSXIdentifier | JSXNamespacedName;
        };
        const propName = getPropName(attr.name);
        if (!propName) return;
        if (!isHandlerProp(propName)) return;

        const rest = propName.slice(2);
        if (hasVerbSuffix(rest, sortedVerbs)) return;

        const suggestion = getVerbSuffixSuggestion(propName, sortedVerbs);

        context.report({
          node: attr.name,
          messageId: suggestion ? 'preferVerbSuffix' : 'mustEndWithVerb',
          data: suggestion ? { prop: propName, suggestion } : { prop: propName },
        });
      },
    };
  },
};

export default rule;
