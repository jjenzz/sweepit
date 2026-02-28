import type { Rule } from 'eslint';
import ts from 'typescript';

interface ScopeLike {
  type?: string;
  upper?: ScopeLike | null;
  set?: Map<string, VariableLike>;
  variables?: VariableLike[];
  childScopes?: ScopeLike[];
}

interface VariableLike {
  name: string;
  scope: ScopeLike;
  defs: Array<{ type?: string; name?: any }>;
}

interface IdentifierLike {
  type: 'Identifier';
  name: string;
}

interface AssignmentExpressionLike {
  left: { type?: string; name?: string };
}

interface UpdateExpressionLike {
  argument: { type?: string; name?: string };
}

interface LiteralLike {
  value?: unknown;
}

interface MemberExpressionLike {
  type: 'MemberExpression';
  object: { type?: string; name?: string };
  property: { type?: string; name?: string; value?: unknown };
  computed?: boolean;
}

interface ChainExpressionLike {
  type: 'ChainExpression';
  expression: { type?: string };
}

interface CallExpressionLike {
  callee: { type?: string };
}

interface FunctionState {
  localVariables: Set<VariableLike>;
  parameterVariables: Set<VariableLike>;
}

function isFunctionNode(node: { type?: string }): boolean {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  );
}

function getNearestFunctionNode(sourceCode: any, node: any): object | null {
  const ancestors = sourceCode.getAncestors(node) as Array<{ type?: string }>;
  for (let i = ancestors.length - 1; i >= 0; i -= 1) {
    const ancestor = ancestors[i];
    if (isFunctionNode(ancestor)) {
      return ancestor as object;
    }
  }
  return null;
}

function resolveVariable(sourceCode: any, identifier: IdentifierLike): VariableLike | null {
  let currentScope = sourceCode.getScope(identifier) as unknown as ScopeLike | null;
  while (currentScope) {
    const resolved = currentScope.set?.get(identifier.name);
    if (resolved) return resolved;
    currentScope = currentScope.upper ?? null;
  }
  return null;
}

function getFunctionScope(sourceCode: any, functionNode: object): ScopeLike | null {
  const scopeManager = sourceCode.scopeManager as {
    acquire: (node: object) => ScopeLike | null;
  };
  const acquired = scopeManager.acquire(functionNode);
  if (!acquired) return null;
  if (acquired.type === 'function') return acquired;

  const childScopes = acquired.childScopes ?? [];
  for (const childScope of childScopes) {
    if (childScope.type === 'function') {
      return childScope;
    }
  }

  return null;
}

function collectFunctionState(functionScope: ScopeLike): FunctionState {
  const localVariables = new Set<VariableLike>();
  const parameterVariables = new Set<VariableLike>();

  function visitScope(scope: ScopeLike): void {
    const variables = scope.variables ?? [];
    for (const variable of variables) {
      localVariables.add(variable);

      const defs = variable.defs ?? [];
      for (const definition of defs) {
        if (definition.type === 'Parameter') {
          parameterVariables.add(variable);
          break;
        }
      }
    }

    const childScopes = scope.childScopes ?? [];
    for (const childScope of childScopes) {
      if (childScope.type === 'function') continue;
      visitScope(childScope);
    }
  }

  visitScope(functionScope);
  return { localVariables, parameterVariables };
}

function getIdentifier(node: any): IdentifierLike | null {
  if (node?.type !== 'Identifier' || typeof node?.name !== 'string') return null;
  return node as IdentifierLike;
}

function isPrimitiveType(type: ts.Type): boolean {
  const primitiveFlags =
    ts.TypeFlags.StringLike |
    ts.TypeFlags.NumberLike |
    ts.TypeFlags.BooleanLike |
    ts.TypeFlags.BigIntLike |
    ts.TypeFlags.ESSymbolLike |
    ts.TypeFlags.Null |
    ts.TypeFlags.Undefined;

  return (type.flags & primitiveFlags) !== 0;
}

