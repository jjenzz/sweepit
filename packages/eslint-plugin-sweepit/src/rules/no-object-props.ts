import type { Rule } from 'eslint';
import ts from 'typescript';

interface JSXExpressionContainer {
  type: 'JSXExpressionContainer';
  expression?: Rule.Node & { type?: string } | null;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow object-valued JSX props',
      url: 'https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-object-props.md',
    },
    messages: {
      noObjectProps:
        "Object value passed to prop '{{prop}}'. Avoid object props; prefer primitive props and compound composition. If object-shaped data must be shared across parts, use private context inside the compound root instead of passing object props. See: https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-object-props.md.",
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

    function isDisallowedObjectType(type: ts.Type | undefined): boolean {
      if (!type || !checker) return false;

      if (type.isUnionOrIntersection()) {
        return type.types.some((entry) => isDisallowedObjectType(entry));
      }

      if (checker.isArrayType(type) || checker.isTupleType(type)) return false;
      if (checker.getSignaturesOfType(type, ts.SignatureKind.Call).length > 0)
        return false;
      if (checker.getSignaturesOfType(type, ts.SignatureKind.Construct).length > 0)
        return false;

      const isObjectLike =
        (type.flags & ts.TypeFlags.Object) !== 0 ||
        (type.flags & ts.TypeFlags.NonPrimitive) !== 0;

      return isObjectLike;
    }

    function expressionHasObjectType(expression: Rule.Node): boolean {
      if (!checker || !parserServices?.esTreeNodeToTSNodeMap) return false;
      const tsNode = parserServices.esTreeNodeToTSNodeMap.get(expression);
      if (!tsNode) return false;
      return isDisallowedObjectType(checker.getTypeAtLocation(tsNode));
    }

    return {
      JSXAttribute(node: Rule.Node) {
        const attr = node as unknown as {
          name?: { type?: string; name?: string };
          value?: { type?: string } | null;
        };
        if (attr.name?.type !== 'JSXIdentifier' || !attr.name.name) return;
        if (attr.name.name === 'style') return;
        if (!attr.value || attr.value.type !== 'JSXExpressionContainer') return;

        const expression = (attr.value as JSXExpressionContainer).expression;
        if (!expression) return;

        const isInlineObject = expression.type === 'ObjectExpression';
        const isObjectTyped = expressionHasObjectType(expression);
        if (!isInlineObject && !isObjectTyped) return;

        context.report({
          node: attr.value as unknown as Rule.Node,
          messageId: 'noObjectProps',
          data: { prop: attr.name.name },
        });
      },
    };
  },
};

export default rule;
