import type { Rule } from 'eslint';
import type ts from 'typescript';

interface JSXExpressionContainer {
  type: 'JSXExpressionContainer';
  expression?: Rule.Node & { type?: string } | null;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow array-valued JSX props',
      url: 'https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-array-props.md',
    },
    messages: {
      noArrayProps:
        "Array value passed to prop '{{prop}}'. Avoid array props; prefer primitive props and compound composition. If array-shaped data must be shared across parts, use private context inside the compound root instead of passing array props. See: https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-array-props.md.",
    },
    schema: [],
  },
  create(context) {
    const parserServices =
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
      ).parserServices;
    const checker = parserServices?.program?.getTypeChecker();

    function isDisallowedArrayType(type: ts.Type | undefined): boolean {
      if (!type || !checker) return false;

      if (type.isUnionOrIntersection()) {
        return type.types.some((entry) => isDisallowedArrayType(entry));
      }

      return checker.isArrayType(type) || checker.isTupleType(type);
    }

    function expressionHasArrayType(expression: Rule.Node): boolean {
      if (!checker || !parserServices?.esTreeNodeToTSNodeMap) return false;
      const tsNode = parserServices.esTreeNodeToTSNodeMap.get(expression);
      if (!tsNode) return false;
      return isDisallowedArrayType(checker.getTypeAtLocation(tsNode));
    }

    return {
      JSXAttribute(node: Rule.Node) {
        const attr = node as unknown as {
          name?: { type?: string; name?: string };
          value?: { type?: string } | null;
        };
        if (attr.name?.type !== 'JSXIdentifier' || !attr.name.name) return;
        if (!attr.value || attr.value.type !== 'JSXExpressionContainer') return;

        const expression = (attr.value as JSXExpressionContainer).expression;
        if (!expression) return;

        const isInlineArray = expression.type === 'ArrayExpression';
        const isArrayTyped = expressionHasArrayType(expression);
        if (!isInlineArray && !isArrayTyped) return;

        context.report({
          node: attr.value as unknown as Rule.Node,
          messageId: 'noArrayProps',
          data: { prop: attr.name.name },
        });
      },
    };
  },
};

export default rule;
