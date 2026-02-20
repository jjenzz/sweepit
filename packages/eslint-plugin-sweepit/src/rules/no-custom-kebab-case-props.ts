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

const ALLOWED_KEBAB_PREFIXES = ['aria-', 'data-'];

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

function isAllowedKebabProp(name: string): boolean {
  return ALLOWED_KEBAB_PREFIXES.some((prefix) => name.startsWith(prefix));
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow custom kebab-case JSX props (allows aria-* and data-*)',
    },
    messages: {
      noCustomKebab:
        "Custom kebab-case prop '{{prop}}' is not allowed. Use camelCase, or use aria-* / data-* for native HTML attributes.",
    },
    schema: [],
  },
  create(context) {
    return {
      JSXAttribute(node: Rule.Node) {
        const attrName = (node as unknown as { name: JSXIdentifier | JSXNamespacedName }).name;
        const propName = getPropName(attrName);
        if (!propName || !isKebabCase(propName)) return;
        if (isAllowedKebabProp(propName)) return;

        context.report({
          node: (node as unknown as { name: JSXIdentifier | JSXNamespacedName }).name,
          messageId: 'noCustomKebab',
          data: { prop: propName },
        });
      },
    };
  },
};

export default rule;
