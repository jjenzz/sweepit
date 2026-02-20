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

function isPascalCase(name: string): boolean {
  if (name.length === 0) return false;
  const first = name[0];
  return first >= 'A' && first <= 'Z';
}

function getCompoundParts(name: string): { block: string; part: string } | null {
  const match = /^([A-Z][a-z0-9]+)([A-Z][a-zA-Z0-9]+)$/.exec(name);
  if (!match) return null;

  const block = match[1];
  const part = match[2];
  if (!COMMON_PART_NAMES.has(part)) return null;
  return { block, part };
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer compound component member syntax in JSX (for example <Dialog.Trigger /> over <DialogTrigger />)',
    },
    messages: {
      preferMemberSyntax:
        "Use compound member syntax for '{{name}}'. Prefer '<{{block}}.{{part}} />' over '<{{name}} />'.",
    },
    schema: [],
  },
  create(context) {
    return {
      JSXOpeningElement(node: Rule.Node) {
        const opening = node as unknown as {
          name: Rule.Node;
        };
        const nameNode = opening.name;
        if (nameNode.type !== 'JSXIdentifier') return;

        const name = (nameNode as unknown as { name: string }).name;
        if (!isPascalCase(name)) return;

        const parts = getCompoundParts(name);
        if (!parts) return;

        context.report({
          node: nameNode,
          messageId: 'preferMemberSyntax',
          data: {
            name,
            block: parts.block,
            part: parts.part,
          },
        });
      },
    };
  },
};

export default rule;
