import type { Rule } from 'eslint';

interface IdentifierLike {
  type: 'Identifier';
  name: string;
}

interface LiteralLike {
  type: 'Literal';
  value: string | number | boolean | null;
}

interface TSTypeAnnotationNode {
  typeAnnotation?: Rule.Node;
}

interface TSPropertySignatureNode {
  type: 'TSPropertySignature';
  key: IdentifierLike | LiteralLike;
  optional?: boolean;
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
  typeAnnotation?: Rule.Node;
}

interface PropertyNode {
  type: 'Property';
  key: IdentifierLike | LiteralLike;
  value?: Rule.Node;
}

interface AssignmentPatternNode {
  type: 'AssignmentPattern';
  left: Rule.Node;
  right: Rule.Node;
}

interface RuleOptions {
  ignore?: string[];
}

function isPascalCaseName(name: string): boolean {
  const first = name[0];
  return Boolean(first && first >= 'A' && first <= 'Z');
}

function getPropertyName(node: IdentifierLike | LiteralLike): string | null {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

function globToRegex(globPattern: string): RegExp {
  const escaped = globPattern.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '.*')}$`);
}

function createIgnoredPropMatcher(ignorePatterns: string[]): (propName: string) => boolean {
  const regexes = ignorePatterns.map(globToRegex);
  return (propName: string) => regexes.some((regex) => regex.test(propName));
}

function getTypeReferenceName(typeNode: Rule.Node): string | null {
  const maybeRef = typeNode as {
    type?: string;
    typeName?: { type?: string; name?: string; right?: { name?: string } };
  };
  if (maybeRef.type !== 'TSTypeReference' || !maybeRef.typeName) return null;
  if (maybeRef.typeName.type === 'Identifier' && maybeRef.typeName.name) {
    return maybeRef.typeName.name;
  }
  if (maybeRef.typeName.type === 'TSQualifiedName' && maybeRef.typeName.right?.name) {
    return maybeRef.typeName.right.name;
  }
  return null;
}

function collectOptionalPropNamesFromMembers(
  members: Rule.Node[],
  isIgnoredPropName: (propName: string) => boolean,
): Set<string> {
  const optionalPropNames = new Set<string>();
  for (const member of members) {
    const maybeProperty = member as unknown as TSPropertySignatureNode;
    if (maybeProperty.type !== 'TSPropertySignature' || !maybeProperty.optional) continue;
    const propName = getPropertyName(maybeProperty.key);
    if (!propName) continue;
    if (isIgnoredPropName(propName)) continue;
    optionalPropNames.add(propName);
  }
  return optionalPropNames;
}

function getAuthoredOptionalPropNamesFromTypeNode(
  typeNode: Rule.Node | undefined,
  optionalPropMap: Map<string, Set<string>>,
  isIgnoredPropName: (propName: string) => boolean,
): Set<string> {
  if (!typeNode) return new Set<string>();

  const maybeTypeLiteral = typeNode as { type?: string; members?: Rule.Node[] };
  if (maybeTypeLiteral.type === 'TSTypeLiteral') {
    return collectOptionalPropNamesFromMembers(maybeTypeLiteral.members ?? [], isIgnoredPropName);
  }

  const typeRefName = getTypeReferenceName(typeNode);
  if (typeRefName) {
    return new Set<string>(optionalPropMap.get(typeRefName) ?? []);
  }

  return new Set<string>();
}

function collectDefaultedParamKeys(paramNode: Rule.Node): Set<string> {
  const defaultedKeys = new Set<string>();
  const maybeObjectPattern = paramNode as { type?: string; properties?: Rule.Node[] };
  if (maybeObjectPattern.type !== 'ObjectPattern') return defaultedKeys;

  for (const propertyNode of maybeObjectPattern.properties ?? []) {
    const maybeProperty = propertyNode as unknown as PropertyNode;
    if (maybeProperty.type !== 'Property') continue;
    const propName = getPropertyName(maybeProperty.key);
    if (!propName) continue;
    const maybeValue = maybeProperty.value as AssignmentPatternNode | undefined;
    if (!maybeValue || maybeValue.type !== 'AssignmentPattern') continue;
    defaultedKeys.add(propName);
  }

  return defaultedKeys;
}

function getParamTypeAnnotationNode(paramNode: Rule.Node): Rule.Node | null {
  const maybeAnnotatedParam = paramNode as { typeAnnotation?: TSTypeAnnotationNode };
  if (maybeAnnotatedParam.typeAnnotation?.typeAnnotation) {
    return maybeAnnotatedParam.typeAnnotation.typeAnnotation;
  }

  const maybeAssignment = paramNode as unknown as AssignmentPatternNode;
  if (maybeAssignment.type !== 'AssignmentPattern') return null;
  const maybeAssignmentLeft = maybeAssignment.left as { typeAnnotation?: TSTypeAnnotationNode };
  return maybeAssignmentLeft.typeAnnotation?.typeAnnotation ?? null;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow authored optional component props unless they are defaulted at the component boundary',
      url: 'https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-optional-props-without-defaults.md',
    },
    messages: {
      noOptionalPropWithoutDefault:
        "Component '{{component}}' prop '{{prop}}' is optional without a default.",
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
    const optionalPropsByTypeName = new Map<string, Set<string>>();

    function storeTypeOptionalProps(typeName: string, members: Rule.Node[]): void {
      optionalPropsByTypeName.set(typeName, collectOptionalPropNamesFromMembers(members, isIgnoredPropName));
    }

    function reportOptionalPropsWithoutDefaults(componentName: string, paramNode: Rule.Node): void {
      const defaultedKeys = collectDefaultedParamKeys(paramNode);
      const paramTypeAnnotation = getParamTypeAnnotationNode(paramNode);
      const optionalPropNames = getAuthoredOptionalPropNamesFromTypeNode(
        paramTypeAnnotation ?? undefined,
        optionalPropsByTypeName,
        isIgnoredPropName,
      );

      for (const propName of optionalPropNames) {
        if (defaultedKeys.has(propName)) continue;
        context.report({
          node: paramNode,
          messageId: 'noOptionalPropWithoutDefault',
          data: {
            component: componentName,
            prop: propName,
          },
        });
      }
    }

    return {
      TSInterfaceDeclaration(node: Rule.Node) {
        const declaration = node as unknown as TSInterfaceDeclarationNode;
        const typeName = declaration.id?.name;
        if (!typeName) return;
        if (declaration.body?.type !== 'TSInterfaceBody') return;
        storeTypeOptionalProps(typeName, declaration.body.body ?? []);
      },
      TSTypeAliasDeclaration(node: Rule.Node) {
        const declaration = node as unknown as TSTypeAliasDeclarationNode;
        const typeName = declaration.id?.name;
        if (!typeName) return;
        const typeAnnotation = declaration.typeAnnotation as {
          type?: string;
          members?: Rule.Node[];
        };
        if (typeAnnotation?.type !== 'TSTypeLiteral') return;
        storeTypeOptionalProps(typeName, typeAnnotation.members ?? []);
      },
      FunctionDeclaration(node: Rule.Node) {
        const declaration = node as unknown as { id?: IdentifierLike; params?: Rule.Node[] };
        const componentName = declaration.id?.name;
        if (!componentName || !isPascalCaseName(componentName)) return;
        const firstParam = declaration.params?.[0];
        if (!firstParam) return;
        reportOptionalPropsWithoutDefaults(componentName, firstParam);
      },
      VariableDeclarator(node: Rule.Node) {
        const declaration = node as unknown as {
          id?: IdentifierLike;
          init?: { type?: string; params?: Rule.Node[] };
        };
        const componentName = declaration.id?.name;
        if (!componentName || !isPascalCaseName(componentName)) return;
        const init = declaration.init;
        if (!init) return;
        if (init.type !== 'ArrowFunctionExpression' && init.type !== 'FunctionExpression') return;
        const firstParam = init.params?.[0];
        if (!firstParam) return;
        reportOptionalPropsWithoutDefaults(componentName, firstParam);
      },
    };
  },
};

export default rule;
