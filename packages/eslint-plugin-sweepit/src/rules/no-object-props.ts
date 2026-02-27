import type { Rule } from 'eslint';
import ts from 'typescript';

interface RuleOptions {
  ignore?: string[];
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

function isCompositeType(type: string | undefined): boolean {
  return type === 'TSUnionType' || type === 'TSIntersectionType';
}

function isWrapperType(type: string | undefined): boolean {
  return type === 'TSParenthesizedType' || type === 'TSOptionalType' || type === 'TSTypeOperator';
}

function globToRegex(globPattern: string): RegExp {
  const escaped = globPattern.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '.*')}$`);
}

function createIgnoredPropMatcher(ignorePatterns: string[]): (propName: string) => boolean {
  const regexes = ignorePatterns.map(globToRegex);
  return (propName: string) => regexes.some((regex) => regex.test(propName));
}
const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow object-typed members in TypeScript type definitions whose name ends with Props',
      url: 'https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-object-props.md',
    },
    messages: {
      noObjectProps:
        "Object type for '{{prop}}' in '{{propsType}}'. Prefer primitive props and compound composition.",
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignore: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = (context.options[0] as RuleOptions | undefined) ?? {};
    const isIgnoredPropName = createIgnoredPropMatcher(options.ignore ?? []);
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
    const disallowedObjectTypeCache = new WeakMap<object, boolean>();

    function isDisallowedObjectType(type: ts.Type | undefined): boolean {
      if (!type || !checker) return false;
      const cached = disallowedObjectTypeCache.get(type as unknown as object);
      if (cached !== undefined) return cached;

      let result = false;
      if (type.isUnionOrIntersection()) {
        result = type.types.some((entry) => isDisallowedObjectType(entry));
      } else if (checker.isArrayType(type) || checker.isTupleType(type)) {
        result = false;
      } else if (checker.getSignaturesOfType(type, ts.SignatureKind.Call).length > 0) {
        result = false;
      } else if (checker.getSignaturesOfType(type, ts.SignatureKind.Construct).length > 0) {
        result = false;
      } else {
        result =
          (type.flags & ts.TypeFlags.Object) !== 0 ||
          (type.flags & ts.TypeFlags.NonPrimitive) !== 0;
      }

      disallowedObjectTypeCache.set(type as unknown as object, result);
      return result;
    }

    function memberHasObjectType(typeAnnotationNode: Rule.Node | undefined): boolean {
      if (!typeAnnotationNode) return false;
      const annotationNode = (typeAnnotationNode as { typeAnnotation?: Rule.Node }).typeAnnotation;
      if (!annotationNode) return false;

      if (isObjectLikeTypeNode(annotationNode)) return true;

      if (hasTypeInformation && checker && parserServices?.esTreeNodeToTSNodeMap) {
        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(annotationNode);
        if (tsNode && isDisallowedObjectType(checker.getTypeAtLocation(tsNode))) return true;
      }

      return false;
    }

    function isObjectLikeTypeNode(typeNode: Rule.Node | undefined): boolean {
      if (!typeNode) return false;
      const typedNode = typeNode as {
        type?: string;
        types?: Rule.Node[];
        typeAnnotation?: Rule.Node;
      };
      if (typedNode.type === 'TSTypeLiteral') return true;
      if (typedNode.type === 'TSParenthesizedType' || typedNode.type === 'TSOptionalType') {
        return isObjectLikeTypeNode(typedNode.typeAnnotation);
      }
      if (typedNode.type === 'TSUnionType' || typedNode.type === 'TSIntersectionType') {
        return (typedNode.types ?? []).some((entry) => isObjectLikeTypeNode(entry));
      }
      return false;
    }

    function visitTypeEntries(
      entries: Rule.Node[] | undefined,
      propsTypeName: string,
      seenAliases: Set<string>,
    ): void {
      for (const entry of entries ?? []) {
        visitPropsType(entry, propsTypeName, seenAliases);
      }
    }

    function visitReferencedAlias(
      typeNameNode: Rule.Node | undefined,
      propsTypeName: string,
      seenAliases: Set<string>,
    ): void {
      const typeName = getTypeName(typeNameNode);
      if (!typeName || seenAliases.has(typeName)) return;
      const aliasType = localTypeAliases.get(typeName);
      if (!aliasType) return;
      seenAliases.add(typeName);
      visitPropsType(aliasType, propsTypeName, seenAliases);
      seenAliases.delete(typeName);
    }

    function reportDisallowedObjectMembers(
      members: Rule.Node[] | undefined,
      propsTypeName: string,
    ): void {
      for (const member of members ?? []) {
        const property = member as {
          type?: string;
          key?: Rule.Node;
          typeAnnotation?: Rule.Node;
        };
        if (property.type !== 'TSPropertySignature' || !property.typeAnnotation) continue;
        const propName = getPropertyName(property.key);
        if (!propName || propName === 'style' || isIgnoredPropName(propName)) continue;
        if (!memberHasObjectType(property.typeAnnotation)) continue;
        context.report({
          node: member,
          messageId: 'noObjectProps',
          data: { prop: propName, propsType: propsTypeName },
        });
      }
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
        reportDisallowedObjectMembers(typedNode.members, propsTypeName);
        return;
      }

      if (isCompositeType(typedNode.type)) {
        visitTypeEntries(typedNode.types, propsTypeName, seenAliases);
        return;
      }

      if (isWrapperType(typedNode.type)) {
        visitPropsType(typedNode.typeAnnotation, propsTypeName, seenAliases);
        return;
      }

      if (typedNode.type !== 'TSTypeReference') return;
      visitReferencedAlias(typedNode.typeName, propsTypeName, seenAliases);
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
        reportDisallowedObjectMembers(declaration.body?.body, declaration.id.name);
      },
    };
  },
};

export default rule;
