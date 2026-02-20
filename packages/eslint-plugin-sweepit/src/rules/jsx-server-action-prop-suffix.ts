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
  typeAnnotation?: Rule.Node;
}

interface TSFunctionTypeLike {
  type?: string;
  returnType?: TSReturnTypeLike;
}

interface TSTypeReferenceLike {
  type?: string;
  typeName?: { name?: string; right?: { name?: string } };
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

function isActionPropName(name: string): boolean {
  return name === 'action' || name.endsWith('Action');
}

function getReturnTypeAnnotation(node: TSFunctionTypeLike): Rule.Node | null {
  return node.returnType?.typeAnnotation ?? null;
}

function isPromiseType(typeNode: Rule.Node): boolean {
  const n = typeNode as TSTypeReferenceLike;
  if (n.type !== 'TSTypeReference') return false;
  const typeName = n.typeName?.name ?? n.typeName?.right?.name;
  return typeName === 'Promise';
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

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce async function prop contracts to use action prop names (action or *Action).',
    },
    messages: {
      asyncPropRequiresActionName:
        "Prop '{{prop}}' expects an async function type ('{{returnType}}'). Async function props must be named 'action' or end with 'Action'.",
    },
    schema: [],
  },
  create(context) {
    function reportIfNeeded(node: Rule.Node, propName: string, returnType: Rule.Node): void {
      if (isActionPropName(propName)) return;
      context.report({
        node,
        messageId: 'asyncPropRequiresActionName',
        data: { prop: propName, returnType: context.sourceCode.getText(returnType) },
      });
    }

    function checkPropertySignature(node: Rule.Node): void {
      const property = node as {
        key?: IdentifierLike | LiteralLike;
        typeAnnotation?: { typeAnnotation?: Rule.Node };
      };
      const key = property.key;
      const typeNode = property.typeAnnotation?.typeAnnotation;
      if (!key || !typeNode) return;

      const propName = getKeyName(key);
      if (!propName) return;

      for (const returnType of getFunctionReturnTypes(typeNode)) {
        if (isPromiseType(returnType)) {
          reportIfNeeded(node, propName, returnType);
          return;
        }
      }
    }

    function checkMethodSignature(node: Rule.Node): void {
      const method = node as {
        key?: IdentifierLike | LiteralLike;
        returnType?: { typeAnnotation?: Rule.Node };
      };
      const key = method.key;
      const returnType = method.returnType?.typeAnnotation;
      if (!key || !returnType) return;
      if (!isPromiseType(returnType)) return;

      const propName = getKeyName(key);
      if (!propName) return;
      reportIfNeeded(node, propName, returnType);
    }

    return {
      TSPropertySignature: checkPropertySignature,
      TSMethodSignature: checkMethodSignature,
    };
  },
};

export default rule;
