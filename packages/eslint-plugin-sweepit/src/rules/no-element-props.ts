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
  body: TSInterfaceBodyNode;
}

interface TSTypeLiteralNode {
  type: string;
  members: TSPropertySignatureNode[];
}

interface TSTypeAliasDeclarationNode {
  type: string;
  typeAnnotation: unknown;
}

interface TSTypeReferenceNode {
  type: string;
  typeName:
    | { type: string; name: string }
    | { type: string; left: { name: string }; right: { name: string } };
}

const REACT_NODE_NAMES = ['ReactNode'];
const REACT_ELEMENT_NAMES = ['ReactElement'];

function getTypeNameFromRef(node: TSTypeReferenceNode): string | null {
  const tn = node.typeName as { type: string; name?: string; right?: { name: string } };
  if ('name' in tn && tn.name) return tn.name;
  if ('right' in tn && tn.right) return tn.right.name;
  return null;
}

function isReactNodeType(typeNode: unknown): boolean {
  if (!typeNode || typeof typeNode !== 'object') return false;
  const n = typeNode as Record<string, unknown>;
  if (n.type === 'TSTypeReference') {
    const ref = n as unknown as TSTypeReferenceNode;
    const name = getTypeNameFromRef(ref);
    if (name && REACT_NODE_NAMES.includes(name)) return true;
    if (ref.typeName.type === 'TSQualifiedName') {
      const qn = ref.typeName as { left: { name: string }; right: { name: string } };
      if (qn.right.name === 'ReactNode') return true;
    }
  }
  if (n.type === 'TSUnionType' || n.type === 'TSIntersectionType') {
    const union = n as { types?: unknown[] };
    return (union.types ?? []).some((t) => isReactNodeType(t));
  }
  if (n.type === 'TSOptionalType') {
    const opt = n as { typeAnnotation?: unknown };
    return isReactNodeType(opt.typeAnnotation);
  }
  return false;
}

function isReactElementType(typeNode: unknown): boolean {
  if (!typeNode || typeof typeNode !== 'object') return false;
  const n = typeNode as Record<string, unknown>;
  if (n.type === 'TSTypeReference') {
    const ref = n as unknown as TSTypeReferenceNode;
    const name = getTypeNameFromRef(ref);
    if (name && REACT_ELEMENT_NAMES.includes(name)) return true;
    if (ref.typeName.type === 'TSQualifiedName') {
      const qn = ref.typeName as { left: { name: string }; right: { name: string } };
      if (qn.right.name === 'ReactElement') return true;
    }
  }
  if (n.type === 'TSUnionType' || n.type === 'TSIntersectionType') {
    const union = n as { types?: unknown[] };
    return (union.types ?? []).some((t) => isReactElementType(t));
  }
  if (n.type === 'TSOptionalType') {
    const opt = n as { typeAnnotation?: unknown };
    return isReactElementType(opt.typeAnnotation);
  }
  return false;
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

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow ReactNode-typed props except children and ReactElement-typed props except render.',
    },
    messages: {
      noElementPropsReactNode:
        "Prop '{{prop}}' has type ReactNode. Only children may be typed as ReactNode.",
      noElementPropsReactElement:
        "Prop '{{prop}}' has type ReactElement. Only render may be typed as ReactElement.",
    },
    schema: [],
  },
  create(context) {
    function checkProp(prop: TSPropertySignatureNode, reportNode: Rule.Node) {
      const name = getPropKeyName(prop);
      if (!name) return;
      const typeAnn = prop.typeAnnotation?.typeAnnotation;

      if (isReactNodeType(typeAnn)) {
        if (name !== 'children') {
          context.report({
            node: reportNode,
            messageId: 'noElementPropsReactNode',
            data: { prop: name },
          });
        }
        return;
      }

      if (isReactElementType(typeAnn)) {
        if (name !== 'render') {
          context.report({
            node: reportNode,
            messageId: 'noElementPropsReactElement',
            data: { prop: name },
          });
        }
      }
    }

    function visitProps(props: TSPropertySignatureNode[]) {
      for (const prop of props) {
        if (prop.type !== 'TSPropertySignature') continue;
        checkProp(prop, prop.key as Rule.Node);
      }
    }

    return {
      TSInterfaceDeclaration(node: Rule.Node) {
        const decl = node as unknown as TSInterfaceDeclarationNode;
        if (decl.body?.type === 'TSInterfaceBody') {
          visitProps(getPropsFromInterfaceBody(decl.body));
        }
      },
      TSTypeAliasDeclaration(node: Rule.Node) {
        const decl = node as unknown as TSTypeAliasDeclarationNode;
        const typeAnn = decl.typeAnnotation;
        if (typeAnn) {
          visitProps(getPropsFromTypeLiteral(typeAnn));
        }
      },
    };
  },
};

export default rule;
