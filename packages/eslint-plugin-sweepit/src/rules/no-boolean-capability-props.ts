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

interface RuleOptions {
  ignore?: string[];
  ignoreNativeBooleanProps?: boolean;
}

const NATIVE_BOOLEAN_PROPS = new Set<string>([
  'allowFullScreen',
  'allowTransparency',
  'async',
  'autoFocus',
  'autoPlay',
  'checked',
  'controls',
  'default',
  'defer',
  'disabled',
  'formNoValidate',
  'hidden',
  'inert',
  'loop',
  'multiple',
  'muted',
  'noModule',
  'noValidate',
  'open',
  'playsInline',
  'readOnly',
  'required',
  'reversed',
  'selected',
]);

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
      url: 'https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-boolean-capability-props.md',
    },
    messages: {
      noBooleanCapabilityProp:
        "Boolean prop '{{prop}}' has no controlled handler. Prefer controlled APIs, compound composition, or an explicit variant prop.",
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignore: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          ignoreNativeBooleanProps: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = (context.options[0] as RuleOptions | undefined) ?? {};
    const ignoredProps = new Set<string>(options.ignore ?? []);
    if (options.ignoreNativeBooleanProps) {
      for (const propName of NATIVE_BOOLEAN_PROPS) {
        ignoredProps.add(propName);
      }
    }

    function checkMembers(members: Rule.Node[]) {
      const booleanProps: Array<{ name: string; node: TSPropertySignatureNode }> = [];
      const handlerProps = new Set<string>();

      for (const memberNode of members) {
        const maybeProperty = memberNode as unknown as TSPropertySignatureNode;
        if (maybeProperty.type !== 'TSPropertySignature') continue;

        const propName = getPropName(maybeProperty.key);
        if (!propName) continue;
        if (ignoredProps.has(propName)) continue;

        const typeNode = maybeProperty.typeAnnotation?.typeAnnotation;
        if (isFunctionLikeType(typeNode) && isHandlerPropName(propName)) {
          handlerProps.add(propName);
          continue;
        }

        if (!isBooleanLikeType(typeNode)) continue;
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
          data: { prop: booleanProp.name },
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
