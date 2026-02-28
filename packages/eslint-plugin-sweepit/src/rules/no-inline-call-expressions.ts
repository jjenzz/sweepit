import type { Rule } from 'eslint';

const DEFAULT_CONTEXTS: ReadonlyArray<RuleContextName> = ['for-header', 'call-arg'];
const DEFAULT_ALLOW_CALL_PATTERNS: ReadonlyArray<string> = ['*.entries', '*.values', '*.keys'];

type RuleContextName = 'for-header' | 'call-arg';

interface RuleOptions {
  contexts?: RuleContextName[];
  allowCallPatterns?: string[];
}

function isContextName(value: unknown): value is RuleContextName {
  return value === 'for-header' || value === 'call-arg';
}

function parseOptions(option: RuleOptions | undefined): {
  contexts: ReadonlySet<RuleContextName>;
  allowCallPatterns: ReadonlyArray<string>;
} {
  const contexts = new Set<RuleContextName>(
    (option?.contexts ?? DEFAULT_CONTEXTS).filter((context) => isContextName(context)),
  );
  const contextSet = contexts.size > 0 ? contexts : new Set<RuleContextName>(DEFAULT_CONTEXTS);

  return {
    contexts: contextSet,
    allowCallPatterns:
      option?.allowCallPatterns?.filter((pattern) => typeof pattern === 'string') ??
      DEFAULT_ALLOW_CALL_PATTERNS,
  };
}

function getParent(node: Rule.Node): Rule.Node | null {
  const parent = (node as Rule.Node & { parent?: Rule.Node }).parent;
  return parent ?? null;
}

function hasCallExpressionArguments(node: Rule.Node): boolean {
  return 'arguments' in (node as object);
}

function isCallExpressionArgument(node: Rule.Node): boolean {
  let current: Rule.Node | null = node;
  let parent = current ? getParent(current) : null;
  while (current && parent) {
    if (parent.type === 'CallExpression' && hasCallExpressionArguments(parent)) {
      const callParent = parent as Rule.Node & { arguments?: Rule.Node[] };
      if ((callParent.arguments ?? []).includes(current)) {
        return true;
      }
    }
    current = parent;
    parent = getParent(current);
  }
  return false;
}

function isForStatementHeaderCall(node: Rule.Node): boolean {
  let current: Rule.Node | null = node;
  while (current) {
    const parent = getParent(current);
    if (!parent) return false;

    if (parent.type === 'ForStatement') {
      const forParent = parent as Rule.Node & {
        init?: Rule.Node | null;
        test?: Rule.Node | null;
        update?: Rule.Node | null;
      };
      if (
        forParent.init === current ||
        forParent.test === current ||
        forParent.update === current
      ) {
        return true;
      }
    }

    if (parent.type === 'ForOfStatement' || parent.type === 'ForInStatement') {
      const forXParent = parent as Rule.Node & { right?: Rule.Node | null };
      if (forXParent.right === current) {
        return true;
      }
    }

    current = parent;
  }
  return false;
}

function getIdentifierName(node: Rule.Node | null | undefined): string | null {
  if (!node || node.type !== 'Identifier') return null;
  return (node as Rule.Node & { name?: string }).name ?? null;
}

function getCalleeName(node: Rule.Node | null | undefined): string | null {
  if (!node) return null;
  if (node.type === 'Identifier') {
    return getIdentifierName(node);
  }
  if (node.type !== 'MemberExpression') return null;
  const memberExpression = node as Rule.Node & {
    object?: Rule.Node;
    property?: Rule.Node;
    computed?: boolean;
  };
  if (memberExpression.computed) return null;
  const objectName = getCalleeName(memberExpression.object);
  const propertyName = getIdentifierName(memberExpression.property);
  if (!propertyName) return null;
  return objectName ? `${objectName}.${propertyName}` : propertyName;
}

function escapeRegex(pattern: string): string {
  return pattern.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function globPatternToRegex(pattern: string): RegExp {
  const escaped = escapeRegex(pattern).replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function matchesPattern(value: string, pattern: string): boolean {
  return globPatternToRegex(pattern).test(value);
}

function getNodeKey(node: Rule.Node): string {
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

function shouldAllowTopLevelForOfCall(
  node: Rule.Node,
  allowCallPatterns: ReadonlyArray<string>,
): boolean {
  const parent = getParent(node);
  if (!parent || parent.type !== 'ForOfStatement') return false;
  const forOfParent = parent as Rule.Node & { right?: Rule.Node | null };
  if (forOfParent.right !== node) return false;
  const callExpression = node as Rule.Node & { callee?: Rule.Node };
  const calleeName = getCalleeName(callExpression.callee);
  if (!calleeName) return false;
  return allowCallPatterns.some((pattern) => matchesPattern(calleeName, pattern));
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
          allowCallPatterns: {
            type: 'array',
            items: {
              type: 'string',
            },
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
  create(context: Readonly<Rule.RuleContext>) {
    const parsedOptions = parseOptions(context.options[0] as RuleOptions | undefined);
    const reportedCallKeys = new Set<string>();

    function reportOnce(node: Rule.Node, messageId: 'noCallInForHeader' | 'noCallArg'): void {
      const key = getNodeKey(node);
      if (reportedCallKeys.has(key)) return;
      reportedCallKeys.add(key);
      context.report({ node, messageId });
    }

    return {
      ForStatement(node: Rule.Node) {
        if (!parsedOptions.contexts.has('for-header')) return;
        const forStatement = node as Rule.Node & {
          init?: Rule.Node | null;
          test?: Rule.Node | null;
          update?: Rule.Node | null;
        };
        const headerNodes = [forStatement.init, forStatement.test, forStatement.update].filter(
          (headerNode): headerNode is Rule.Node => Boolean(headerNode),
        );
        for (const headerNode of headerNodes) {
          if (headerNode.type === 'CallExpression') {
            reportOnce(headerNode, 'noCallInForHeader');
          }
        }
      },
      CallExpression(node: Rule.Node) {
        const callExpression = node as Rule.Node & { parent?: Rule.Node };

        if (parsedOptions.contexts.has('for-header') && isForStatementHeaderCall(callExpression)) {
          const allowTopLevelForOfCall = shouldAllowTopLevelForOfCall(
            callExpression,
            parsedOptions.allowCallPatterns,
          );
          if (!allowTopLevelForOfCall) {
            reportOnce(callExpression, 'noCallInForHeader');
          }
        }

        if (parsedOptions.contexts.has('call-arg') && isCallExpressionArgument(callExpression)) {
          reportOnce(callExpression, 'noCallArg');
        }
      },
    };
  },
};

export default rule;