function isReadonlyTyped(type: ts.Type, checker: ts.TypeChecker): boolean {
  if (type.isUnionOrIntersection()) {
    return type.types.every((entry) => isReadonlyTyped(entry, checker));
  }

  const ambiguousFlags =
    ts.TypeFlags.Any |
    ts.TypeFlags.Unknown |
    ts.TypeFlags.TypeParameter |
    ts.TypeFlags.InstantiableNonPrimitive;
  if ((type.flags & ambiguousFlags) !== 0) return false;

  if (isPrimitiveType(type)) return true;

  const typeText = checker.typeToString(type);
  if (typeText.startsWith('readonly ')) return true;
  if (typeText.startsWith('Readonly<')) return true;
  if (typeText.startsWith('ReadonlyArray<')) return true;
  if (typeText.startsWith('ReadonlyMap<')) return true;
  if (typeText.startsWith('ReadonlySet<')) return true;

  if (checker.isArrayType(type) || checker.isTupleType(type)) {
    return typeText.startsWith('ReadonlyArray<') || typeText.startsWith('readonly [');
  }

  const objectLikeFlags = ts.TypeFlags.Object | ts.TypeFlags.NonPrimitive;
  if ((type.flags & objectLikeFlags) !== 0) {
    return false;
  }

  return false;
}

function isReadonlyTypeReferenceName(typeNameNode: any): boolean {
  if (!typeNameNode) return false;
  if (typeNameNode.type === 'Identifier') {
    return (
      typeNameNode.name === 'Readonly' ||
      typeNameNode.name === 'ReadonlyArray' ||
      typeNameNode.name === 'ReadonlyMap' ||
      typeNameNode.name === 'ReadonlySet'
    );
  }

  if (typeNameNode.type === 'TSQualifiedName') {
    return isReadonlyTypeReferenceName(typeNameNode.right);
  }

  return false;
}

function isReadonlyTypeAnnotationNode(node: any): boolean {
  if (!node) return false;

  if (node.type === 'TSTypeOperator' && node.operator === 'readonly') {
    return true;
  }

  if (node.type === 'TSArrayType') return false;

  if (node.type === 'TSTypeReference') {
    return isReadonlyTypeReferenceName(node.typeName);
  }

  if (node.type === 'TSParenthesizedType' || node.type === 'TSOptionalType') {
    return isReadonlyTypeAnnotationNode(node.typeAnnotation);
  }

  if (node.type === 'TSUnionType' || node.type === 'TSIntersectionType') {
    const entries = node.types ?? [];
    return entries.length > 0 && entries.every((entry: any) => isReadonlyTypeAnnotationNode(entry));
  }

  return false;
}

