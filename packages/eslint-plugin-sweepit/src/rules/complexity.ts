import type { Rule } from 'eslint';

const THRESHOLD_DEFAULT = 20;

type ComplexityVariant = 'classic' | 'modified';

interface ComplexityOptionsObject {
  maximum?: number;
  max?: number;
  variant?: ComplexityVariant;
}

type ComplexityOption = number | ComplexityOptionsObject;
type RuleNodeWithOptional = Rule.Node & { optional?: boolean };

function isPascalCaseFunctionName(name: string): boolean {
  return /^[A-Z][A-Za-z0-9]*$/.test(name);
}

function upperCaseFirst(value: string): string {
  if (value.length === 0) return value;
  return value[0].toUpperCase() + value.slice(1);
}

function isLogicalAssignmentOperator(operator: string): boolean {
  return operator === '&&=' || operator === '||=' || operator === '??=';
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function getMethodName(parent: { key?: { type?: string; name?: string; value?: string } }): string | null {
  const key = parent.key;
  if (!key) return null;
  if (key.type === 'Identifier') return asString(key.name);
  if (key.type === 'Literal') return asString(key.value);
  return null;
}

function getVariableFunctionName(parent: {
  type?: string;
  id?: { type?: string; name?: string };
}): string | null {
  if (parent.type !== 'VariableDeclarator') return null;
  if (parent.id?.type !== 'Identifier') return null;
  return parent.id.name ?? null;
}

function getParentFunctionName(parent: {
  type?: string;
  id?: { type?: string; name?: string };
  key?: { type?: string; name?: string; value?: string };
}): string {
  const variableName = getVariableFunctionName(parent);
  if (variableName) return `function '${variableName}'`;

  if (parent.type !== 'MethodDefinition') {
    return 'function';
  }

  const methodName = getMethodName(parent);
  if (methodName) return `method '${methodName}'`;
  return 'function';
}

function getFunctionNameWithKind(node: Rule.Node): string {
  const declarationName = getNamedFunctionDeclaration(node);
  if (declarationName) return `function '${declarationName}'`;

  const parent = (node as unknown as { parent?: Rule.Node }).parent as
    | undefined
    | {
        type?: string;
        id?: { type?: string; name?: string };
        key?: { type?: string; name?: string; value?: string };
      };
  if (!parent) {
    return 'function';
  }
  return getParentFunctionName(parent);
}

function getFunctionLoc(node: Rule.Node): Rule.Node['loc'] {
  const typedNode = node as unknown as { loc?: Rule.Node['loc'] };
  return typedNode.loc;
}

function getNamedFunctionDeclaration(node: Rule.Node): string | null {
  const fn = node as unknown as { id?: { type?: string; name?: string } | null };
  if (fn.id?.type !== 'Identifier') return null;
  return fn.id.name ?? null;
}

function getVariableDeclaratorName(node: Rule.Node): string | null {
  const fn = node as unknown as { parent?: Rule.Node };
  const parent = fn.parent as undefined | { type?: string; id?: { type?: string; name?: string } };
  if (!parent || parent.type !== 'VariableDeclarator') return null;
  const id = parent.id;
  if (!id || id.type !== 'Identifier') return null;
  return asString(id.name);
}

function getPascalCaseFunctionName(node: Rule.Node): string | null {
  const declarationName = getNamedFunctionDeclaration(node);
  if (declarationName && isPascalCaseFunctionName(declarationName)) return declarationName;

  const variableName = getVariableDeclaratorName(node);
  if (variableName && isPascalCaseFunctionName(variableName)) return variableName;
  return null;
}

function parseOptions(option: ComplexityOption | undefined): {
  threshold: number;
  isModifiedComplexity: boolean;
} {
  if (typeof option === 'number') {
    return { threshold: option, isModifiedComplexity: false };
  }
  if (!option) {
    return { threshold: THRESHOLD_DEFAULT, isModifiedComplexity: false };
  }
  const threshold = option.maximum ?? option.max ?? THRESHOLD_DEFAULT;
  return { threshold, isModifiedComplexity: option.variant === 'modified' };
}

function shouldTrackOrigin(origin: Rule.CodePath['origin']): boolean {
  return (
    origin === 'function' || origin === 'class-field-initializer' || origin === 'class-static-block'
  );
}

function getReportName(origin: Rule.CodePath['origin'], node: Rule.Node): string {
  if (origin === 'class-field-initializer') return 'class field initializer';
  if (origin === 'class-static-block') return 'class static block';
  return getFunctionNameWithKind(node);
}

function reportComplexity(
  context: Rule.RuleContext,
  node: Rule.Node,
  loc: Rule.Node['loc'],
  name: string,
  complexity: number,
  max: number,
): void {
  const reportDescriptor = {
    node,
    messageId: 'complex',
    data: {
      name: upperCaseFirst(name),
      complexity,
      max,
    },
  };
  context.report(loc ? { ...reportDescriptor, loc } : reportDescriptor);
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce a maximum cyclomatic complexity allowed in a program',
      url: 'https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/complexity.md',
    },
    schema: [
      {
        oneOf: [
          {
            type: 'integer',
            minimum: 0,
          },
          {
            type: 'object',
            properties: {
              maximum: {
                type: 'integer',
                minimum: 0,
              },
              max: {
                type: 'integer',
                minimum: 0,
              },
              variant: {
                enum: ['classic', 'modified'],
              },
            },
            additionalProperties: false,
          },
        ],
      },
    ],
    messages: {
      complex: '{{name}} has a complexity of {{complexity}}. Maximum allowed is {{max}}.',
    },
  },
  create(context) {
    const option = context.options[0] as ComplexityOption | undefined;
    const parsedOptions = parseOptions(option);
    let complexities: number[] = [];

    function increaseComplexity(): void {
      const current = complexities.at(-1) ?? 1;
      complexities = [...complexities.slice(0, -1), current + 1];
    }

    function pushComplexity(): void {
      complexities = [...complexities, 1];
    }

    function popComplexity(): number {
      const current = complexities.at(-1) ?? 1;
      complexities = complexities.slice(0, -1);
      return current;
    }

    function isOptionalNode(node: Rule.Node): boolean {
      return (node as RuleNodeWithOptional).optional === true;
    }

    return {
      onCodePathStart: pushComplexity,
      CatchClause: increaseComplexity,
      ConditionalExpression: increaseComplexity,
      LogicalExpression: increaseComplexity,
      ForStatement: increaseComplexity,
      ForInStatement: increaseComplexity,
      ForOfStatement: increaseComplexity,
      IfStatement: increaseComplexity,
      WhileStatement: increaseComplexity,
      DoWhileStatement: increaseComplexity,
      AssignmentPattern: increaseComplexity,
      'SwitchCase[test]'() {
        if (!parsedOptions.isModifiedComplexity) increaseComplexity();
      },
      SwitchStatement() {
        if (parsedOptions.isModifiedComplexity) increaseComplexity();
      },
      AssignmentExpression(node: Rule.Node) {
        const assignment = node as unknown as { operator?: string };
        if (assignment.operator && isLogicalAssignmentOperator(assignment.operator)) {
          increaseComplexity();
        }
      },
      MemberExpression(node: Rule.Node) {
        if (isOptionalNode(node)) increaseComplexity();
      },
      CallExpression(node: Rule.Node) {
        if (isOptionalNode(node)) increaseComplexity();
      },
      onCodePathEnd(codePath: Rule.CodePath, node: Rule.Node) {
        const complexity = popComplexity();
        const origin = codePath.origin;
        if (!shouldTrackOrigin(origin)) return;
        if (origin === 'function' && getPascalCaseFunctionName(node)) return;
        if (complexity <= parsedOptions.threshold) return;

        const name = getReportName(origin, node);
        const loc = getFunctionLoc(node);
        reportComplexity(context, node, loc, name, complexity, parsedOptions.threshold);
      },
    };
  },
};

export default rule;
