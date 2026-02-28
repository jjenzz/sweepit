import type { Rule } from 'eslint';

const SET_PREFIX = 'set';

function startsWithSet(name: string): boolean {
  return name.startsWith(SET_PREFIX) && name.length > SET_PREFIX.length;
}

function isUseStateCall(node: Rule.Node | null | undefined): boolean {
  if (!node || node.type !== 'CallExpression') return false;
  const call = node as unknown as { callee: Rule.Node };
  const callee = call.callee;
  if (callee.type === 'Identifier') {
    return (callee as unknown as { name: string }).name === 'useState';
  }
  if (callee.type === 'MemberExpression') {
    const mem = callee as unknown as {
      object: { type: string; name?: string };
      property: { type: string; name?: string };
    };
    return mem.property.type === 'Identifier' && mem.property.name === 'useState';
  }
  return false;
}

function isFunctionInit(node: Rule.Node | null | undefined): boolean {
  if (!node) return false;
  return node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression';
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Forbid util/helper functions prefixed with set*; allow React state setter identifiers from useState tuple destructuring',
      url: 'https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-set-prefix-utils.md',
    },
    messages: {
      noSetPrefixUtil:
        "Util/helper function '{{name}}' should not use set*. Reserve set* for React useState setters.",
    },
    schema: [],
  },
  create(context) {
    return {
      FunctionDeclaration(node: Rule.Node) {
        const fn = node as unknown as { id: (Rule.Node & { name: string }) | null };
        if (!fn.id || !startsWithSet(fn.id.name)) return;
        context.report({
          node: fn.id as Rule.Node,
          messageId: 'noSetPrefixUtil',
          data: { name: fn.id.name },
        });
      },
      VariableDeclarator(node: Rule.Node) {
        const decl = node as unknown as {
          id: Rule.Node;
          init: Rule.Node | null | undefined;
        };
        const { id, init } = decl;

        if (id.type === 'ArrayPattern') {
          const arr = id as unknown as { elements: Rule.Node[] };
          if (
            arr.elements.length >= 2 &&
            arr.elements[1]?.type === 'Identifier' &&
            isUseStateCall(init)
          ) {
            return;
          }
        }

        if (
          id.type === 'Identifier' &&
          startsWithSet((id as unknown as { name: string }).name) &&
          isFunctionInit(init)
        ) {
          context.report({
            node: id,
            messageId: 'noSetPrefixUtil',
            data: { name: (id as unknown as { name: string }).name },
          });
        }
      },
    };
  },
};

export default rule;
