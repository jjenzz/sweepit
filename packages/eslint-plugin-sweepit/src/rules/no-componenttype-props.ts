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

const FORBIDDEN_TYPE_NAMES = new Set(['ComponentType', 'FC', 'FunctionComponent']);

function getTypeNameFromRef(node: TSTypeReferenceNode): string | null {
  const tn = node.typeName as {
    type: string;
    name?: string;
    right?: { name: string };
  };
  if ('name' in tn && tn.name) return tn.name;
  if ('right' in tn && tn.right) return tn.right.name;
  return null;
}

function isComponentTypeProp(typeNode: unknown): boolean {
  if (!typeNode || typeof typeNode !== 'object') return false;
  const n = typeNode as Record<string, unknown>;
  if (n.type === 'TSTypeReference') {
    const ref = n as unknown as TSTypeReferenceNode;
    const name = getTypeNameFromRef(ref);
    return name !== null && FORBIDDEN_TYPE_NAMES.has(name);
  }
  if (n.type === 'TSUnionType' || n.type === 'TSIntersectionType') {
    const union = n as { types?: unknown[] };
    return (union.types ?? []).some((t) => isComponentTypeProp(t));
  }
  if (n.type === 'TSOptionalType') {
    const opt = n as { typeAnnotation?: unknown };
    return isComponentTypeProp(opt.typeAnnotation);
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
        'Disallow ComponentType/FC/FunctionComponent in prop definitions. Prefer asChild or render prop for polymorphism.',
    },
    messages: {
      noComponentTypeProps:
        "Prop '{{prop}}' uses ComponentType/FC/FunctionComponent. Prefer asChild or a render prop for polymorphism.",
    },
    schema: [],
  },
  create(context) {
    function checkProp(prop: TSPropertySignatureNode) {
      const name = getPropKeyName(prop);
      if (!name) return;
      const typeAnn = prop.typeAnnotation?.typeAnnotation;
      if (!isComponentTypeProp(typeAnn)) return;
      context.report({
        node: prop.key as Rule.Node,
        messageId: 'noComponentTypeProps',
        data: { prop: name },
      });
    }

    function visitProps(props: TSPropertySignatureNode[]) {
      for (const prop of props) {
        if (prop.type !== 'TSPropertySignature') continue;
        checkProp(prop);
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