function hasReadonlyTypeAnnotation(variable: VariableLike | null): boolean {
  if (!variable) return false;

  const definitions = variable.defs ?? [];
  for (const definition of definitions) {
    const nameNode = definition.name;
    const annotationNode = nameNode?.typeAnnotation?.typeAnnotation;
    if (isReadonlyTypeAnnotationNode(annotationNode)) return true;
  }

  return false;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow mutating bindings from outer scope or parameters within a function',
      url: 'https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-external-binding-mutation.md',
    },
    schema: [],
    messages: {
      noExternalBindingMutation:
        "Only mutate local bindings. '{{name}}' is external or a parameter.",
      noExternalBindingCallRequiresReadonly:
        "Method calls on external or parameter binding '{{name}}' require a readonly type annotation.",
    },
  },
  create(context) {
    const parserServices =
      (
        context.sourceCode as {
          parserServices?: {
            program?: ts.Program;
            esTreeNodeToTSNodeMap?: Map<unknown, ts.Node>;
          };
        }
      ).parserServices ??
      (
        context as Rule.RuleContext & {
          parserServices?: {
            program?: ts.Program;
            esTreeNodeToTSNodeMap?: Map<unknown, ts.Node>;
          };
        }
      ).parserServices;
    const checker = parserServices?.program?.getTypeChecker();
    const hasTypeInformation = Boolean(checker && parserServices?.esTreeNodeToTSNodeMap);
    const sourceCode = context.sourceCode;
    const functionStateCache = new WeakMap<object, FunctionState>();

    function getFunctionState(functionNode: object): FunctionState | null {
      const cached = functionStateCache.get(functionNode);
      if (cached) return cached;

      const functionScope = getFunctionScope(sourceCode, functionNode);
      if (!functionScope) return null;

      const state = collectFunctionState(functionScope);
      functionStateCache.set(functionNode, state);
      return state;
    }

    function shouldReportIdentifier(identifier: IdentifierLike, functionNode: object): boolean {
      const variable = resolveVariable(sourceCode, identifier);
      if (!variable) return false;

      const functionState = getFunctionState(functionNode);
      if (!functionState) return false;

      if (functionState.parameterVariables.has(variable)) {
        return true;
      }

      return !functionState.localVariables.has(variable);
    }

    function reportMutation(node: any, identifier: IdentifierLike): void {
      context.report({
        node,
        messageId: 'noExternalBindingMutation',
        data: { name: identifier.name },
      });
    }

    function reportReadonlyRequired(node: any, identifier: IdentifierLike): void {
      context.report({
        node,
        messageId: 'noExternalBindingCallRequiresReadonly',
        data: { name: identifier.name },
      });
    }

    function receiverIsReadonlyTyped(objectNode: { type?: string; name?: string }): boolean {
      const identifier = getIdentifier(objectNode);
      const resolvedVariable = identifier ? resolveVariable(sourceCode, identifier) : null;
      if (hasReadonlyTypeAnnotation(resolvedVariable)) {
        return true;
      }

      if (!hasTypeInformation || !checker || !parserServices?.esTreeNodeToTSNodeMap) {
        return false;
      }

      const tsNode = parserServices.esTreeNodeToTSNodeMap.get(objectNode);
      if (!tsNode) return false;

      const receiverType = checker.getTypeAtLocation(tsNode);
      return isReadonlyTyped(receiverType, checker);
    }

    return {
      AssignmentExpression(node: any) {
        const assignmentNode = node as unknown as AssignmentExpressionLike;
        if (assignmentNode.left.type !== 'Identifier') return;

        const functionNode = getNearestFunctionNode(sourceCode, node);
        if (!functionNode) return;

        const identifier = getIdentifier(assignmentNode.left);
        if (!identifier) return;
        if (!shouldReportIdentifier(identifier, functionNode)) return;
        reportMutation(identifier, identifier);
      },
      UpdateExpression(node: any) {
        const updateNode = node as unknown as UpdateExpressionLike;
        if (updateNode.argument.type !== 'Identifier') return;

        const functionNode = getNearestFunctionNode(sourceCode, node);
        if (!functionNode) return;

        const identifier = getIdentifier(updateNode.argument);
        if (!identifier) return;
        if (!shouldReportIdentifier(identifier, functionNode)) return;
        reportMutation(identifier, identifier);
      },
      CallExpression(node: any) {
        const callNode = node as unknown as CallExpressionLike;
        let callee = callNode.callee as any;

        if (callee.type === 'ChainExpression') {
          callee = (callee as unknown as ChainExpressionLike).expression as any;
        }

        if (callee.type !== 'MemberExpression') return;
        const memberExpression = callee as unknown as MemberExpressionLike;
        if (memberExpression.object.type !== 'Identifier') return;

        const functionNode = getNearestFunctionNode(sourceCode, node);
        if (!functionNode) return;

        const identifier = getIdentifier(memberExpression.object);
        if (!identifier) return;
        if (!shouldReportIdentifier(identifier, functionNode)) return;
        if (receiverIsReadonlyTyped(memberExpression.object)) return;
        reportReadonlyRequired(memberExpression.object, identifier);
      },
    };
  },
};

export default rule;
