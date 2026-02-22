import type { Rule } from 'eslint';
import type ts from 'typescript';

interface JSXExpressionContainer {
  type: 'JSXExpressionContainer';
  expression?: (Rule.Node & { type?: string }) | null;
}

function getTypeName(node: Rule.Node | undefined): string | null {
  if (!node) return null;
  const typedNode = node as {
    type?: string;
    name?: string;
    right?: { name?: string };
  };
  if (typedNode.type === 'Identifier' && typedNode.name) return typedNode.name;
  if (typedNode.type === 'TSQualifiedName' && typedNode.right?.name) return typedNode.right.name;
  return null;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow array-valued JSX props (more accurate when TypeScript type information is available)',
      url: 'https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-array-props.md',
    },
    messages: {
      noArrayProps:
        "Array value passed to prop '{{prop}}'. Avoid array props; prefer primitive props and compound composition. If array-shaped data must be shared across parts, use private context inside the compound root instead of passing array props. See: https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-array-props.md.",
    },
    schema: [],
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
    const arrayTypedIdentifiers = new Set<string>();
    const arrayReturningFunctions = new Set<string>();
    const localTypeAliases = new Map<string, Rule.Node>();

    function isArrayLikeTypeText(typeText: string): boolean {
      return (
        typeText.endsWith('[]') ||
        typeText.startsWith('readonly ') ||
        typeText.startsWith('Array<') ||
        typeText.startsWith('ReadonlyArray<') ||
        typeText.startsWith('[') ||
        typeText.startsWith('readonly [')
      );
    }

    function isArrayLikeTypeNode(
      typeNode: Rule.Node | undefined,
      seenAliases: Set<string>,
    ): boolean {
      if (!typeNode) return false;
      const typedNode = typeNode as {
        type?: string;
        typeAnnotation?: Rule.Node;
        types?: Rule.Node[];
        elementType?: Rule.Node;
        typeName?: Rule.Node;
      };

      if (typedNode.type === 'TSArrayType' || typedNode.type === 'TSTupleType') return true;
      if (typedNode.type === 'TSParenthesizedType' || typedNode.type === 'TSOptionalType') {
        return isArrayLikeTypeNode(typedNode.typeAnnotation, seenAliases);
      }
      if (typedNode.type === 'TSTypeOperator') {
        return isArrayLikeTypeNode(typedNode.typeAnnotation, seenAliases);
      }
      if (typedNode.type === 'TSUnionType' || typedNode.type === 'TSIntersectionType') {
        return (typedNode.types ?? []).some((entry) => isArrayLikeTypeNode(entry, seenAliases));
      }
      if (typedNode.type === 'TSTypeReference') {
        const typeName = getTypeName(typedNode.typeName);
        if (!typeName) return false;
        if (typeName === 'Array' || typeName === 'ReadonlyArray') return true;
        if (seenAliases.has(typeName)) return false;
        const aliasType = localTypeAliases.get(typeName);
        if (!aliasType) return false;
        const nextSeenAliases = new Set(seenAliases);
        nextSeenAliases.add(typeName);
        return isArrayLikeTypeNode(aliasType, nextSeenAliases);
      }
      return false;
    }

    function expressionHasArrayShapeByAst(expression: Rule.Node): boolean {
      const typedExpression = expression as {
        type?: string;
        name?: string;
        callee?: Rule.Node;
      };
      if (typedExpression.type === 'Identifier' && typedExpression.name) {
        return arrayTypedIdentifiers.has(typedExpression.name);
      }
      if (typedExpression.type === 'CallExpression' && typedExpression.callee) {
        const callee = typedExpression.callee as {
          type?: string;
          name?: string;
        };
        return (
          callee.type === 'Identifier' &&
          Boolean(callee.name && arrayReturningFunctions.has(callee.name))
        );
      }
      return false;
    }

    function isDisallowedArrayType(type: ts.Type | undefined): boolean {
      if (!type || !checker) return false;

      if (type.isUnionOrIntersection()) {
        return type.types.some((entry) => isDisallowedArrayType(entry));
      }

      if (checker.isArrayType(type) || checker.isTupleType(type)) return true;

      // Pragmatic fallback: in some environments, checker helpers can miss aliased/inferred arrays.
      return isArrayLikeTypeText(checker.typeToString(type));
    }

    function expressionHasArrayType(expression: Rule.Node): boolean {
      if (!hasTypeInformation || !checker || !parserServices?.esTreeNodeToTSNodeMap) return false;
      const tsNode = parserServices.esTreeNodeToTSNodeMap.get(expression);
      if (!tsNode) return false;
      return isDisallowedArrayType(checker.getTypeAtLocation(tsNode));
    }

    return {
      TSTypeAliasDeclaration(node: Rule.Node) {
        const declaration = node as {
          id?: { type?: string; name?: string };
          typeAnnotation?: Rule.Node;
        };
        if (!declaration.id || declaration.id.type !== 'Identifier' || !declaration.id.name) return;
        if (!declaration.typeAnnotation) return;
        localTypeAliases.set(declaration.id.name, declaration.typeAnnotation);
      },
      VariableDeclarator(node: Rule.Node) {
        const declaration = node as {
          id?: Rule.Node;
          init?: Rule.Node | null;
        };
        if (!declaration.id || declaration.id.type !== 'Identifier') return;
        const id = declaration.id as {
          name?: string;
          typeAnnotation?: { typeAnnotation?: Rule.Node };
        };
        const variableName = id.name;
        if (!variableName) return;

        if (isArrayLikeTypeNode(id.typeAnnotation?.typeAnnotation, new Set<string>())) {
          arrayTypedIdentifiers.add(variableName);
        }
        if (declaration.init?.type === 'ArrayExpression') {
          arrayTypedIdentifiers.add(variableName);
        }
        if (
          declaration.init &&
          (declaration.init.type === 'ArrowFunctionExpression' ||
            declaration.init.type === 'FunctionExpression')
        ) {
          const functionExpression = declaration.init as unknown as {
            returnType?: { typeAnnotation?: Rule.Node };
            body?: Rule.Node;
          };
          if (
            isArrayLikeTypeNode(functionExpression.returnType?.typeAnnotation, new Set<string>())
          ) {
            arrayReturningFunctions.add(variableName);
          }
          if (functionExpression.body?.type === 'ArrayExpression') {
            arrayReturningFunctions.add(variableName);
          }
        }
      },
      FunctionDeclaration(node: Rule.Node) {
        const declaration = node as {
          id?: { type?: string; name?: string } | null;
          returnType?: { typeAnnotation?: Rule.Node };
          body?: Rule.Node;
        };
        if (!declaration.id || declaration.id.type !== 'Identifier' || !declaration.id.name) return;
        const functionName = declaration.id.name;
        if (isArrayLikeTypeNode(declaration.returnType?.typeAnnotation, new Set<string>())) {
          arrayReturningFunctions.add(functionName);
        }
        const firstStatement = (declaration.body as { body?: Rule.Node[] } | undefined)
          ?.body?.[0] as { type?: string; argument?: Rule.Node } | undefined;
        if (
          firstStatement?.type === 'ReturnStatement' &&
          firstStatement.argument?.type === 'ArrayExpression'
        ) {
          arrayReturningFunctions.add(functionName);
        }
      },
      JSXAttribute(node: Rule.Node) {
        const attr = node as unknown as {
          name?: { type?: string; name?: string };
          value?: { type?: string } | null;
        };
        if (attr.name?.type !== 'JSXIdentifier' || !attr.name.name) return;
        if (!attr.value || attr.value.type !== 'JSXExpressionContainer') return;

        const expression = (attr.value as JSXExpressionContainer).expression;
        if (!expression) return;

        const isInlineArray = expression.type === 'ArrayExpression';
        const isArrayTyped = expressionHasArrayType(expression);
        const isArrayShapeByAst = expressionHasArrayShapeByAst(expression);
        if (!isInlineArray && !isArrayTyped && !isArrayShapeByAst) return;

        context.report({
          node: attr.value as unknown as Rule.Node,
          messageId: 'noArrayProps',
          data: { prop: attr.name.name },
        });
      },
    };
  },
};

export default rule;
