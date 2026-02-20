import type { Rule } from 'eslint';

const COMMON_PART_NAMES = new Set([
  'Root',
  'Trigger',
  'Content',
  'Title',
  'Description',
  'Header',
  'Footer',
  'Body',
  'Item',
  'Group',
  'Label',
  'Input',
  'Control',
  'Indicator',
  'Icon',
  'Arrow',
  'Portal',
  'Overlay',
]);

function getCompoundParts(name: string): { block: string; part: string } | null {
  const match = /^([A-Z][a-z0-9]+)([A-Z][a-zA-Z0-9]+)$/.exec(name);
  if (!match) return null;

  const block = match[1];
  const part = match[2];
  if (!COMMON_PART_NAMES.has(part)) return null;
  return { block, part };
}

function isPascalCase(name: string): boolean {
  if (name.length === 0) return false;
  const first = name[0];
  return first >= 'A' && first <= 'Z';
}

function getObjectPropertyName(property: Rule.Node): string | null {
  if (property.type !== 'Property') return null;
  const prop = property as unknown as {
    key?: Rule.Node;
    computed?: boolean;
  };
  if (prop.computed) return null;
  if (!prop.key) return null;

  if (prop.key.type === 'Identifier') {
    return (prop.key as unknown as { name: string }).name;
  }
  if (prop.key.type === 'Literal') {
    const key = prop.key as unknown as { value?: unknown };
    return typeof key.value === 'string' ? key.value : null;
  }
  return null;
}

function hasCompoundPartKey(node: Rule.Node): boolean {
  if (node.type !== 'ObjectExpression') return false;
  const objectExpression = node as unknown as { properties?: Rule.Node[] };
  for (const property of objectExpression.properties ?? []) {
    const propertyName = getObjectPropertyName(property);
    if (!propertyName) continue;
    if (COMMON_PART_NAMES.has(propertyName)) return true;
  }
  return false;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce compound part export aliasing (export { DialogTrigger as Trigger }) and disallow runtime object exports',
    },
    messages: {
      requirePartAlias:
        "Export compound part '{{local}}' as '{{part}}' (export { {{local}} as {{part}} }).",
      noRuntimeObjectExport:
        "Avoid exporting runtime object '{{name}}' for compound APIs. Export parts with aliases instead (for example export { {{name}}Trigger as Trigger }).",
    },
    schema: [],
  },
  create(context) {
    return {
      ExportNamedDeclaration(node: Rule.Node) {
        const declaration = node as unknown as {
          declaration?: Rule.Node | null;
          specifiers?: Rule.Node[];
        };

        if (declaration.declaration?.type === 'VariableDeclaration') {
          const variableDeclaration = declaration.declaration as unknown as {
            declarations?: Array<{
              id?: Rule.Node;
              init?: Rule.Node | null;
            }>;
          };

          for (const entry of variableDeclaration.declarations ?? []) {
            if (entry.id?.type !== 'Identifier') continue;
            if (entry.init?.type !== 'ObjectExpression') continue;

            const id = entry.id as unknown as { name: string };
            if (!isPascalCase(id.name)) continue;
            if (!hasCompoundPartKey(entry.init)) continue;

            context.report({
              node: entry.id,
              messageId: 'noRuntimeObjectExport',
              data: { name: id.name },
            });
          }
        }

        for (const specifier of declaration.specifiers ?? []) {
          if (specifier.type !== 'ExportSpecifier') continue;

          const exportSpecifier = specifier as unknown as {
            local?: Rule.Node;
            exported?: Rule.Node;
          };
          if (exportSpecifier.local?.type !== 'Identifier') continue;
          if (exportSpecifier.exported?.type !== 'Identifier') continue;

          const local = exportSpecifier.local as unknown as { name: string };
          const exported = exportSpecifier.exported as unknown as { name: string };
          const parts = getCompoundParts(local.name);
          if (!parts) continue;

          if (exported.name === parts.part) continue;
          context.report({
            node: exportSpecifier.exported,
            messageId: 'requirePartAlias',
            data: { local: local.name, part: parts.part },
          });
        }
      },
    };
  },
};

export default rule;
