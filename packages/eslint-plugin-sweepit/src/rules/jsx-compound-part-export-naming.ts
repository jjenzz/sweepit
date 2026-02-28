import type { Rule } from 'eslint';
import path from 'node:path';

interface ExportRecord {
  localName: string;
  exportedName: string;
  node: Rule.Node;
}

interface ObjectExportRecord {
  name: string;
  node: Rule.Node;
}

function isPascalCase(name: string): boolean {
  if (name.length === 0) return false;
  const first = name[0];
  return first >= 'A' && first <= 'Z';
}

function normalizeForComparison(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getFileStem(filename: string): string | null {
  if (!filename || filename === '<input>') return null;
  const base = path.basename(filename);
  const ext = path.extname(base);
  if (!ext) return base;
  return base.slice(0, -ext.length);
}

function isFunctionLikeComponentInit(node: Rule.Node | null | undefined): boolean {
  if (!node) return false;
  const typed = node as unknown as { type?: string };
  return typed.type === 'ArrowFunctionExpression' || typed.type === 'FunctionExpression';
}

function getIdentifierLikeName(node: Rule.Node | null | undefined): string | null {
  if (!node) return null;
  const typedNode = node as unknown as { type?: string; name?: string; value?: unknown };
  if (typedNode.type === 'Identifier' && typedNode.name) return typedNode.name;
  if (typedNode.type === 'Literal' && typeof typedNode.value === 'string') return typedNode.value;
  return null;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce compound export aliasing from file-stem block and disallow runtime object export APIs',
      url: 'https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/jsx-compound-part-export-naming.md',
    },
    messages: {
      requirePartAlias:
        "Export '{{local}}' as '{{part}}' for block '{{block}}' (export { {{local}} as {{part}} }).",
      requireRootExport:
        "Block '{{block}}' exports parts. Also export its root as `export { {{block}} as Root }`.",
      requireRootAlias: "Export block '{{block}}' as 'Root' (export { {{block}} as Root }).",
      noRuntimeObjectExport:
        "Avoid exporting runtime object '{{name}}' for compound APIs. Export aliase parts instead.",
    },
    schema: [],
  },
  create(context) {
    const localComponents = new Set<string>();
    const exports: ExportRecord[] = [];
    const objectExports: ObjectExportRecord[] = [];

    function registerLocalComponent(name: string): void {
      if (!isPascalCase(name)) return;
      localComponents.add(name);
    }

    function recordExport(localName: string, exportedName: string, node: Rule.Node): void {
      exports.push({ localName, exportedName, node });
    }

    return {
      FunctionDeclaration(node: Rule.Node) {
        const fn = node as unknown as { id?: Rule.Node | null };
        const idName = getIdentifierLikeName(fn.id);
        if (!idName) return;
        registerLocalComponent(idName);
      },
      VariableDeclarator(node: Rule.Node) {
        const declaration = node as unknown as { id?: Rule.Node; init?: Rule.Node | null };
        if (!isFunctionLikeComponentInit(declaration.init)) return;
        const idName = getIdentifierLikeName(declaration.id);
        if (!idName) return;
        registerLocalComponent(idName);
      },
      ExportNamedDeclaration(node: Rule.Node) {
        const declaration = node as unknown as {
          declaration?: Rule.Node | null;
          specifiers?: Rule.Node[];
          source?: Rule.Node | null;
        };

        if (declaration.source) return;

        if (declaration.declaration?.type === 'FunctionDeclaration') {
          const fn = declaration.declaration as unknown as { id?: Rule.Node | null };
          const idName = getIdentifierLikeName(fn.id);
          if (!idName || !fn.id) return;
          registerLocalComponent(idName);
          recordExport(idName, idName, fn.id);
          return;
        }

        if (declaration.declaration?.type === 'VariableDeclaration') {
          const variableDeclaration = declaration.declaration as unknown as {
            declarations?: Array<{ id?: Rule.Node; init?: Rule.Node | null }>;
          };
          for (const entry of variableDeclaration.declarations ?? []) {
            const idName = getIdentifierLikeName(entry.id);
            if (!idName || !entry.id) continue;

            if (entry.init?.type === 'ObjectExpression' && isPascalCase(idName)) {
              objectExports.push({ name: idName, node: entry.id });
              continue;
            }

            if (!isFunctionLikeComponentInit(entry.init)) continue;
            registerLocalComponent(idName);
            recordExport(idName, idName, entry.id);
          }
          return;
        }

        for (const specifier of declaration.specifiers ?? []) {
          if (specifier.type !== 'ExportSpecifier') continue;
          const exportSpecifier = specifier as unknown as {
            local?: Rule.Node;
            exported?: Rule.Node;
          };
          const localName = getIdentifierLikeName(exportSpecifier.local);
          const exportedName = getIdentifierLikeName(exportSpecifier.exported);
          if (!localName || !exportedName || !exportSpecifier.exported) continue;
          recordExport(localName, exportedName, exportSpecifier.exported);
        }
      },
      ExportDefaultDeclaration(node: Rule.Node) {
        const declaration = node as unknown as { declaration?: Rule.Node | null };
        const declared = declaration.declaration;
        if (!declared) return;

        if (declared.type === 'FunctionDeclaration') {
          const fn = declared as unknown as { id?: Rule.Node | null };
          const idName = getIdentifierLikeName(fn.id);
          if (!idName || !fn.id) return;
          registerLocalComponent(idName);
          recordExport(idName, idName, fn.id);
          return;
        }

        if (declared.type === 'Identifier') {
          const idName = getIdentifierLikeName(declared);
          if (!idName) return;
          recordExport(idName, idName, declared);
        }
      },
      'Program:exit'() {
        const stem = getFileStem(context.filename);
        if (!stem) return;
        if (stem.toLowerCase() === 'index') return;

        const normalizedStem = normalizeForComparison(stem);
        const blockCandidates = [
          ...new Set([...localComponents, ...objectExports.map((e) => e.name)]),
        ].filter((name) => normalizeForComparison(name) === normalizedStem);
        if (blockCandidates.length === 0) return;

        const block = blockCandidates[0];
        if (!block) return;
        for (const objectExport of objectExports) {
          if (objectExport.name !== block) continue;
          context.report({
            node: objectExport.node,
            messageId: 'noRuntimeObjectExport',
            data: { name: objectExport.name },
          });
        }

        const componentExports = exports.filter(
          (entry) => localComponents.has(entry.localName) && isPascalCase(entry.localName),
        );
        if (componentExports.length < 2) return;
        const blockExports = componentExports.filter((entry) => entry.localName === block);
        const partExports = componentExports.filter(
          (entry) => entry.localName !== block && entry.localName.startsWith(block),
        );

        const partNames = [...new Set(partExports.map((entry) => entry.localName))];
        for (const partName of partNames) {
          const expectedPartAlias = partName.slice(block.length);
          if (expectedPartAlias.length === 0) continue;

          const partEntries = partExports.filter((entry) => entry.localName === partName);
          const hasPartAlias = partEntries.some(
            (entry) => entry.exportedName === expectedPartAlias,
          );
          if (hasPartAlias) continue;

          const firstPartEntry = partEntries[0];
          if (!firstPartEntry) continue;
          context.report({
            node: firstPartEntry.node,
            messageId: 'requirePartAlias',
            data: {
              local: partName,
              part: expectedPartAlias,
              block,
            },
          });
        }

        if (partExports.length > 0) {
          if (blockExports.length === 0) {
            const firstPartExport = partExports[0];
            if (!firstPartExport) return;
            context.report({
              node: firstPartExport.node,
              messageId: 'requireRootExport',
              data: { block },
            });
          } else {
            const hasRootAlias = blockExports.some((entry) => entry.exportedName === 'Root');
            if (!hasRootAlias) {
              const firstBlockExport = blockExports[0];
              if (!firstBlockExport) return;
              context.report({
                node: firstBlockExport.node,
                messageId: 'requireRootAlias',
                data: { block },
              });
            }
          }
        }
      },
    };
  },
};

export default rule;
