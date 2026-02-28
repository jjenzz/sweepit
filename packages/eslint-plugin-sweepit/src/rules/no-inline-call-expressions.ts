import type { Rule } from 'eslint';

const DEFAULT_CONTEXTS: ReadonlyArray<RuleContextName> = ['for-header', 'call-arg'];
const ITERATOR_FACTORY_CALLEES = new Set<string>([
  'Object.keys',
  'Object.values',
  'Object.entries',
  'Array.from',
]);
const ITERATOR_MEMBER_METHODS = new Set<string>(['keys', 'values', 'entries']);

type RuleContextName = 'for-header' | 'call-arg';

interface RuleOptions {
  contexts?: RuleContextName[];
  allowIteratorFactories?: boolean;
}

function isContextName(value: unknown): value is RuleContextName {
  return value === 'for-header' || value === 'call-arg';
}

function parseOptions(option: RuleOptions | undefined): {
  contexts: ReadonlySet<RuleContextName>;
  allowIteratorFactories: boolean;
} {
  const contexts = new Set<RuleContextName>();
  for (const context of option?.contexts ?? DEFAULT_CONTEXTS) {
    if (isContextName(context)) {
      contexts.add(context);
    }
  }

  if (contexts.size === 0) {
    for (const context of DEFAULT_CONTEXTS) {
      contexts.add(context);
    }
  }

  return {
    contexts,
    allowIteratorFactories:
      typeof option?.allowIteratorFactories === 'boolean' ? option.allowIteratorFactories : true,
  };
}

function getMemberExpressionName(node: Rule.Node | null | undefined): string | null {
  if (!node || node.type !== 'MemberExpression') return null;
  const expression = node as unknown as {
    object?: Rule.Node;
    property?: Rule.Node;
    computed?: boolean;
  };
  if (expression.computed) return null;
  if (!expression.object || !expression.property) return null;
  if (expression.property.type !== 'Identifier') return null;
  if (expression.object.type !== 'Identifier') return null;
  const objectName = (expression.object as unknown as { name?: string }).name;
  const propertyName = (expression.property as unknown as { name?: string }).name;
  if (!objectName || !propertyName) return null;
  return `${objectName}.${propertyName}`;
}

function getCalleeName(node: Rule.Node | null | undefined): string | null {
  if (!node) return null;
  if (node.type === 'Identifier') {
    return (node as unknown as { name?: string }).name ?? null;
  }
  if (node.type === 'MemberExpression') {
    return getMemberExpressionName(node);
  }
  return null;
}

function getMemberPropertyName(node: Rule.Node | null | undefined): string | null {
  if (!node || node.type !== 'MemberExpression') return null;
  const expression = node as unknown as { property?: Rule.Node; computed?: boolean };
  if (expression.computed || !expression.property) return null;
  if (expression.property.type !== 'Identifier') return null;
  return (expression.property as unknown as { name?: string }).name ?? null;
}

function isIteratorFactoryCall(node: Rule.Node): boolean {
  if (node.type !== 'CallExpression') return false;
  const callExpression = node as unknown as { callee?: Rule.Node };
  const callee = callExpression.callee;
  const calleeName = getCalleeName(callee);
  if (calleeName && ITERATOR_FACTORY_CALLEES.has(calleeName)) {
    return true;
  }
  const memberName = getMemberPropertyName(callee);
  if (memberName && ITERATOR_MEMBER_METHODS.has(memberName)) {
    return true;
  }
  return false;
}

function collectCallExpressions(
  node: Rule.Node | null | undefined,
  seen: WeakSet<object>,
  calls: Rule.Node[],
): void {
  if (!node || typeof node !== 'object') return;
  if (seen.has(node as unknown as object)) return;
  seen.add(node as unknown as object);

  if (node.type === 'CallExpression') {
    calls.push(node);
  }

  const record = node as unknown as Record<string, unknown>;
  for (const entry of Object.entries(record)) {
    const key = entry[0];
    const value = entry[1];
    if (key === 'parent') continue;
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry && typeof entry === 'object' && 'type' in (entry as object)) {
          collectCallExpressions(entry as Rule.Node, seen, calls);
        }
      }
      continue;
    }
    if (typeof value === 'object' && 'type' in (value as object)) {
      collectCallExpressions(value as Rule.Node, seen, calls);
    }
  }
}

function getUniqueNodeKey(node: Rule.Node): string {
  const typedNode = node as unknown as {
    range?: [number, number];
    loc?: { start: { line: number; column: number } };
  };
  const range = typedNode.range;
  if (range) return `${range[0]}:${range[1]}`;
  const line = typedNode.loc?.start.line ?? -1;
  const column = typedNode.loc?.start.column ?? -1;
  return `${line}:${column}`;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer extracting function calls into variables instead of placing them in loop headers or call arguments.',
      url: 'https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-inline-call-expressions.md',
    },
    schema: [
      {
        type: 'object',
        properties: {
          contexts: {
            type: 'array',
            items: {
              enum: ['for-header', 'call-arg'],
            },
            uniqueItems: true,
          },
          allowIteratorFactories: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noCallInForHeader:
        'Extract this function call from the for-loop header into a named variable.',
      noCallArg: 'Extract this function call into a variable before passing it as an argument.',
    },
  },
  create(context) {
    const parsedOptions = parseOptions(context.options[0] as RuleOptions | undefined);
    const reportedCallKeys = new Set<string>();

    function reportCallExpressions(
      node: Rule.Node | null | undefined,
      messageId: 'noCallInForHeader' | 'noCallArg',
      options?: {
        allowTopLevelIteratorFactory?: boolean;
      },
    ): void {
      if (!node) return;
      const calls: Rule.Node[] = [];
      collectCallExpressions(node, new WeakSet<object>(), calls);

      for (const call of calls) {
        if (
          options?.allowTopLevelIteratorFactory &&
          call === node &&
          parsedOptions.allowIteratorFactories &&
          isIteratorFactoryCall(call)
        ) {
          continue;
        }

        const key = getUniqueNodeKey(call);
        if (reportedCallKeys.has(key)) continue;
        reportedCallKeys.add(key);
        context.report({
          node: call,
          messageId,
        });
      }
    }

    return {
      ForStatement(node: Rule.Node) {
        if (!parsedOptions.contexts.has('for-header')) return;
        const forStatement = node as unknown as {
          init?: Rule.Node | null;
          test?: Rule.Node | null;
          update?: Rule.Node | null;
        };
        reportCallExpressions(forStatement.init, 'noCallInForHeader');
        reportCallExpressions(forStatement.test, 'noCallInForHeader');
        reportCallExpressions(forStatement.update, 'noCallInForHeader');
      },
      ForOfStatement(node: Rule.Node) {
        if (!parsedOptions.contexts.has('for-header')) return;
        const forOfStatement = node as unknown as { right?: Rule.Node | null };
        reportCallExpressions(forOfStatement.right, 'noCallInForHeader', {
          allowTopLevelIteratorFactory: true,
        });
      },
      ForInStatement(node: Rule.Node) {
        if (!parsedOptions.contexts.has('for-header')) return;
        const forInStatement = node as unknown as { right?: Rule.Node | null };
        reportCallExpressions(forInStatement.right, 'noCallInForHeader');
      },
      CallExpression(node: Rule.Node) {
        if (!parsedOptions.contexts.has('call-arg')) return;
        const callExpression = node as unknown as { arguments?: Rule.Node[] };
        for (const argument of callExpression.arguments ?? []) {
          reportCallExpressions(argument, 'noCallArg');
        }
      },
    };
  },
};

export default rule;
