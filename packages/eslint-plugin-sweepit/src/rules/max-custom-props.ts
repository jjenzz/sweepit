import type { Rule } from 'eslint';

interface IdentifierLike {
  type: 'Identifier';
  name: string;
}

interface RuleOptions {
  threshold?: number;
  ignore?: string[];
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

const DEFAULT_THRESHOLD = 8;
const DEFAULT_IGNORED_PROPS = new Set(['children']);

function isComponentPropsContractName(name: string): boolean {
  return name.endsWith('Props');
}

function getCustomPropCount(members: Rule.Node[], ignoredProps: Set<string>): number {
  let count = 0;
  for (const member of members) {
    const maybeMember = member as {
      type?: string;
      key?: { type?: string; name?: string; value?: string };
    };
    if (maybeMember.type !== 'TSPropertySignature' && maybeMember.type !== 'TSMethodSignature') {
      continue;
    }
    const key = maybeMember.key;
    if (!key) continue;

    let propName: string | null = null;
    if (key.type === 'Identifier' && key.name) propName = key.name;
    if (key.type === 'Literal' && typeof key.value === 'string') propName = key.value;
    if (!propName) continue;
    if (ignoredProps.has(propName)) continue;
    count += 1;
  }
  return count;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Limit the number of custom props in component prop contracts to encourage composition',
      url: 'https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/max-custom-props.md',
    },
    messages: {
      maxCustomProps:
        "Prop contract '{{name}}' declares {{count}} props (max {{threshold}}). Prefer splitting into compound parts.",
    },
    schema: [
      {
        type: 'object',
        properties: {
          threshold: {
            type: 'integer',
            minimum: 1,
          },
          ignore: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = (context.options[0] as RuleOptions | undefined) ?? {};
    const threshold = options.threshold ?? DEFAULT_THRESHOLD;
    const ignoredProps = new Set<string>([...DEFAULT_IGNORED_PROPS, ...(options.ignore ?? [])]);

    function checkContract(
      contractName: string | undefined,
      members: Rule.Node[] | undefined,
      node: Rule.Node,
    ): void {
      if (!contractName || !isComponentPropsContractName(contractName)) return;
      const customPropCount = getCustomPropCount(members ?? [], ignoredProps);
      if (customPropCount <= threshold) return;
      context.report({
        node,
        messageId: 'maxCustomProps',
        data: {
          name: contractName,
          count: String(customPropCount),
          threshold: String(threshold),
        },
      });
    }

    return {
      TSInterfaceDeclaration(node: Rule.Node) {
        const declaration = node as unknown as TSInterfaceDeclarationNode;
        if (declaration.body?.type !== 'TSInterfaceBody') return;
        checkContract(declaration.id?.name, declaration.body.body, node);
      },
      TSTypeAliasDeclaration(node: Rule.Node) {
        const declaration = node as unknown as TSTypeAliasDeclarationNode;
        if (declaration.typeAnnotation?.type !== 'TSTypeLiteral') return;
        checkContract(declaration.id?.name, declaration.typeAnnotation.members, node);
      },
    };
  },
};

export default rule;
