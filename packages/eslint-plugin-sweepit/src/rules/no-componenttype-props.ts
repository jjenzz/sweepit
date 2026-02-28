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

function isComponentTypeProp(
  typeNode: unknown,
  resolveAliasType?: (name: string) => unknown | null,
  seenAliases: Set<string> = new Set<string>(),
): boolean {
  if (!typeNode || typeof typeNode !== 'object') return false;
  const n = typeNode as Record<string, unknown>;
  if (n.type === 'TSTypeReference') {
    const ref = n as unknown as TSTypeReferenceNode;
    const name = getTypeNameFromRef(ref);
    if (name !== null && FORBIDDEN_TYPE_NAMES.has(name)) return true;
    if (!name || !resolveAliasType || seenAliases.has(name)) return false;
    const aliasType = resolveAliasType(name);
    if (!aliasType) return false;
    const nextSeenAliases = new Set(seenAliases);
    nextSeenAliases.add(name);
    return isComponentTypeProp(aliasType, resolveAliasType, nextSeenAliases);
  }
  if (n.type === 'TSUnionType' || n.type === 'TSIntersectionType') {
    const union = n as { types?: unknown[] };
    return (union.types ?? []).some((t) => isComponentTypeProp(t, resolveAliasType, seenAliases));
  }
  if (n.type === 'TSOptionalType') {
    const opt = n as { typeAnnotation?: unknown };
    return isComponentTypeProp(opt.typeAnnotation, resolveAliasType, seenAliases);
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

function isComponentPropsContractName(name: string | undefined): boolean {
  return name?.endsWith('Props') ?? false;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow ComponentType/FC/FunctionComponent in prop definitions. Prefer asChild or render prop for polymorphism.',
      url: 'https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-componenttype-props.md',
    },
    messages: {
      noComponentTypeProps:
        "Prop '{{prop}}' has a component type. Use asChild or a render prop for polymorphism.",
    },
    schema: [],
  },
  create(context) {
    const localTypeAliases = new Map<string, unknown>();

    function checkProp(prop: TSPropertySignatureNode) {
      const name = getPropKeyName(prop);
      if (!name) return;
      const typeAnn = prop.typeAnnotation?.typeAnnotation;
      if (!typeAnn) return;
      if (!isComponentTypeProp(typeAnn, (aliasName) => localTypeAliases.get(aliasName) ?? null)) {
        return;
      }
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
        const typeAliasName = decl.id?.name;
        if (typeAliasName) {
          localTypeAliases.set(typeAliasName, decl.typeAnnotation);
        }
        if (!isComponentPropsContractName(typeAliasName)) return;
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
