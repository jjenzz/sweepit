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

const STATEMENT_CHILD_KEYS: Record<string, string[]> = {
  BlockStatement: ['body'],
  IfStatement: ['test', 'consequent', 'alternate'],
  ForStatement: ['init', 'test', 'update', 'body'],
  ForInStatement: ['left', 'right', 'body'],
  ForOfStatement: ['left', 'right', 'body'],
  WhileStatement: ['test', 'body'],
  DoWhileStatement: ['body', 'test'],
  SwitchStatement: ['discriminant', 'cases'],
  SwitchCase: ['test', 'consequent'],
  TryStatement: ['block', 'handler', 'finalizer'],
  CatchClause: ['param', 'body'],
  ReturnStatement: ['argument'],
  ExpressionStatement: ['expression'],
  VariableDeclaration: ['declarations'],
};

function* traverseStatements(node: Rule.Node | null | undefined): Generator<Rule.Node> {
  if (!node || typeof node !== 'object') return;
  const stack: Rule.Node[] = [node];
  const seen = new WeakSet<object>();
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (seen.has(current as object)) continue;
    seen.add(current as object);
    yield current;
    const keys = STATEMENT_CHILD_KEYS[(current as { type?: string }).type ?? ''] ?? [];
    const n = current as unknown as Record<string, unknown>;
    for (const key of keys) {
      const val = n[key];
      if (val && typeof val === 'object') {
        if (Array.isArray(val)) {
          for (let i = val.length - 1; i >= 0; i--) {
            const child = val[i];
            if (child && typeof child === 'object' && 'type' in child) {
              stack.push(child as Rule.Node);
            }
          }
        } else if ('type' in (val as object)) {
          stack.push(val as Rule.Node);
        }
      }
    }
  }
}

/** Heuristic: does the function body return JSX? */
function functionReturnsJSX(body: Rule.Node | null | undefined): boolean {
  if (!body) return false;
  const b = body as { type?: string };
  if (b.type === 'JSXElement' || b.type === 'JSXFragment') {
    return true;
  }
  if (b.type === 'BlockStatement') {
    for (const child of traverseStatements(body)) {
      const s = child as { type?: string; argument?: Rule.Node };
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
      url: 'https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-render-helper-functions.md',
    },
    messages: {
      noRenderHelperFunctions:
        "Function '{{name}}' returns JSX but is not PascalCase. Create a component instead.",
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
