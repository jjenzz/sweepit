import type { Rule } from 'eslint';

interface TSPropertySignatureNode {
  type: string;
  key: { type: string; name?: string };
  typeAnnotation?: { typeAnnotation: unknown };
}

interface TSInterfaceBodyNode {
  type: string;
  body: TSPropertySignatureNode[];
}

interface TSInterfaceDeclarationNode {
  type: string;
  id?: { type: string; name?: string };
  body: TSInterfaceBodyNode;
}

interface TSTypeLiteralNode {
  type: string;
  members: TSPropertySignatureNode[];
}

interface TSTypeAliasDeclarationNode {
  type: string;
  id?: { type: string; name?: string };
  typeAnnotation: unknown;
}

interface TSTypeReferenceNode {
  type: string;
  typeName:
    | { type: string; name?: string }
    | {
        type: string;
        left: { type: string; name?: string };
        right: { type: string; name?: string };
      };
}

function getPropKeyName(prop: TSPropertySignatureNode): string | null {
  const key = prop.key;
  if (key.type === 'Identifier' && 'name' in key) return key.name ?? null;
  return null;
}

function getPropsFromInterfaceBody(body: TSInterfaceBodyNode): TSPropertySignatureNode[] {
  return body.body ?? [];
}

function getPropsFromTypeLiteral(typeNode: unknown): TSPropertySignatureNode[] {
  const n = typeNode as TSTypeLiteralNode;
  if (n && n.type === 'TSTypeLiteral' && Array.isArray(n.members)) return n.members;
  return [];
}

function isComponentPropsContractName(name: string | undefined): boolean {
  return name?.endsWith('Props') ?? false;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow ReactNode/ReactElement-typed props except children/render.',
      url: 'https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-element-props.md',
    },
    messages: {
      noElementProps:
        "Prop '{{prop}}' has an element type. Use compound composition via children or parts instead.",
    },
    schema: [],
  },
  create(context) {
    const aliasTypeMap = new Map<string, unknown>();

    function getTypeNameFromRef(node: TSTypeReferenceNode): string | null {
      const typeName = node.typeName as {
        type: string;
        name?: string;
        right?: { name?: string };
      };
      if ('name' in typeName && typeName.name) return typeName.name;
      if ('right' in typeName && typeName.right?.name) return typeName.right.name;
      return null;
    }

    function astContainsReactElementType(typeNode: unknown, visitedAliases: Set<string>): boolean {
      if (!typeNode || typeof typeNode !== 'object') return false;
      const node = typeNode as Record<string, unknown>;

      if (node.type === 'TSTypeReference') {
        const ref = node as unknown as TSTypeReferenceNode;
        const typeName = getTypeNameFromRef(ref);
        if (typeName === 'ReactNode' || typeName === 'ReactElement') return true;
        if (typeName && aliasTypeMap.has(typeName) && !visitedAliases.has(typeName)) {
          visitedAliases.add(typeName);
          return astContainsReactElementType(aliasTypeMap.get(typeName), visitedAliases);
        }
        return false;
      }

      if (node.type === 'TSUnionType' || node.type === 'TSIntersectionType') {
        const unionNode = node as { types?: unknown[] };
        return (unionNode.types ?? []).some((entry) =>
          astContainsReactElementType(entry, visitedAliases),
        );
      }

      if (node.type === 'TSOptionalType' || node.type === 'TSParenthesizedType') {
        const wrapped = node as { typeAnnotation?: unknown };
        return astContainsReactElementType(wrapped.typeAnnotation, visitedAliases);
      }

      return false;
    }

    function checkProp(prop: TSPropertySignatureNode, reportNode: Rule.Node) {
      const name = getPropKeyName(prop);
      if (!name) return;
      const typeAnn = prop.typeAnnotation?.typeAnnotation;
      const hasElementType = astContainsReactElementType(typeAnn, new Set());
      if (hasElementType && name !== 'children' && name !== 'render') {
        context.report({
          node: reportNode,
          messageId: 'noElementProps',
          data: { prop: name },
        });
      }
    }

    function visitProps(props: TSPropertySignatureNode[]) {
      for (const prop of props) {
        if (prop.type !== 'TSPropertySignature') continue;
        checkProp(prop, prop.key as Rule.Node);
      }
    }

    const pendingChecks: Array<() => void> = [];

    return {
      TSInterfaceDeclaration(node: Rule.Node) {
        const decl = node as unknown as TSInterfaceDeclarationNode;
        if (!isComponentPropsContractName(decl.id?.name)) return;
        if (decl.body?.type === 'TSInterfaceBody') {
          const props = getPropsFromInterfaceBody(decl.body);
          pendingChecks.push(() => visitProps(props));
        }
      },
      TSTypeAliasDeclaration(node: Rule.Node) {
        const decl = node as unknown as TSTypeAliasDeclarationNode;
        if (decl.id?.type === 'Identifier' && decl.id.name && decl.typeAnnotation) {
          aliasTypeMap.set(decl.id.name, decl.typeAnnotation);
        }
        if (!isComponentPropsContractName(decl.id?.name)) return;
        const typeAnn = decl.typeAnnotation;
        if (typeAnn) {
          const props = getPropsFromTypeLiteral(typeAnn);
          pendingChecks.push(() => visitProps(props));
        }
      },
      'Program:exit'() {
        for (const check of pendingChecks) check();
      },
    };
  },
};

export default rule;
