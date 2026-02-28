import type { Rule } from 'eslint';

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
}

interface TSInterfaceBodyNode {
  type: 'TSInterfaceBody';
  body: Rule.Node[];
}

interface TSTypeLiteralNode {
  type: 'TSTypeLiteral';
  members: Rule.Node[];
}

interface TSInterfaceDeclarationNode {
  type: 'TSInterfaceDeclaration';
  id?: IdentifierLike;
  body: TSInterfaceBodyNode;
}

interface TSTypeAliasDeclarationNode {
  type: 'TSTypeAliasDeclaration';
  id?: IdentifierLike;
  typeAnnotation?: Rule.Node;
}

interface RuleOptions {
  threshold?: number;
}

const DEFAULT_THRESHOLD = 3;
const IGNORED_PREFIXES = new Set(['aria', 'can', 'data', 'has', 'is', 'on', 'should']);

function getBundlePrefix(propName: string): string | null {
  if (!propName) return null;
  const first = propName[0];
  if (!first || first < 'a' || first > 'z') return null;

  let firstUpperIndex = -1;
  for (let index = 1; index < propName.length; index += 1) {
    const char = propName[index];
    if (char >= 'A' && char <= 'Z') {
      firstUpperIndex = index;
      break;
    }
  }

  if (firstUpperIndex <= 0 || firstUpperIndex >= propName.length) return null;
  const prefix = propName.slice(0, firstUpperIndex);
  if (!prefix || IGNORED_PREFIXES.has(prefix)) return null;
  return prefix;
}

function getPropName(node: TSPropertySignatureNode): string | null {
  const key = node.key;
  if (key.type === 'Identifier') return key.name;
  if (key.type === 'Literal' && typeof key.value === 'string') return key.value;
  return null;
}

function reportPrefixedPropBundle(
  context: Rule.RuleContext,
  properties: TSPropertySignatureNode[],
  prefix: string,
): void {
  for (const property of properties) {
    const propName = getPropName(property);
    if (!propName) continue;
    context.report({
      node: property.key as unknown as Rule.Node,
      messageId: 'noPrefixedPropBundle',
      data: {
        prop: propName,
        prefix,
        count: String(properties.length),
      },
    });
  }
}

function checkMembersForPrefixedBundles(
  context: Rule.RuleContext,
  members: Rule.Node[],
  threshold: number,
): void {
  const groups = new Map<string, TSPropertySignatureNode[]>();

  for (const memberNode of members) {
    const maybeProperty = memberNode as { type?: string };
    if (maybeProperty.type !== 'TSPropertySignature') continue;
    const property = memberNode as unknown as TSPropertySignatureNode;
    const propName = getPropName(property);
    if (!propName) continue;

    const prefix = getBundlePrefix(propName);
    if (!prefix) continue;

    const existing = groups.get(prefix);
    if (existing) {
      existing.push(property);
      continue;
    }
    groups.set(prefix, [property]);
  }

  for (const [prefix, properties] of groups.entries()) {
    if (properties.length < threshold) continue;
    reportPrefixedPropBundle(context, properties, prefix);
  }
}

function isComponentPropsContractName(name: string | undefined): boolean {
  return name?.endsWith('Props') ?? false;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow bundles of similarly-prefixed prop type declarations that suggest over-grouped component APIs',
      url: 'https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-prefixed-prop-bundles.md',
    },
    messages: {
      noPrefixedPropBundle:
        "Prop '{{prop}}' is in a '{{prefix}}*' bundle ({{count}} props). Prefer explicit props and compound composition.",
    },
    schema: [
      {
        type: 'object',
        properties: {
          threshold: {
            type: 'integer',
            minimum: 2,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = (context.options[0] as RuleOptions | undefined) ?? {};
    const threshold = options.threshold ?? DEFAULT_THRESHOLD;

    return {
      TSInterfaceDeclaration(node: Rule.Node) {
        const declaration = node as unknown as TSInterfaceDeclarationNode;
        if (!isComponentPropsContractName(declaration.id?.name)) return;
        if (declaration.body?.type !== 'TSInterfaceBody') return;
        checkMembersForPrefixedBundles(context, declaration.body.body ?? [], threshold);
      },
      TSTypeAliasDeclaration(node: Rule.Node) {
        const declaration = node as unknown as TSTypeAliasDeclarationNode;
        if (!isComponentPropsContractName(declaration.id?.name)) return;
        const annotation = declaration.typeAnnotation as TSTypeLiteralNode | undefined;
        if (!annotation || annotation.type !== 'TSTypeLiteral') return;
        checkMembersForPrefixedBundles(context, annotation.members ?? [], threshold);
      },
    };
  },
};

export default rule;
