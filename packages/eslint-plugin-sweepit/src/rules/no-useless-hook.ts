import type { Rule } from 'eslint';

const HOOK_NAMES = new Set(['useState', 'useEffect', 'useReducer', 'useRef', 'useContext']);

function isUseName(name: string): boolean {
  return name.startsWith('use') && name.length > 3;
}

function isHookCall(node: Rule.Node | null | undefined): boolean {
  if (!node || (node as { type?: string }).type !== 'CallExpression') return false;
  const call = node as unknown as { callee: Rule.Node };
  const callee = call.callee;
  if (callee.type === 'Identifier') {
    return HOOK_NAMES.has((callee as unknown as { name: string }).name);
  }
  if (callee.type === 'MemberExpression') {
    const mem = callee as unknown as {
      property: { type: string; name?: string };
    };
    return (
      mem.property.type === 'Identifier' &&
      mem.property.name != null &&
      HOOK_NAMES.has(mem.property.name)
    );
  }
  return false;
}

const CHILD_KEYS: Record<string, string[]> = {
  Program: ['body'],
  BlockStatement: ['body'],
  FunctionDeclaration: ['params', 'body'],
  FunctionExpression: ['params', 'body'],
  ArrowFunctionExpression: ['params', 'body'],
  CallExpression: ['callee', 'arguments'],
  ReturnStatement: ['argument'],
  VariableDeclaration: ['declarations'],
  VariableDeclarator: ['id', 'init'],
  ExpressionStatement: ['expression'],
  MemberExpression: ['object', 'property'],
  ArrayPattern: ['elements'],
  ObjectExpression: ['properties'],
};

function* traverse(node: Rule.Node | null | undefined): Generator<Rule.Node> {
  if (!node || typeof node !== 'object') return;
  const stack: Rule.Node[] = [node];
  const seen = new WeakSet<object>();
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (seen.has(current as object)) continue;
    seen.add(current as object);
    yield current;
    const keys = CHILD_KEYS[(current as { type?: string }).type ?? ''] ?? [];
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

function callsAnyHook(body: Rule.Node | null | undefined): boolean {
  for (const child of traverse(body)) {
    if (isHookCall(child)) return true;
  }
  return false;
}

function getFunctionBody(
  node:
    | { type: 'FunctionDeclaration'; body: Rule.Node }
    | { type: 'FunctionExpression'; body: Rule.Node }
    | { type: 'ArrowFunctionExpression'; body: Rule.Node },
): Rule.Node {
  return node.body;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow use* functions that do not call any React hook (useState, useEffect, useReducer, useRef, useContext)',
    },
    messages: {
      noUselessHook:
        "Function '{{name}}' is named like a hook but does not call any React hook. Rename or add hook calls.",
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
      if (callsAnyHook(body)) return;
      context.report({
        node: reportNode,
        messageId: 'noUselessHook',
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
        checkHookLikeFunction(fn.id.name, getFunctionBody(node as never), fn.id as Rule.Node);
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
        const body = getFunctionBody(init as never);
        checkHookLikeFunction(name, body, id);
      },
    };
  },
};

export default rule;
