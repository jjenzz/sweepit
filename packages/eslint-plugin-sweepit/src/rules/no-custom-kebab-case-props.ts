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

const DEFAULT_ALLOWED_KEBAB_PREFIXES = ['aria-', 'data-'];

interface RuleOptions {
  extendPrefixes?: string[];
  allowedProps?: string[];
}

interface ResolvedRuleOptions {
  allowedPrefixes: string[];
  allowedProps: Set<string>;
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

function isKebabCase(name: string): boolean {
  return name.includes('-');
}

function kebabToCamelCase(name: string): string {
  const segments = name.split('-').filter(Boolean);
  if (segments.length === 0) return name;
  const first = segments[0] ?? '';
  const tail = segments
    .slice(1)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join('');
  return `${first}${tail}`;
}

function resolveRuleOptions(context: Rule.RuleContext): ResolvedRuleOptions {
  const option = (context.options[0] as RuleOptions | undefined) ?? {};
  const allowedPrefixes = Array.from(
    new Set([...DEFAULT_ALLOWED_KEBAB_PREFIXES, ...(option.extendPrefixes ?? [])]),
  );
  const allowedProps = new Set(option.allowedProps ?? []);

  return {
    allowedPrefixes,
    allowedProps,
  };
}

function isAllowedKebabProp(name: string, options: ResolvedRuleOptions): boolean {
  if (options.allowedProps.has(name)) return true;
  return options.allowedPrefixes.some((prefix) => name.startsWith(prefix));
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow custom kebab-case JSX props (allows aria-* and data-* by default with configurable additions)',
      url: 'https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-custom-kebab-case-props.md',
    },
    messages: {
      noCustomKebab: "Custom kebab-case prop '{{prop}}' is not allowed. Use '{{suggestion}}').",
    },
    schema: [
      {
        type: 'object',
        properties: {
          extendPrefixes: {
            type: 'array',
            items: { type: 'string' },
          },
          allowedProps: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = resolveRuleOptions(context);

    return {
      JSXAttribute(node: Rule.Node) {
        const attrName = (node as unknown as { name: JSXIdentifier | JSXNamespacedName }).name;
        const propName = getPropName(attrName);
        if (!propName || !isKebabCase(propName)) return;
        if (isAllowedKebabProp(propName, options)) return;

        context.report({
          node: (node as unknown as { name: JSXIdentifier | JSXNamespacedName }).name,
          messageId: 'noCustomKebab',
          data: { prop: propName, suggestion: kebabToCamelCase(propName) },
        });
      },
    };
  },
};

export default rule;
