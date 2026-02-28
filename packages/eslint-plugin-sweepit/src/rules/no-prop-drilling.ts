import type { Rule } from 'eslint';

const DEFAULT_ALLOWED_DEPTH = 1;
const DEFAULT_IGNORE_PROPS_SPREAD = true;

interface PropBinding {
  propName: string;
  localName: string;
  node: Rule.Node;
}

interface RuleOptions {
  allowedDepth?: number;
  ignorePropsSpread?: boolean;
}

interface ParentRef {
  parent: Rule.Node | null;
}

interface PropUsage {
  seen: boolean;
  owned: boolean;
  forwardedTo: Set<string>;
  forwardedComponents: Set<string>;
}

interface PropViolation {
  binding: PropBinding;
  forwardedTo: Set<string>;
}

interface ComponentPassThroughRecord {
  name: string;
  node: Rule.Node;
  passThroughChildren: Set<string>;
  violations: PropViolation[];
}

interface ForwardedUsageInfo {
  forwardedTo: string;
  forwardedComponent: string | null;
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

function getCustomJsxName(node: Rule.Node | null | undefined): string | null {
  if (!node) return null;
  const typedNode = node as unknown as { type?: string; name?: string; object?: Rule.Node };

  if (typedNode.type === 'JSXIdentifier' && typedNode.name) {
    return isPascalCase(typedNode.name) ? typedNode.name : null;
  }

  if (typedNode.type === 'JSXMemberExpression' && typedNode.object) {
    const member = typedNode as unknown as { object: Rule.Node };
    const objectNode = member.object as unknown as { type?: string; name?: string };
    if (objectNode.type === 'JSXIdentifier' && objectNode.name) {
      return isPascalCase(objectNode.name) ? objectNode.name : null;
    }
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

function getPropBindings(
  param: Rule.Node | null | undefined,
  ignorePropsSpread: boolean,
): PropBinding[] {
  if (!param || param.type !== 'ObjectPattern') return [];

  const objectPattern = param as unknown as { properties?: Rule.Node[] };
  const bindings: PropBinding[] = [];
  for (const property of objectPattern.properties ?? []) {
    if (property.type === 'RestElement') {
      if (ignorePropsSpread) continue;
      const rest = property as unknown as { argument?: Rule.Node };
      if (rest.argument?.type !== 'Identifier') continue;
      const identifier = rest.argument as unknown as { name: string };
      bindings.push({
        propName: `...${identifier.name}`,
        localName: identifier.name,
        node: rest.argument,
      });
      continue;
    }

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

  if (parent.type === 'RestElement') {
    const restElement = parent as unknown as { argument?: Rule.Node };
    if (restElement.argument === node) return true;
  }

  if (parent.type === 'AssignmentPattern') {
    const assignmentPattern = parent as unknown as { left?: Rule.Node };
    if (assignmentPattern.left === node) return true;
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

function getDirectJsxSpreadInfo(
  node: Rule.Node,
  parent: Rule.Node | null,
  parentMap: WeakMap<object, ParentRef>,
): ForwardedUsageInfo | null {
  if (!parent) return null;
  const typedParent = parent as unknown as { type?: string };
  if (typedParent.type !== 'JSXSpreadAttribute') return null;
  const spread = parent as unknown as { argument?: Rule.Node };
  if (spread.argument !== node) return null;

  const openingRef = parentMap.get(parent as unknown as object);
  const openingElement = openingRef?.parent as
    | {
        type?: string;
        name?: Rule.Node;
      }
    | undefined;
  if (!openingElement || openingElement.type !== 'JSXOpeningElement') return null;

  return {
    forwardedTo: 'props spread',
    forwardedComponent: getCustomJsxName(openingElement.name),
  };
}

function getDirectJsxAttributeInfo(
  node: Rule.Node,
  parent: Rule.Node | null,
  parentMap: WeakMap<object, ParentRef>,
): ForwardedUsageInfo | null {
  const forwardedTarget = getForwardedTargetProp(node, parent, parentMap);
  if (!forwardedTarget) return null;
  if (!parent) return null;

  const attributeRef = parentMap.get(parent as unknown as object);
  const attribute = attributeRef?.parent as
    | {
        type?: string;
      }
    | undefined;
  if (!attribute || attribute.type !== 'JSXAttribute') return null;

  const openingRef = parentMap.get(attribute as unknown as object);
  const openingElement = openingRef?.parent as
    | {
        type?: string;
        name?: Rule.Node;
      }
    | undefined;

  return {
    forwardedTo: forwardedTarget,
    forwardedComponent:
      openingElement && openingElement.type === 'JSXOpeningElement'
        ? getCustomJsxName(openingElement.name)
        : null,
  };
}

function getDirectForwardedUsageInfo(
  node: Rule.Node,
  parent: Rule.Node | null,
  parentMap: WeakMap<object, ParentRef>,
): ForwardedUsageInfo | null {
  return (
    getDirectJsxAttributeInfo(node, parent, parentMap) ??
    getDirectJsxSpreadInfo(node, parent, parentMap)
  );
}

function analyzeComponent(
  functionNode: Rule.Node,
  name: string | null | undefined,
  params: Rule.Node[] | undefined,
  body: Rule.Node | null | undefined,
  ignorePropsSpread: boolean,
): ComponentPassThroughRecord | null {
  if (!name || !isPascalCase(name)) return null;
  const firstParam = (params ?? [])[0];
  const bindings = getPropBindings(firstParam, ignorePropsSpread);
  if (bindings.length === 0) return null;

  const bindingMap = new Map<string, PropBinding>();
  for (const binding of bindings) {
    if (binding.propName === 'children') continue;
    bindingMap.set(binding.localName, binding);
  }
  if (bindingMap.size === 0) return null;

  const usageMap = new Map<string, PropUsage>();
  for (const localName of bindingMap.keys()) {
    usageMap.set(localName, {
      seen: false,
      owned: false,
      forwardedTo: new Set<string>(),
      forwardedComponents: new Set<string>(),
    });
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
    const forwardedUsageInfo = getDirectForwardedUsageInfo(node, parent, parentMap);
    if (!forwardedUsageInfo) {
      usage.owned = true;
      return;
    }
    usage.forwardedTo.add(forwardedUsageInfo.forwardedTo);
    if (forwardedUsageInfo.forwardedComponent) {
      usage.forwardedComponents.add(forwardedUsageInfo.forwardedComponent);
    }
  });

  const violations: PropViolation[] = [];
  const passThroughChildren = new Set<string>();
  for (const [localName, usage] of usageMap.entries()) {
    if (!usage.seen || usage.owned) continue;
    const binding = bindingMap.get(localName);
    if (!binding) continue;
    violations.push({
      binding,
      forwardedTo: usage.forwardedTo,
    });
    for (const childName of usage.forwardedComponents) {
      passThroughChildren.add(childName);
    }
  }

  if (violations.length === 0) return null;

  return {
    name,
    node: functionNode,
    passThroughChildren,
    violations,
  };
}

function computePassThroughDepth(
  componentName: string,
  components: Map<string, ComponentPassThroughRecord>,
  memo: Map<string, number>,
  visiting: Set<string>,
): number {
  const cached = memo.get(componentName);
  if (cached != null) return cached;
  if (visiting.has(componentName)) return 1;
  visiting.add(componentName);

  const component = components.get(componentName);
  if (!component) {
    memo.set(componentName, 1);
    visiting.delete(componentName);
    return 1;
  }

  let childMaxDepth = 0;
  for (const childName of component.passThroughChildren) {
    if (!components.has(childName)) continue;
    const childDepth = computePassThroughDepth(childName, components, memo, visiting);
    if (childDepth > childMaxDepth) childMaxDepth = childDepth;
  }

  const depth = 1 + childMaxDepth;
  memo.set(componentName, depth);
  visiting.delete(componentName);
  return depth;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow prop drilling in component owners',
      url: 'https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-prop-drilling.md',
    },
    messages: {
      noPropDrilling:
        "Prop '{{prop}}' in '{{component}}' has a prop drilling depth of {{depth}} (allowed {{allowedDepth}}). Use compound composition.",
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedDepth: {
            type: 'integer',
            minimum: 1,
          },
          ignorePropsSpread: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const rawOptions = (context.options[0] as RuleOptions | undefined) ?? {};
    const allowedDepthRaw = rawOptions.allowedDepth;
    const allowedDepth =
      Number.isInteger(allowedDepthRaw) && (allowedDepthRaw ?? 0) >= 1
        ? (allowedDepthRaw as number)
        : DEFAULT_ALLOWED_DEPTH;
    const ignorePropsSpread =
      typeof rawOptions.ignorePropsSpread === 'boolean'
        ? rawOptions.ignorePropsSpread
        : DEFAULT_IGNORE_PROPS_SPREAD;

    const components = new Map<string, ComponentPassThroughRecord>();

    return {
      FunctionDeclaration(node: Rule.Node) {
        const fn = node as unknown as {
          id?: { name?: string } | null;
          params?: Rule.Node[];
          body?: Rule.Node;
        };
        const component = analyzeComponent(node, fn.id?.name, fn.params, fn.body, ignorePropsSpread);
        if (!component) return;
        components.set(component.name, component);
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
        const record = analyzeComponent(
          init,
          id.name,
          component.params,
          component.body,
          ignorePropsSpread,
        );
        if (!record) return;
        components.set(record.name, record);
      },
      'Program:exit'() {
        const memo = new Map<string, number>();
        const flaggedComponents: Array<{ component: ComponentPassThroughRecord; depth: number }> = [];

        for (const component of components.values()) {
          const depth = computePassThroughDepth(component.name, components, memo, new Set<string>());
          if (depth <= allowedDepth) {
            continue;
          }
          flaggedComponents.push({ component, depth });
        }

        flaggedComponents.sort((left, right) => {
          if (right.depth !== left.depth) {
            return right.depth - left.depth;
          }
          return left.component.name.localeCompare(right.component.name);
        });

        const flaggedNames = new Set(flaggedComponents.map((entry) => entry.component.name));

        for (const flaggedComponent of flaggedComponents) {
          const component = flaggedComponent.component;
          const depth = flaggedComponent.depth;
          const hasFlaggedParent = flaggedComponents.some((candidate) => {
            if (candidate.component.name === component.name) {
              return false;
            }
            if (!flaggedNames.has(candidate.component.name)) {
              return false;
            }
            return candidate.component.passThroughChildren.has(component.name);
          });
          if (hasFlaggedParent) {
            continue;
          }

          for (const violation of component.violations) {
            context.report({
              node: violation.binding.node,
              messageId: 'noPropDrilling',
              data: {
                prop: violation.binding.propName,
                component: component.name,
                forwardedTo:
                  violation.forwardedTo.size > 0
                    ? Array.from(violation.forwardedTo).sort().join(', ')
                    : 'child prop',
                depth: String(depth),
                allowedDepth: String(allowedDepth),
              },
            });
          }
        }
      },
    };
  },
};

export default rule;
