import type { Rule } from 'eslint';

const DEFAULT_ALLOWED_CHAIN_DEPTH = 2;

interface RuleOptions {
  allowedChainDepth?: number;
}

interface ComponentRecord {
  name: string;
  node: Rule.Node;
  selfClosingCustomChildren: Set<string>;
}

function isPascalCase(name: string): boolean {
  if (name.length === 0) return false;
  const first = name[0];
  return first >= 'A' && first <= 'Z';
}

function getCustomJsxName(node: Rule.Node | null | undefined): string | null {
  if (!node) return null;
  const typedNode = node as unknown as { type?: string; name?: string; object?: Rule.Node };

  if (typedNode.type === 'JSXIdentifier' && typedNode.name) {
    const name = typedNode.name;
    return isPascalCase(name) ? name : null;
  }

  if (typedNode.type === 'JSXMemberExpression' && typedNode.object) {
    const member = typedNode as unknown as { object: Rule.Node };
    const typedObject = member.object as unknown as { type?: string; name?: string };
    if (typedObject.type === 'JSXIdentifier' && typedObject.name) {
      const object = typedObject as { name: string };
      return isPascalCase(object.name) ? object.name : null;
    }
  }

  return null;
}

function isJsxElementOrFragment(node: Rule.Node | null | undefined): boolean {
  if (!node) return false;
  const typedNode = node as unknown as { type?: string };
  return typedNode.type === 'JSXElement' || typedNode.type === 'JSXFragment';
}

function getJsxChildren(node: Rule.Node): Rule.Node[] {
  const typedNode = node as unknown as { type?: string; children?: Rule.Node[] };
  if (typedNode.type === 'JSXFragment') {
    return typedNode.children ?? [];
  }

  if (typedNode.type === 'JSXElement') {
    const element = node as unknown as { children?: Rule.Node[] };
    return element.children ?? [];
  }

  return [];
}

function getSelfClosingCustomName(node: Rule.Node): string | null {
  const typedNode = node as unknown as { type?: string };
  if (typedNode.type !== 'JSXElement') return null;
  const element = node as unknown as {
    openingElement: { name: Rule.Node; selfClosing?: boolean };
  };
  if (!element.openingElement.selfClosing) return null;
  return getCustomJsxName(element.openingElement.name);
}

function collectSelfClosingCustomJsxNames(
  node: Rule.Node | null | undefined,
  names: Set<string>,
): void {
  if (!isJsxElementOrFragment(node)) return;
  const collectedNames = names;
  const selfClosingCustomName = getSelfClosingCustomName(node);
  if (selfClosingCustomName) {
    collectedNames.add(selfClosingCustomName);
  }

  for (const child of getJsxChildren(node)) {
    if (!isJsxElementOrFragment(child)) continue;
    collectSelfClosingCustomJsxNames(child, collectedNames);
  }
}

function collectSelfClosingCustomJsxNamesFromReturn(
  statement: Rule.Node,
  names: Set<string>,
): void {
  if (statement.type !== 'ReturnStatement') return;
  const returnStatement = statement as unknown as { argument?: Rule.Node | null };
  const argument = returnStatement.argument;
  if (!isJsxElementOrFragment(argument)) return;
  collectSelfClosingCustomJsxNames(argument, names);
}

function getSelfClosingCustomChildren(body: Rule.Node | null | undefined): Set<string> {
  const names = new Set<string>();
  if (!body) return names;
  if (isJsxElementOrFragment(body)) {
    collectSelfClosingCustomJsxNames(body, names);
    return names;
  }

  const typedBody = body as unknown as { type?: string; body?: Rule.Node[] };
  if (typedBody.type !== 'BlockStatement') {
    return names;
  }

  for (const statement of typedBody.body ?? []) {
    collectSelfClosingCustomJsxNamesFromReturn(statement, names);
  }

  return names;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && value >= 1 && value % 1 === 0;
}

function computeLongestChain(
  componentName: string,
  components: Map<string, ComponentRecord>,
  memo: Map<string, string[]>,
  visiting: Set<string>,
): string[] {
  const memoByComponent = memo;
  const activeComponents = visiting;
  const knownComponents = components;
  const cached = memoByComponent.get(componentName);
  if (cached != null) return cached;

  if (activeComponents.has(componentName)) {
    return [componentName];
  }
  activeComponents.add(componentName);

  const component = knownComponents.get(componentName);
  if (!component) {
    memoByComponent.set(componentName, [componentName]);
    activeComponents.delete(componentName);
    return [componentName];
  }

  if (component.selfClosingCustomChildren.size === 0) {
    const base = [componentName];
    memoByComponent.set(componentName, base);
    activeComponents.delete(componentName);
    return base;
  }

  let bestChildChain: string[] = [];
  for (const childName of component.selfClosingCustomChildren) {
    if (!knownComponents.has(childName)) continue;
    const childChain = computeLongestChain(
      childName,
      knownComponents,
      memoByComponent,
      activeComponents,
    );
    if (childChain.length > bestChildChain.length) bestChildChain = childChain;
  }
  const fullChain = [componentName, ...bestChildChain];
  memoByComponent.set(componentName, fullChain);
  activeComponents.delete(componentName);
  return fullChain;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Encourage flatter parent component chains by reporting self-closing custom component handoffs deeper than allowedChainDepth',
      url: 'https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/jsx-flat-owner-tree.md',
    },
    messages: {
      deepParentTree:
        "Component '{{component}}' is in a {{depth}}-deep self-closing handoff chain (allowed {{allowedDepth}}): {{chain}}. Flatten at '{{nextHandoff}}'.",
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedChainDepth: {
            type: 'integer',
            minimum: 1,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const report = context.report.bind(context);
    const rawOptions = (context.options[0] as RuleOptions | undefined) ?? {};
    const allowedChainDepthRaw = rawOptions.allowedChainDepth;
    const allowedChainDepth = isPositiveInteger(allowedChainDepthRaw)
      ? allowedChainDepthRaw
      : DEFAULT_ALLOWED_CHAIN_DEPTH;
    const minReportedChainDepth = allowedChainDepth + 1;

    const components = new Map<string, ComponentRecord>();

    function registerComponent(
      name: string | null | undefined,
      body: Rule.Node | null | undefined,
      node: Rule.Node,
    ): void {
      if (!name || !isPascalCase(name)) return;
      components.set(name, {
        name,
        node,
        selfClosingCustomChildren: getSelfClosingCustomChildren(body),
      });
    }

    return {
      FunctionDeclaration(node: Rule.Node) {
        const fn = node as unknown as {
          id?: { name?: string } | null;
          params?: Rule.Node[];
          body?: Rule.Node;
        };
        registerComponent(fn.id?.name, fn.body, node);
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
        registerComponent(id.name, init.body, declaration.id);
      },
      'Program:exit'() {
        const memo = new Map<string, string[]>();
        for (const component of components.values()) {
          const chain = computeLongestChain(component.name, components, memo, new Set<string>());
          const depth = chain.length;
          if (depth < minReportedChainDepth) continue;

          report({
            node: component.node,
            messageId: 'deepParentTree',
            data: {
              component: component.name,
              depth: String(depth),
              allowedDepth: String(allowedChainDepth),
              chain: chain.join(' -> '),
              nextHandoff: chain[1] ?? component.name,
            },
          });
        }
      },
    };
  },
};

export default rule;
