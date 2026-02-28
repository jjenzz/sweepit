import type { Rule } from 'eslint';

function isContextHookName(name: string): boolean {
  return name.startsWith('use') && name.endsWith('Context') && name.length > 10;
}

function reportIfContextHook(context: Rule.RuleContext, node: Rule.Node, name: string): void {
  if (!isContextHookName(name)) return;
  context.report({
    node,
    messageId: 'noExportedContextHook',
    data: { name },
  });
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow exporting use*Context hooks. Keep context hooks private to the component module.',
      url: 'https://github.com/jjenzz/sweepit/tree/main/skills/sweepi/rules/no-exported-context-hooks.md',
    },
    messages: {
      noExportedContextHook:
        "Do not export context hook '{{name}}'. Keep it private and expose a controlled API instead.",
    },
    schema: [],
  },
  create(context) {
    function checkNamedExport(node: Rule.Node): void {
      const exp = node as {
        declaration?: Rule.Node | null;
        specifiers?: Rule.Node[];
      };
      const declaration = exp.declaration;

      if (declaration?.type === 'FunctionDeclaration') {
        const fn = declaration as { id?: { name?: string } | null };
        if (!fn.id?.name) return;
        reportIfContextHook(context, declaration, fn.id.name);
        return;
      }

      if (declaration?.type === 'VariableDeclaration') {
        const decl = declaration as unknown as { declarations?: Rule.Node[] };
        for (const entry of decl.declarations ?? []) {
          const d = entry as { id?: Rule.Node };
          if (d.id?.type !== 'Identifier') continue;
          const id = d.id as { name: string };
          reportIfContextHook(context, d.id, id.name);
        }
        return;
      }

      for (const specifier of exp.specifiers ?? []) {
        if (specifier.type !== 'ExportSpecifier') continue;
        const s = specifier as unknown as {
          local?: Rule.Node;
          exported?: Rule.Node;
        };
        if (s.local?.type === 'Identifier') {
          const local = s.local as { name: string };
          reportIfContextHook(context, s.local, local.name);
          continue;
        }
        if (s.exported?.type === 'Identifier') {
          const exported = s.exported as { name: string };
          reportIfContextHook(context, s.exported, exported.name);
        }
      }
    }

    function checkDefaultExport(node: Rule.Node): void {
      const exp = node as { declaration?: Rule.Node };
      const declaration = exp.declaration;
      if (!declaration) return;

      if (declaration.type === 'Identifier') {
        const id = declaration as { name: string };
        reportIfContextHook(context, declaration, id.name);
        return;
      }

      if (declaration.type === 'FunctionDeclaration') {
        const fn = declaration as { id?: { name?: string } | null };
        if (!fn.id?.name) return;
        reportIfContextHook(context, declaration, fn.id.name);
      }
    }

    return {
      ExportNamedDeclaration: checkNamedExport,
      ExportDefaultDeclaration: checkDefaultExport,
    };
  },
};

export default rule;
