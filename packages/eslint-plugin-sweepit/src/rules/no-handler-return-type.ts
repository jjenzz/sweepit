import type { Rule } from 'eslint';

interface IdentifierLike {
  type: 'Identifier';
  name: string;
}

interface LiteralLike {
  type: 'Literal';
  value: string | number | boolean | null;
}

interface TSReturnTypeLike {
  type?: string;
  typeAnnotation?: Rule.Node;
}

interface TSFunctionTypeLike {
  type?: string;
  returnType?: TSReturnTypeLike;
}

interface TSContainerTypeLike {
  type?: string;
  typeAnnotation?: Rule.Node;
  types?: Rule.Node[];
}

function getKeyName(node: IdentifierLike | LiteralLike): string | null {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

function isHandlerProp(name: string): boolean {
  return name.startsWith('on') && name.length > 2;
}

function getReturnTypeAnnotation(node: TSFunctionTypeLike): Rule.Node | null {
  const rt = node.returnType as TSReturnTypeLike | undefined;
  return rt?.typeAnnotation ?? null;
}

function isVoidType(typeNode: Rule.Node): boolean {
  return (typeNode as { type?: string }).type === 'TSVoidKeyword';
}

function isAllowedHandlerReturnType(typeNode: Rule.Node): boolean {
  return isVoidType(typeNode);
}

function getFunctionReturnTypes(typeNode: Rule.Node): Rule.Node[] {
  const n = typeNode as TSContainerTypeLike;

  if (n.type === 'TSFunctionType') {
    const returnType = getReturnTypeAnnotation(typeNode as TSFunctionTypeLike);
    return returnType ? [returnType] : [];
  }

  if (n.type === 'TSParenthesizedType' && n.typeAnnotation) {
    return getFunctionReturnTypes(n.typeAnnotation);
  }

  if ((n.type === 'TSUnionType' || n.type === 'TSIntersectionType') && Array.isArray(n.types)) {
    const result: Rule.Node[] = [];
    for (const entry of n.types) result.push(...getFunctionReturnTypes(entry));
    return result;
  }

  return [];
}

function getInvalidReturnType(typeNode: Rule.Node): Rule.Node | null {
  const returnTypes = getFunctionReturnTypes(typeNode);
  for (const returnType of returnTypes) {
    if (!isAllowedHandlerReturnType(returnType)) return returnType;
  }
  return null;
}

function reportInvalidReturnType(
  context: Rule.RuleContext,
  node: Rule.Node,
  propName: string,
  returnType: Rule.Node,
): void {
  context.report({
    node,
    messageId: 'noHandlerReturnType',
    data: {
      prop: propName,
      returnType: context.sourceCode.getText(returnType),
    },
  });
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow handler prop definitions (on*) that expect return values. Handler contracts must return void.',
    },
    messages: {
      noHandlerReturnType:
        "Handler prop '{{prop}}' expects return type '{{returnType}}'. Handler prop definitions must not expect return values; use void.",
    },
    schema: [],
  },
  create(context) {
    function checkPropertySignature(node: Rule.Node): void {
      const property = node as {
        key?: IdentifierLike | LiteralLike;
        typeAnnotation?: TSReturnTypeLike;
      };
      if (!property.key || !property.typeAnnotation?.typeAnnotation) return;

      const propName = getKeyName(property.key);
      if (!propName || !isHandlerProp(propName)) return;

      const invalidReturnType = getInvalidReturnType(property.typeAnnotation.typeAnnotation);
      if (!invalidReturnType) return;

      reportInvalidReturnType(context, node, propName, invalidReturnType);
    }

    function checkMethodSignature(node: Rule.Node): void {
      const method = node as {
        key?: IdentifierLike | LiteralLike;
        returnType?: TSReturnTypeLike;
      };
      if (!method.key || !method.returnType?.typeAnnotation) return;

      const propName = getKeyName(method.key);
      if (!propName || !isHandlerProp(propName)) return;

      if (isAllowedHandlerReturnType(method.returnType.typeAnnotation)) return;
      reportInvalidReturnType(context, node, propName, method.returnType.typeAnnotation);
    }

    return {
      TSPropertySignature: checkPropertySignature,
      TSMethodSignature: checkMethodSignature,
    };
  },
};

export default rule;
