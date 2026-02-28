import type { Rule } from 'eslint';

const HOOK_NAMES = new Set([
  'useState',
  'useEffect',
  'useReducer',
  'useRef',
  'useContext',
  'useLayoutEffect',
  'useImperativeHandle',
  'useDebugValue',
  'useId',
  'useSyncExternalStore',
  'useTransition',
  'useDeferredValue',
  'useOptimistic',
  'useActionState',
  'useFormStatus',
]);

function isUseName(name: string): boolean {
  return name.startsWith('use') && name.length > 3;
}

function isBuiltInOrCustomHookName(name: string): boolean {
  return HOOK_NAMES.has(name) || isUseName(name);
}

function isHookCall(node: Rule.Node | null | undefined): boolean {
  if (!node || (node as { type?: string }).type !== 'CallExpression') return false;
  const call = node as unknown as { callee: Rule.Node };
  const callee = call.callee;
  if (callee.type === 'Identifier') {
    return isBuiltInOrCustomHookName((callee as unknown as { name: string }).name);
  }
  if (callee.type === 'MemberExpression') {
    const mem = callee as unknown as {
      property: { type: string; name?: string };
    };
    return (
      mem.property.type === 'Identifier' &&
      mem.property.name != null &&
      isBuiltInOrCustomHookName(mem.property.name)
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

function isTraversableNode(value: unknown): value is Rule.Node {
  return (
    Boolean(value) && typeof value === 'object' && 'type' in (value as Record<string, unknown>)
  );
}

function getChildNodes(value: unknown): Rule.Node[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is Rule.Node => isTraversableNode(entry));
  }
  return isTraversableNode(value) ? [value] : [];
}

function* traverseNode(node: Rule.Node, seen: WeakSet<object>): Generator<Rule.Node> {
  if (seen.has(node as object)) return;
  seen.add(node as object);
  yield node;

  const keys = CHILD_KEYS[(node as { type?: string }).type ?? ''] ?? [];
  const typedNode = node as unknown as Record<string, unknown>;

  for (const key of keys) {
    for (const child of getChildNodes(typedNode[key])) {
      yield* traverseNode(child, seen);
    }
  }
}

function* traverse(node: Rule.Node | null | undefined): Generator<Rule.Node> {
  if (!node || typeof node !== 'object') return;
  yield* traverseNode(node, new WeakSet<object>());
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
      url: 'https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-useless-hook.md',
    },
    messages: {
      noUselessHook: "Function '{{name}}' is named like a hook but does not call React hooks.",
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
