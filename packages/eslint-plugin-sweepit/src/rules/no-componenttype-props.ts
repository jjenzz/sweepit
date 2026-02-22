import type { Rule } from 'eslint';
import ts from 'typescript';

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

function isForbiddenSymbolName(symbol: ts.Symbol | undefined): boolean {
  if (!symbol) return false;
  return FORBIDDEN_TYPE_NAMES.has(symbol.getName());
}

function isForbiddenComponentType(
  type: ts.Type,
  checker: ts.TypeChecker,
  seenSymbols: Set<ts.Symbol>,
): boolean {
  if (type.isUnionOrIntersection()) {
    return type.types.some((part) => isForbiddenComponentType(part, checker, seenSymbols));
  }

  if (isForbiddenSymbolName(type.aliasSymbol) || isForbiddenSymbolName(type.getSymbol())) {
    return true;
  }

  const symbol = type.aliasSymbol ?? type.getSymbol();
  if (!symbol || seenSymbols.has(symbol)) return false;
  seenSymbols.add(symbol);

  const declarations = symbol.getDeclarations() ?? [];
  for (const declaration of declarations) {
    if (ts.isTypeAliasDeclaration(declaration)) {
      const aliasedType = checker.getTypeFromTypeNode(declaration.type);
      if (isForbiddenComponentType(aliasedType, checker, seenSymbols)) return true;
      continue;
    }
    if (ts.isInterfaceDeclaration(declaration)) {
      const heritageClauses = declaration.heritageClauses ?? [];
      for (const heritageClause of heritageClauses) {
        for (const heritageType of heritageClause.types) {
          const heritageTsType = checker.getTypeAtLocation(heritageType);
          if (isForbiddenComponentType(heritageTsType, checker, seenSymbols)) return true;
        }
      }
    }
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
      url: 'https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-componenttype-props.md',
    },
    messages: {
      noComponentTypeProps:
        "Prop '{{prop}}' uses ComponentType/FC/FunctionComponent. Prefer asChild or a render prop for polymorphism. AI agents: replace component-constructor props with composition or explicit render callbacks. See: https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-componenttype-props.md.",
    },
    schema: [],
  },
  create(context) {
    const parserServices = getParserServices(context);
    const checker = parserServices?.program?.getTypeChecker();
    const localTypeAliases = new Map<string, unknown>();

    function isComponentTypePropByResolvedType(typeNode: unknown): boolean {
      if (!checker || !parserServices?.esTreeNodeToTSNodeMap) return false;
      const tsNode = parserServices.esTreeNodeToTSNodeMap.get(typeNode);
      if (!tsNode) return false;
      const resolvedType = checker.getTypeAtLocation(tsNode);
      return isForbiddenComponentType(resolvedType, checker, new Set<ts.Symbol>());
    }

    function checkProp(prop: TSPropertySignatureNode) {
      const name = getPropKeyName(prop);
      if (!name) return;
      const typeAnn = prop.typeAnnotation?.typeAnnotation;
      if (!typeAnn) return;
      if (
        !isComponentTypeProp(
          typeAnn,
          (aliasName) => localTypeAliases.get(aliasName) ?? null,
        ) &&
        !isComponentTypePropByResolvedType(typeAnn)
      ) {
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

    return {
      TSInterfaceDeclaration(node: Rule.Node) {
        const decl = node as unknown as TSInterfaceDeclarationNode;
        if (!isComponentPropsContractName(decl.id?.name)) return;
        if (decl.body?.type === 'TSInterfaceBody') {
          visitProps(getPropsFromInterfaceBody(decl.body));
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
          visitProps(getPropsFromTypeLiteral(typeAnn));
        }
      },
    };
  },
};

export default rule;
