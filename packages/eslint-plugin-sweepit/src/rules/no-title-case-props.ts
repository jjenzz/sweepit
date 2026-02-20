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

function getPropName(node: JSXIdentifier | JSXNamespacedName): string | null {
  if (node.type === 'JSXIdentifier') {
    return node.name;
  }
  if (node.type === 'JSXNamespacedName') {
    return `${node.namespace.name}:${node.name.name}`;
  }
  return null;
}

function isTitleCase(name: string): boolean {
  if (name.length === 0) return false;
  const first = name[0];
  return first >= 'A' && first <= 'Z';
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow TitleCase JSX props',
    },
    messages: {
      noTitleCase: "Prop '{{prop}}' uses TitleCase. Use camelCase instead (e.g. {{suggestion}}).",
    },
    schema: [],
  },
  create(context) {
    return {
      JSXAttribute(node: Rule.Node) {
        const attrName = (node as unknown as { name: JSXIdentifier | JSXNamespacedName }).name;
        const propName = getPropName(attrName);
        if (!propName || !isTitleCase(propName)) return;

        const suggestion =
          propName.length > 1
            ? propName[0].toLowerCase() + propName.slice(1)
            : propName.toLowerCase();

        context.report({
          node: (node as unknown as { name: JSXIdentifier | JSXNamespacedName }).name,
          messageId: 'noTitleCase',
          data: { prop: propName, suggestion },
        });
      },
    };
  },
};

export default rule;
