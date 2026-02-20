import type { Rule } from 'eslint';

const MAX_CUSTOM_COMPONENT_DEPTH = 2;

function isPascalCase(name: string): boolean {
  if (name.length === 0) return false;
  const first = name[0];
  return first >= 'A' && first <= 'Z';
}

function isCustomJsxName(node: Rule.Node): boolean {
  if (node.type === 'JSXIdentifier') {
    const name = (node as unknown as { name: string }).name;
    return isPascalCase(name);
  }

  if (node.type === 'JSXMemberExpression') {
    const member = node as unknown as { object: Rule.Node };
    if (member.object.type === 'JSXIdentifier') {
      const object = member.object as unknown as { name: string };
      return isPascalCase(object.name);
    }
  }

  return false;
}

function getChildrenDepth(node: Rule.Node, currentDepth: number): number {
  if (node.type === 'JSXElement') {
    const element = node as unknown as {
      openingElement: { name: Rule.Node };
      children?: Rule.Node[];
    };
    const nextDepth = currentDepth + (isCustomJsxName(element.openingElement.name) ? 1 : 0);
    let maxDepth = nextDepth;

    for (const child of element.children ?? []) {
      if (child.type !== 'JSXElement' && child.type !== 'JSXFragment') continue;
      const childDepth = getChildrenDepth(child, nextDepth);
      if (childDepth > maxDepth) maxDepth = childDepth;
    }
    return maxDepth;
  }

  if (node.type === 'JSXFragment') {
    const fragment = node as unknown as { children?: Rule.Node[] };
    let maxDepth = currentDepth;
    for (const child of fragment.children ?? []) {
      if (child.type !== 'JSXElement' && child.type !== 'JSXFragment') continue;
      const childDepth = getChildrenDepth(child, currentDepth);
      if (childDepth > maxDepth) maxDepth = childDepth;
    }
    return maxDepth;
  }

  return currentDepth;
}

function hasChildrenParam(params: Rule.Node[] | undefined): boolean {
  const firstParam = (params ?? [])[0];
  if (!firstParam || firstParam.type !== 'ObjectPattern') return false;
  const objectPattern = firstParam as unknown as { properties?: Rule.Node[] };

  for (const property of objectPattern.properties ?? []) {
    if (property.type !== 'Property') continue;
    const prop = property as unknown as { key?: Rule.Node; value?: Rule.Node };
    if (!prop.key || !prop.value) continue;
    if (prop.key.type === 'Identifier') {
      const key = prop.key as unknown as { name: string };
      if (key.name === 'children') return true;
    }
    if (prop.value.type === 'Identifier') {
      const value = prop.value as unknown as { name: string };
      if (value.name === 'children') return true;
    }
  }
  return false;
}

function getMaxReturnDepth(body: Rule.Node | null | undefined): number {
  if (!body) return 0;

  if (body.type === 'JSXElement' || body.type === 'JSXFragment') {
    return getChildrenDepth(body, 0);
  }

  if (body.type !== 'BlockStatement') return 0;
  const block = body as unknown as { body?: Rule.Node[] };
  let maxDepth = 0;

  for (const statement of block.body ?? []) {
    if (statement.type !== 'ReturnStatement') continue;
    const returnStatement = statement as unknown as { argument?: Rule.Node | null };
    const argument = returnStatement.argument;
    if (!argument) continue;
    if (argument.type !== 'JSXElement' && argument.type !== 'JSXFragment') continue;

    const depth = getChildrenDepth(argument, 0);
    if (depth > maxDepth) maxDepth = depth;
  }

  return maxDepth;
}

function checkComponentDepth(
  context: Rule.RuleContext,
  name: string | null | undefined,
  params: Rule.Node[] | undefined,
  body: Rule.Node | null | undefined,
  reportNode: Rule.Node,
): void {
  if (!name || !isPascalCase(name)) return;
  if (hasChildrenParam(params)) return;

  const depth = getMaxReturnDepth(body);
  if (depth <= MAX_CUSTOM_COMPONENT_DEPTH) return;

  context.report({
    node: reportNode,
    messageId: 'flatOwnerTree',
    data: {
      component: name,
      depth: String(depth),
    },
  });
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Encourage flat owner trees by reporting components that nest custom JSX components 3+ levels deep without children composition',
    },
    messages: {
      flatOwnerTree:
        "Component '{{component}}' nests custom components {{depth}} levels deep. Keep owner trees flatter or use children composition boundaries.",
    },
    schema: [],
  },
  create(context) {
    return {
      FunctionDeclaration(node: Rule.Node) {
        const fn = node as unknown as {
          id?: { name?: string } | null;
          params?: Rule.Node[];
          body?: Rule.Node;
        };
        checkComponentDepth(context, fn.id?.name, fn.params, fn.body, node);
      },
      VariableDeclarator(node: Rule.Node) {
        const declaration = node as unknown as {
          id?: Rule.Node;
          init?: Rule.Node | null;
        };
        if (declaration.id?.type !== 'Identifier') return;
        if (!declaration.init) return;
        if (
          declaration.init.type !== 'ArrowFunctionExpression' &&
          declaration.init.type !== 'FunctionExpression'
        ) {
          return;
        }

        const id = declaration.id as unknown as { name: string };
        const init = declaration.init as unknown as {
          params?: Rule.Node[];
          body?: Rule.Node;
        };
        checkComponentDepth(context, id.name, init.params, init.body, declaration.id);
      },
    };
  },
};

export default rule;
