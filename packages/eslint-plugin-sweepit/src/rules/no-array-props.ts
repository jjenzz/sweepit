import type { Rule } from 'eslint';
import type ts from 'typescript';

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

function getPropertyName(node: Rule.Node | undefined): string | null {
  if (!node) return null;
  const typedNode = node as {
    type?: string;
    name?: string;
    value?: string;
  };
  if (typedNode.type === 'Identifier' && typedNode.name) return typedNode.name;
  if (typedNode.type === 'Literal' && typeof typedNode.value === 'string') return typedNode.value;
  return null;
}

function isPropsTypeName(name: string | undefined): boolean {
  return Boolean(name?.endsWith('Props'));
}

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

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow array-typed members in TypeScript type definitions whose name ends with Props',
      url: 'https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-array-props.md',
    },
    messages: {
      noArrayProps:
        "Array type for '{{prop}}' in '{{propsType}}'. Prefer primitive props and compound composition.",
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
    const localTypeAliases = new Map<string, Rule.Node>();
    const disallowedArrayTypeCache = new WeakMap<object, boolean>();

    function isDisallowedArrayType(type: ts.Type | undefined): boolean {
      if (!type || !checker) return false;
      const cached = disallowedArrayTypeCache.get(type as unknown as object);
      if (cached !== undefined) return cached;

      let result = false;
      if (type.isUnionOrIntersection()) {
        result = type.types.some((entry) => isDisallowedArrayType(entry));
      } else if (checker.isArrayType(type) || checker.isTupleType(type)) {
        result = true;
      } else {
        result = isArrayLikeTypeText(checker.typeToString(type));
      }
      disallowedArrayTypeCache.set(type as unknown as object, result);
      return result;
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
        seenAliases.add(typeName);
        const result = isArrayLikeTypeNode(aliasType, seenAliases);
        seenAliases.delete(typeName);
        return result;
      }
      return false;
    }

    function memberHasArrayType(typeAnnotationNode: Rule.Node | undefined): boolean {
      if (!typeAnnotationNode) return false;
      const annotationNode = (typeAnnotationNode as { typeAnnotation?: Rule.Node }).typeAnnotation;
      if (!annotationNode) return false;

      if (isArrayLikeTypeNode(annotationNode, new Set<string>())) return true;

      if (hasTypeInformation && checker && parserServices?.esTreeNodeToTSNodeMap) {
        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(annotationNode);
        if (tsNode && isDisallowedArrayType(checker.getTypeAtLocation(tsNode))) return true;
      }

      return false;
    }

    function reportIfDisallowedMember(member: Rule.Node, propsTypeName: string): void {
      const property = member as {
        type?: string;
        key?: Rule.Node;
        typeAnnotation?: Rule.Node;
      };
      if (property.type !== 'TSPropertySignature' || !property.typeAnnotation) return;
      if (!memberHasArrayType(property.typeAnnotation)) return;
      const propName = getPropertyName(property.key) ?? '(unknown)';
      context.report({
        node: member,
        messageId: 'noArrayProps',
        data: { prop: propName, propsType: propsTypeName },
      });
    }

    function visitPropsType(
      typeNode: Rule.Node | undefined,
      propsTypeName: string,
      seenAliases: Set<string>,
    ): void {
      if (!typeNode) return;
      const typedNode = typeNode as {
        type?: string;
        members?: Rule.Node[];
        types?: Rule.Node[];
        typeAnnotation?: Rule.Node;
        typeName?: Rule.Node;
      };

      if (typedNode.type === 'TSTypeLiteral') {
        for (const member of typedNode.members ?? []) {
          reportIfDisallowedMember(member, propsTypeName);
        }
        return;
      }

      if (typedNode.type === 'TSUnionType' || typedNode.type === 'TSIntersectionType') {
        for (const entry of typedNode.types ?? []) {
          visitPropsType(entry, propsTypeName, seenAliases);
        }
        return;
      }

      if (
        typedNode.type === 'TSParenthesizedType' ||
        typedNode.type === 'TSOptionalType' ||
        typedNode.type === 'TSTypeOperator'
      ) {
        visitPropsType(typedNode.typeAnnotation, propsTypeName, seenAliases);
        return;
      }

      if (typedNode.type === 'TSTypeReference') {
        const typeName = getTypeName(typedNode.typeName);
        if (!typeName || seenAliases.has(typeName)) return;
        const aliasType = localTypeAliases.get(typeName);
        if (!aliasType) return;
        seenAliases.add(typeName);
        visitPropsType(aliasType, propsTypeName, seenAliases);
        seenAliases.delete(typeName);
      }
    }

    return {
      TSTypeAliasDeclaration(node: Rule.Node) {
        const declaration = node as {
          id?: { type?: string; name?: string };
          typeAnnotation?: Rule.Node;
        };
        if (declaration.id?.type !== 'Identifier' || !declaration.id?.name) return;
        if (!declaration.typeAnnotation) return;

        localTypeAliases.set(declaration.id.name, declaration.typeAnnotation);
        if (!isPropsTypeName(declaration.id.name)) return;
        visitPropsType(declaration.typeAnnotation, declaration.id.name, new Set<string>());
      },
      TSInterfaceDeclaration(node: Rule.Node) {
        const declaration = node as {
          id?: { type?: string; name?: string };
          body?: { body?: Rule.Node[] };
        };
        if (declaration.id?.type !== 'Identifier' || !declaration.id?.name) return;
        if (!isPropsTypeName(declaration.id.name)) return;

        for (const member of declaration.body?.body ?? []) {
          reportIfDisallowedMember(member, declaration.id.name);
        }
      },
    };
  },
};

export default rule;
