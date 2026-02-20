import type { Rule } from 'eslint';

function isPascalCase(name: string): boolean {
  if (!name || name.length === 0) return false;
  return /^[A-Z][a-zA-Z0-9]*$/.test(name);
}

/** Heuristic: does this expression yield JSX? */
function expressionReturnsJSX(node: Rule.Node | null | undefined): boolean {
  if (!node) return false;
  const n = node as {
    type?: string;
    expression?: Rule.Node;
    consequent?: Rule.Node;
    alternate?: Rule.Node;
    left?: Rule.Node;
    right?: Rule.Node;
  };
  const t = n.type;
  if (t === 'JSXElement' || t === 'JSXFragment') return true;
  if (t === 'ParenthesizedExpression') {
    return expressionReturnsJSX(n.expression);
  }
  if (t === 'ConditionalExpression') {
    return expressionReturnsJSX(n.consequent) || expressionReturnsJSX(n.alternate);
  }
  if (t === 'LogicalExpression') {
    return expressionReturnsJSX(n.left) || expressionReturnsJSX(n.right);
  }
  return false;
}

/** Heuristic: does the function body return JSX? */
function functionReturnsJSX(body: Rule.Node | null | undefined): boolean {
  if (!body) return false;
  const b = body as { type?: string; body?: Rule.Node[] };
  if (b.type === 'JSXElement' || b.type === 'JSXFragment') {
    return true;
  }
  if (b.type === 'BlockStatement') {
    for (const stmt of b.body ?? []) {
      const s = stmt as { type?: string; argument?: Rule.Node };
      if (s.type === 'ReturnStatement' && s.argument) {
        if (expressionReturnsJSX(s.argument)) return true;
      }
    }
  }
  return false;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Forbid JSX returned from non-component functions. Functions that return JSX should use PascalCase names.',
    },
    messages: {
      noRenderHelperFunctions:
        "Function '{{name}}' returns JSX but is not PascalCase. Use a component name (PascalCase) or move the JSX elsewhere.",
    },
    schema: [],
  },
  create(context) {
    function checkFunction(
      name: string,
      body: Rule.Node | null | undefined,
      reportNode: Rule.Node,
    ) {
      if (isPascalCase(name)) return;
      if (!functionReturnsJSX(body)) return;
      context.report({
        node: reportNode,
        messageId: 'noRenderHelperFunctions',
        data: { name },
      });
    }

    return {
      FunctionDeclaration(node: Rule.Node) {
        const fn = node as unknown as {
          id: { name: string } | null;
          body: Rule.Node;
        };
        if (!fn.id) return;
        checkFunction(fn.id.name, fn.body, fn.id as Rule.Node);
      },
      VariableDeclarator(node: Rule.Node) {
        const decl = node as unknown as {
          id: Rule.Node;
          init: Rule.Node | null | undefined;
        };
        const { id, init } = decl;
        if (id.type !== 'Identifier') return;
        const name = (id as unknown as { name: string }).name;
        if (init?.type !== 'ArrowFunctionExpression' && init?.type !== 'FunctionExpression') {
          return;
        }
        const body = (init as unknown as { body: Rule.Node }).body;
        checkFunction(name, body, id);
      },
    };
  },
};

export default rule;
