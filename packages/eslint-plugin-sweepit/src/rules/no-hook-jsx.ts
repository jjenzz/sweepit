import type { Rule } from 'eslint';

function isUseName(name: string): boolean {
  return name.startsWith('use') && name.length > 3;
}

function isJSXNode(node: Rule.Node | null | undefined): boolean {
  if (!node) return false;
  const type = (node as { type?: string }).type;
  return type === 'JSXElement' || type === 'JSXFragment';
}

const CHILD_KEYS: Record<string, string[]> = {
  Program: ['body'],
  BlockStatement: ['body'],
  ReturnStatement: ['argument'],
  VariableDeclarator: ['id', 'init'],
  ExpressionStatement: ['expression'],
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
  // Expression nodes that may contain nested JSX
  ArrowFunctionExpression: ['params', 'body'],
  FunctionExpression: ['params', 'body'],
  ObjectExpression: ['properties'],
  Property: ['key', 'value'],
  ArrayExpression: ['elements'],
  ConditionalExpression: ['test', 'consequent', 'alternate'],
  LogicalExpression: ['left', 'right'],
  CallExpression: ['callee', 'arguments'],
  SequenceExpression: ['expressions'],
  SpreadElement: ['argument'],
  MemberExpression: ['object', 'property'],
  JSXElement: ['openingElement', 'closingElement', 'children'],
  JSXFragment: ['openingFragment', 'closingFragment', 'children'],
};

const STATEMENT_CHILD_KEYS: Record<string, string[]> = {
  ...CHILD_KEYS,
  // Do not descend into nested function bodies when finding ReturnStatements
  FunctionDeclaration: ['params'],
  FunctionExpression: ['params'],
  ArrowFunctionExpression: ['params'],
};

function* traverse(
  node: Rule.Node | null | undefined,
  opts?: { skipFunctionBodies?: boolean },
): Generator<Rule.Node> {
  if (!node || typeof node !== 'object') return;
  const keysMap = opts?.skipFunctionBodies ? STATEMENT_CHILD_KEYS : CHILD_KEYS;
  const stack: Rule.Node[] = [node];
  const seen = new WeakSet<object>();
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || seen.has(current as object)) continue;
    seen.add(current as object);
    yield current;
    const keys = keysMap[(current as { type?: string }).type ?? ''] ?? [];
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

function containsJSX(node: Rule.Node | null | undefined): boolean {
  for (const n of traverse(node)) {
    if (isJSXNode(n)) return true;
  }
  return false;
}

function returnsJSX(body: Rule.Node | null | undefined): boolean {
  if (!body) return false;
  const b = body as { type?: string; argument?: Rule.Node };
  if (b.type === 'JSXElement' || b.type === 'JSXFragment') {
    return true;
  }
  if (b.type === 'BlockStatement') {
    const block = body as unknown as { body?: Rule.Node[] };
    for (const statement of block.body ?? []) {
      for (const child of traverse(statement, {
        skipFunctionBodies: true,
      })) {
        const c = child as { type?: string; argument?: Rule.Node };
        if (c.type === 'ReturnStatement' && c.argument) {
          if (containsJSX(c.argument)) return true;
        }
      }
    }
    return false;
  }
  // Arrow with expression body (e.g. () => expr)
  return containsJSX(body);
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow use* functions that return JSX. Hooks should return values, not components.',
    },
    messages: {
      noHookJsx:
        "Function '{{name}}' is named like a hook but returns JSX. Hooks should return data, not render. Use a component instead.",
    },
    schema: [],
  },
  create(context) {
    function checkHookLikeFunction(
      name: string,
      body: Rule.Node | null | undefined,
      reportNode: Rule.Node,
    ) {
      if (!isUseName(name)) return;
      if (!returnsJSX(body)) return;
      context.report({
        node: reportNode,
        messageId: 'noHookJsx',
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
        checkHookLikeFunction(fn.id.name, fn.body, fn.id as Rule.Node);
      },
      VariableDeclarator(node: Rule.Node) {
        const decl = node as unknown as {
          id: Rule.Node;
          init: Rule.Node | null | undefined;
        };
        const { id, init } = decl;
        if (id.type !== 'Identifier') return;
        const name = (id as unknown as { name: string }).name;
        if (!isUseName(name)) return;
        if (init?.type !== 'ArrowFunctionExpression' && init?.type !== 'FunctionExpression') {
          return;
        }
        const body = (init as unknown as { body: Rule.Node }).body;
        checkHookLikeFunction(name, body, id);
      },
    };
  },
};

export default rule;
