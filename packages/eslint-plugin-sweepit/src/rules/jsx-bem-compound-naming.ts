import type { Rule } from 'eslint';
import path from 'node:path';

function isPascalCase(name: string): boolean {
  if (name.length === 0) return false;
  const first = name[0];
  return first >= 'A' && first <= 'Z';
}

function isFunctionLikeComponentInit(node: Rule.Node | null | undefined): boolean {
  if (!node) return false;
  const typed = node as unknown as { type?: string };
  return typed.type === 'ArrowFunctionExpression' || typed.type === 'FunctionExpression';
}

function normalizeForComparison(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildExampleName(block: string, localName: string): string {
  if (localName.startsWith(block)) return localName;

  let overlapLength = 0;
  for (let index = 1; index < block.length; index += 1) {
    const suffix = block.slice(index);
    if (localName.startsWith(suffix)) {
      overlapLength = suffix.length;
      break;
    }
  }

  if (overlapLength === 0) return `${block}${localName}`;
  return `${block}${localName.slice(overlapLength)}`;
}

function getFileStem(filename: string): string | null {
  if (!filename || filename === '<input>') return null;
  const base = path.basename(filename);
  const ext = path.extname(base);
  if (!ext) return base;
  return base.slice(0, -ext.length);
}

function getExportedIdentifierName(node: Rule.Node | null | undefined): string | null {
  if (!node) return null;
  const typedNode = node as unknown as { type?: string; name?: string; value?: unknown };
  if (typedNode.type === 'Identifier' && typedNode.name) return typedNode.name;
  if (typedNode.type === 'Literal' && typeof typedNode.value === 'string') return typedNode.value;
  return null;
}

interface ExportedComponent {
  localName: string;
  exportedName: string;
  node: Rule.Node;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce compound component export naming by matching exported component names to the file stem block prefix',
      url: 'https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/jsx-bem-compound-naming.md',
    },
    messages: {
      exportedPartMustUseBlockPrefix:
        "Exported component '{{name}}' should be prefixed with compound block '{{block}}' (e.g. '{{example}}').",
    },
    schema: [],
  },
  create(context) {
    const localComponents = new Map<string, Rule.Node>();
    const exportedComponents: ExportedComponent[] = [];

    function registerLocalComponent(name: string, node: Rule.Node): void {
      if (!isPascalCase(name)) return;
      localComponents.set(name, node);
    }

    function recordExport(localName: string, exportedName: string, node: Rule.Node): void {
      if (!localComponents.has(localName)) return;
      if (!isPascalCase(exportedName)) return;
      exportedComponents.push({ localName, exportedName, node });
    }

    return {
      FunctionDeclaration(node: Rule.Node) {
        const fn = node as unknown as { id?: Rule.Node | null };
        const idName = getExportedIdentifierName(fn.id);
        if (!idName) return;
        registerLocalComponent(idName, fn.id as Rule.Node);
      },
      VariableDeclarator(node: Rule.Node) {
        const declaration = node as unknown as { id?: Rule.Node; init?: Rule.Node | null };
        if (!isFunctionLikeComponentInit(declaration.init)) return;
        const idName = getExportedIdentifierName(declaration.id);
        if (!idName || !declaration.id) return;
        registerLocalComponent(idName, declaration.id);
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
          const idName = getExportedIdentifierName(fn.id);
          if (!idName || !fn.id) return;
          registerLocalComponent(idName, fn.id);
          recordExport(idName, idName, fn.id);
          return;
        }

        if (declaration.declaration?.type === 'VariableDeclaration') {
          const variableDeclaration = declaration.declaration as unknown as {
            declarations?: Array<{ id?: Rule.Node; init?: Rule.Node | null }>;
          };
          for (const entry of variableDeclaration.declarations ?? []) {
            if (!isFunctionLikeComponentInit(entry.init)) continue;
            const idName = getExportedIdentifierName(entry.id);
            if (!idName || !entry.id) continue;
            registerLocalComponent(idName, entry.id);
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
          const localName = getExportedIdentifierName(exportSpecifier.local);
          const exportedName = getExportedIdentifierName(exportSpecifier.exported);
          if (!localName || !exportedName) continue;
          if (!exportSpecifier.exported) continue;
          recordExport(localName, exportedName, exportSpecifier.exported);
        }
      },
      ExportDefaultDeclaration(node: Rule.Node) {
        const declaration = node as unknown as { declaration?: Rule.Node | null };
        const declared = declaration.declaration;
        if (!declared) return;

        if (declared.type === 'FunctionDeclaration') {
          const fn = declared as unknown as { id?: Rule.Node | null };
          const idName = getExportedIdentifierName(fn.id);
          if (!idName || !fn.id) return;
          registerLocalComponent(idName, fn.id);
          recordExport(idName, idName, fn.id);
          return;
        }

        if (declared.type === 'Identifier') {
          const idName = getExportedIdentifierName(declared);
          if (!idName) return;
          recordExport(idName, idName, declared);
        }
      },
      'Program:exit'() {
        if (exportedComponents.length < 2) return;

        const stem = getFileStem(context.filename);
        if (!stem) return;
        if (stem.toLowerCase() === 'index') return;

        const normalizedStem = normalizeForComparison(stem);
        const blockCandidates = exportedComponents
          .map((entry) => entry.localName)
          .filter((name) => normalizeForComparison(name) === normalizedStem);

        if (blockCandidates.length === 0) return;

        for (const exported of exportedComponents) {
          const isBlockExport = blockCandidates.includes(exported.localName);
          if (isBlockExport) continue;

          const usesAnyBlockPrefix = blockCandidates.some((block) =>
            exported.localName.startsWith(block),
          );
          if (usesAnyBlockPrefix) continue;

          const preferredBlock = blockCandidates[0] ?? 'Block';
          context.report({
            node: exported.node,
            messageId: 'exportedPartMustUseBlockPrefix',
            data: {
              name: exported.localName,
              block: preferredBlock,
              example: buildExampleName(preferredBlock, exported.localName),
            },
          });
        }
      },
    };
  },
};

export default rule;
