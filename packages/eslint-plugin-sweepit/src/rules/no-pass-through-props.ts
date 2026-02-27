import type { Rule } from 'eslint';

interface PropBinding {
  propName: string;
  localName: string;
  node: Rule.Node;
}

interface ParentRef {
  parent: Rule.Node | null;
}

function isPascalCase(name: string): boolean {
  if (name.length === 0) return false;
  const first = name[0];
  return first >= 'A' && first <= 'Z';
}

function walkAst(
  node: Rule.Node | null | undefined,
  parent: Rule.Node | null,
  seen: WeakSet<object>,
  visitor: (node: Rule.Node, parent: Rule.Node | null) => void,
): void {
  if (!node || typeof node !== 'object') return;
  if (seen.has(node as unknown as object)) return;
  seen.add(node as unknown as object);
  visitor(node, parent);

  const record = node as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (key === 'parent') continue;
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry && typeof entry === 'object' && 'type' in (entry as object)) {
          walkAst(entry as Rule.Node, node, seen, visitor);
        }
      }
      continue;
    }

    if (typeof value === 'object' && 'type' in (value as object)) {
      walkAst(value as Rule.Node, node, seen, visitor);
    }
  }
}

function getIdentifierFromPattern(pattern: Rule.Node | null | undefined): Rule.Node | null {
  if (!pattern) return null;
  if (pattern.type === 'Identifier') return pattern;
  if (pattern.type === 'AssignmentPattern') {
    const assignmentPattern = pattern as unknown as { left?: Rule.Node };
    if (assignmentPattern.left?.type === 'Identifier') return assignmentPattern.left;
  }
  return null;
}

function getStaticPropKey(property: Rule.Node): string | null {
  if (property.type !== 'Property') return null;
  const prop = property as unknown as {
    key?: Rule.Node;
    computed?: boolean;
  };
  if (!prop.key || prop.computed) return null;

  if (prop.key.type === 'Identifier') {
    return (prop.key as unknown as { name: string }).name;
  }
  if (prop.key.type === 'Literal') {
    const literal = prop.key as unknown as { value?: unknown };
    return typeof literal.value === 'string' ? literal.value : null;
  }
  return null;
}

function getPropBindings(param: Rule.Node | null | undefined): PropBinding[] {
  if (!param || param.type !== 'ObjectPattern') return [];

  const objectPattern = param as unknown as { properties?: Rule.Node[] };
  const bindings: PropBinding[] = [];
  for (const property of objectPattern.properties ?? []) {
    if (property.type !== 'Property') continue;
    const prop = property as unknown as { key?: Rule.Node; value?: Rule.Node };
    if (!prop.value) continue;

    const identifier = getIdentifierFromPattern(prop.value);
    if (!identifier) continue;
    const localName = (identifier as unknown as { name: string }).name;
    const propName = getStaticPropKey(property) ?? localName;

    bindings.push({
      propName,
      localName,
      node: identifier,
    });
  }

  return bindings;
}

function isDefinitionLikeIdentifier(
  node: Rule.Node,
  parent: Rule.Node | null,
  name: string,
): boolean {
  if (!parent) return false;

  if (parent.type === 'Property') {
    const property = parent as unknown as {
      key?: Rule.Node;
      value?: Rule.Node;
      computed?: boolean;
    };
    if (property.key === node && !property.computed) return true;
    if (property.value === node && property.value?.type === 'Identifier') {
      const value = property.value as unknown as { name: string };
      if (value.name === name && property.key === node) return true;
    }
  }

  if (parent.type === 'VariableDeclarator') {
    const declarator = parent as unknown as { id?: Rule.Node };
    if (declarator.id === node) return true;
  }

  if (parent.type === 'FunctionDeclaration' || parent.type === 'FunctionExpression') {
    const fn = parent as unknown as { id?: Rule.Node; params?: Rule.Node[] };
    if (fn.id === node) return true;
    if ((fn.params ?? []).includes(node)) return true;
  }

  if (parent.type === 'ArrowFunctionExpression') {
    const arrow = parent as unknown as { params?: Rule.Node[] };
    if ((arrow.params ?? []).includes(node)) return true;
  }

  return false;
}

