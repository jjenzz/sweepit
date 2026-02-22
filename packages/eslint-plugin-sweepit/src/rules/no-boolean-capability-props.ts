import type { Rule } from 'eslint';
import ts from 'typescript';

interface IdentifierLike {
  type: 'Identifier';
  name: string;
}

interface LiteralLike {
  type: 'Literal';
  value: string | number | boolean | null;
}

interface TSPropertySignatureNode {
  type: 'TSPropertySignature';
  key: IdentifierLike | LiteralLike;
  typeAnnotation?: {
    typeAnnotation?: Rule.Node;
  };
}

interface TSInterfaceDeclarationNode {
  id?: IdentifierLike;
  body?: {
    type?: string;
    body?: Rule.Node[];
  };
}

interface TSTypeAliasDeclarationNode {
  id?: IdentifierLike;
  typeAnnotation?: {
    type?: string;
    members?: Rule.Node[];
  };
}

function getPropName(node: IdentifierLike | LiteralLike): string | null {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

function isBooleanLikeType(typeNode: Rule.Node | undefined): boolean {
  if (!typeNode) return false;
  const maybeType = typeNode as {
    type?: string;
    typeAnnotation?: Rule.Node;
    types?: Rule.Node[];
    literal?: { value?: unknown };
  };

  if (maybeType.type === 'TSBooleanKeyword') return true;

  if (maybeType.type === 'TSLiteralType') {
    const literalValue = maybeType.literal?.value;
    return literalValue === true || literalValue === false;
  }

  if (maybeType.type === 'TSParenthesizedType' || maybeType.type === 'TSOptionalType') {
    return isBooleanLikeType(maybeType.typeAnnotation);
  }

  if (maybeType.type === 'TSUnionType' || maybeType.type === 'TSIntersectionType') {
    return (maybeType.types ?? []).some((member) => isBooleanLikeType(member));
  }

  return false;
}

function getParserServices(context: Rule.RuleContext): {
  program?: ts.Program;
  esTreeNodeToTSNodeMap?: Map<unknown, ts.Node>;
} | null {
  return (
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
    ).parserServices ??
    null
  );
}

function isBooleanLikeTypeFromTypeChecker(
  typeNode: Rule.Node | undefined,
  checker: ts.TypeChecker | undefined,
  parserServices: { esTreeNodeToTSNodeMap?: Map<unknown, ts.Node> } | null,
): boolean {
  if (!typeNode || !checker || !parserServices?.esTreeNodeToTSNodeMap) return false;
  const tsNode = parserServices.esTreeNodeToTSNodeMap.get(typeNode);
  if (!tsNode) return false;
  const resolvedType = checker.getTypeAtLocation(tsNode);

  function isBooleanType(type: ts.Type): boolean {
    if (type.isUnionOrIntersection()) {
      return type.types.some((member) => isBooleanType(member));
    }
    if ((type.flags & ts.TypeFlags.Boolean) !== 0) return true;
    if ((type.flags & ts.TypeFlags.BooleanLiteral) !== 0) return true;
    return false;
  }

  return isBooleanType(resolvedType);
}

function isHandlerPropName(name: string): boolean {
  if (!name.startsWith('on') || name.length <= 2) return false;
  const firstCharAfterPrefix = name[2];
  return firstCharAfterPrefix >= 'A' && firstCharAfterPrefix <= 'Z';
}

function isFunctionLikeType(typeNode: Rule.Node | undefined): boolean {
  if (!typeNode) return false;
  const maybeType = typeNode as {
    type?: string;
    typeAnnotation?: Rule.Node;
    types?: Rule.Node[];
  };

  if (maybeType.type === 'TSFunctionType') return true;
  if (maybeType.type === 'TSParenthesizedType' || maybeType.type === 'TSOptionalType') {
    return isFunctionLikeType(maybeType.typeAnnotation);
  }
  if (maybeType.type === 'TSUnionType' || maybeType.type === 'TSIntersectionType') {
    return (maybeType.types ?? []).some((member) => isFunctionLikeType(member));
  }
  return false;
}

function capitalize(value: string): string {
  if (!value) return value;
  return value[0].toUpperCase() + value.slice(1);
}

function isComponentPropsContractName(name: string | undefined): boolean {
  return name?.endsWith('Props') ?? false;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow boolean component props without associated control handlers in prop contracts',
      url: 'https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-boolean-capability-props.md',
    },
    messages: {
      noBooleanCapabilityProp:
        "Boolean prop '{{prop}}' has no associated control handler starting with '{{handlerPrefix}}'. Each boolean doubles possible states and adds hidden variants. Prefer explicit handlers or compound composition. AI agents: add a matching `on{Prop}` handler or split this into composed variants. See: https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-boolean-capability-props.md.",
    },
    schema: [],
  },
  create(context) {
    const parserServices = getParserServices(context);
    const checker = parserServices?.program?.getTypeChecker();

    function checkMembers(members: Rule.Node[]) {
      const booleanProps: Array<{ name: string; node: TSPropertySignatureNode }> = [];
      const handlerProps = new Set<string>();

      for (const memberNode of members) {
        const maybeProperty = memberNode as unknown as TSPropertySignatureNode;
        if (maybeProperty.type !== 'TSPropertySignature') continue;

        const propName = getPropName(maybeProperty.key);
        if (!propName) continue;

        const typeNode = maybeProperty.typeAnnotation?.typeAnnotation;
        if (isFunctionLikeType(typeNode) && isHandlerPropName(propName)) {
          handlerProps.add(propName);
          continue;
        }

        if (
          !isBooleanLikeType(typeNode) &&
          !isBooleanLikeTypeFromTypeChecker(typeNode, checker, parserServices)
        ) {
          continue;
        }
        booleanProps.push({ name: propName, node: maybeProperty });
      }

      for (const booleanProp of booleanProps) {
        const handlerPrefix = `on${capitalize(booleanProp.name)}`;
        const hasAssociatedHandler = [...handlerProps].some((handlerName) =>
          handlerName.startsWith(handlerPrefix),
        );
        if (hasAssociatedHandler) continue;

        context.report({
          node: booleanProp.node.key as unknown as Rule.Node,
          messageId: 'noBooleanCapabilityProp',
          data: { prop: booleanProp.name, handlerPrefix },
        });
      }
    }

    return {
      TSInterfaceDeclaration(node: Rule.Node) {
        const declaration = node as unknown as TSInterfaceDeclarationNode;
        if (!isComponentPropsContractName(declaration.id?.name)) return;
        if (declaration.body?.type !== 'TSInterfaceBody') return;
        checkMembers(declaration.body.body ?? []);
      },
      TSTypeAliasDeclaration(node: Rule.Node) {
        const declaration = node as unknown as TSTypeAliasDeclarationNode;
        if (!isComponentPropsContractName(declaration.id?.name)) return;
        const typeAnnotation = declaration.typeAnnotation;
        if (!typeAnnotation || typeAnnotation.type !== 'TSTypeLiteral') return;
        checkMembers(typeAnnotation.members ?? []);
      },
    };
  },
};

export default rule;