function isDirectJsxAttributeForward(
  node: Rule.Node,
  parent: Rule.Node | null,
  parentMap: WeakMap<object, ParentRef>,
): boolean {
  if (!parent) return false;
  const typedParent = parent as unknown as { type?: string };
  if (typedParent.type !== 'JSXExpressionContainer') return false;
  const container = parent as unknown as { expression?: Rule.Node };
  if (container.expression !== node) return false;

  const ref = parentMap.get(parent as unknown as object);
  if (!ref?.parent) return false;
  const typedGrandParent = ref.parent as unknown as { type?: string };
  return typedGrandParent.type === 'JSXAttribute';
}

function getForwardedTargetProp(
  node: Rule.Node,
  parent: Rule.Node | null,
  parentMap: WeakMap<object, ParentRef>,
): string | null {
  if (!isDirectJsxAttributeForward(node, parent, parentMap)) return null;
  const ref = parent ? parentMap.get(parent as unknown as object) : null;
  const grandParent = ref?.parent as
    | {
        type?: string;
        name?: { type?: string; name?: string };
      }
    | undefined;
  if (!grandParent || grandParent.type !== 'JSXAttribute') return null;
  if (grandParent.name?.type !== 'JSXIdentifier') return null;
  return grandParent.name.name ?? null;
}

function checkComponent(
  context: Rule.RuleContext,
  functionNode: Rule.Node,
  name: string | null | undefined,
  params: Rule.Node[] | undefined,
  body: Rule.Node | null | undefined,
): void {
  if (!name || !isPascalCase(name)) return;
  const firstParam = (params ?? [])[0];
  const bindings = getPropBindings(firstParam);
  if (bindings.length === 0) return;

  const bindingMap = new Map<string, PropBinding>();
  for (const binding of bindings) {
    if (binding.propName === 'children') continue;
    bindingMap.set(binding.localName, binding);
  }
  if (bindingMap.size === 0) return;

  const usageMap = new Map<
    string,
    {
      seen: boolean;
      owned: boolean;
      forwardedTo: Set<string>;
    }
  >();
  for (const localName of bindingMap.keys()) {
    usageMap.set(localName, { seen: false, owned: false, forwardedTo: new Set<string>() });
  }

  const parentMap = new WeakMap<object, ParentRef>();
  const seenForUsage = new WeakSet<object>();
  walkAst(body, functionNode, seenForUsage, (node, parent) => {
    parentMap.set(node as unknown as object, { parent });
    if (node.type !== 'Identifier') return;
    const identifier = node as unknown as { name: string };
    const usage = usageMap.get(identifier.name);
    if (!usage) return;
    if (isDefinitionLikeIdentifier(node, parent, identifier.name)) return;

    usage.seen = true;
    const forwardedTarget = getForwardedTargetProp(node, parent, parentMap);
    if (!forwardedTarget) {
      usage.owned = true;
      return;
    }
    usage.forwardedTo.add(forwardedTarget);
  });

  for (const [localName, usage] of usageMap.entries()) {
    if (!usage.seen || usage.owned) continue;
    const binding = bindingMap.get(localName);
    if (!binding) continue;

    context.report({
      node: binding.node,
      messageId: 'noPassThroughProp',
      data: {
        prop: binding.propName,
        component: name,
        forwardedTo:
          usage.forwardedTo.size > 0
            ? Array.from(usage.forwardedTo).sort().join(', ')
            : 'child prop',
      },
    });
  }
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow pass-through-only props in component owners (accepting props only to forward them)',
      url: 'https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-pass-through-props.md',
    },
    messages: {
      noPassThroughProp:
        "Prop '{{prop}}' in '{{component}}' is only forwarded to '{{forwardedTo}}'. Remove it or compose via children.",
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
        checkComponent(context, node, fn.id?.name, fn.params, fn.body);
      },
      VariableDeclarator(node: Rule.Node) {
        const declaration = node as unknown as {
          id?: Rule.Node;
          init?: Rule.Node | null;
        };
        if (declaration.id?.type !== 'Identifier') return;

        const id = declaration.id as unknown as { name: string };
        const init = declaration.init;
        if (!init) return;
        if (init.type !== 'ArrowFunctionExpression' && init.type !== 'FunctionExpression') return;

        const component = init as unknown as {
          params?: Rule.Node[];
          body?: Rule.Node;
        };
        checkComponent(context, init, id.name, component.params, component.body);
      },
    };
  },
};

export default rule;
