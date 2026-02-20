import type { Rule } from 'eslint';

interface JSXIdentifier {
  type: 'JSXIdentifier';
  name: string;
}

interface JSXNamespacedName {
  type: 'JSXNamespacedName';
  namespace: JSXIdentifier;
  name: JSXIdentifier;
}

const DEFAULT_VERBS = [
  'KeyDown',
  'KeyUp',
  'Change',
  'Click',
  'Submit',
  'Focus',
  'Blur',
  'Select',
  'Open',
  'Close',
  'Toggle',
  'Input',
  'Press',
  'Hover',
  'Drag',
  'Drop',
  'Scroll',
  'Disable',
  'Disabled',
  'Enable',
  'Enabled',
  'Activate',
  'Activated',
  'Deactivate',
  'Deactivated',
  'Show',
  'Shown',
  'Hide',
  'Hidden',
  'Expand',
  'Expanded',
  'Collapse',
  'Collapsed',
  'Resize',
  'Resized',
  'Move',
  'Moved',
  'Delete',
  'Deleted',
  'Create',
  'Created',
  'Update',
  'Updated',
  'Load',
  'Loaded',
  'Save',
  'Saved',
  'Reset',
  'Validate',
  'Validated',
] as const;

const DEFAULT_NOUNS = [
  'Input',
  'Value',
  'Form',
  'Option',
  'Modal',
  'Button',
  'Toggle',
  'Dialog',
  'Dropdown',
  'Item',
  'Field',
  'Feature',
  'State',
  'Status',
  'Theme',
  'Mode',
  'User',
  'Users',
  'Filter',
  'Sort',
  'Search',
  'Query',
  'Date',
  'Time',
  'Range',
  'Step',
  'Panel',
  'Section',
  'Row',
  'Column',
  'Cell',
  'Tab',
  'Menu',
  'Link',
  'Page',
  'Route',
  'View',
  'Dialog',
  'Drawer',
  'Sidebar',
  'Tooltip',
  'Popover',
  'Accordion',
  'Toast',
  'Notification',
] as const;

interface RuleOptions {
  allowedVerbs?: string[];
  allowedNouns?: string[];
}

function getPropName(node: JSXIdentifier | JSXNamespacedName): string | null {
  if (node.type === 'JSXIdentifier') {
    return node.name;
  }
  if (node.type === 'JSXNamespacedName') {
    return `${node.namespace.name}:${node.name.name}`;
  }
  return null;
}

function isHandlerProp(name: string): boolean {
  return name.startsWith('on') && name.length > 2;
}

/**
 * Returns true if rest can be parsed as Noun+Verb (correct pattern on{Noun}{Verb})
 * and the noun is a common UI noun (avoids treating onFocusInput as correct).
 */
function isNounVerbPattern(rest: string, verbs: string[], nouns: Set<string>): boolean {
  for (const verb of verbs) {
    if (!rest.endsWith(verb)) continue;
    const noun = rest.slice(0, -verb.length);
    if (noun.length < 1) continue;
    if (noun[0] !== noun[0].toUpperCase()) continue;
    if (!nouns.has(noun)) continue;
    return true;
  }
  return false;
}

/**
 * Detects on{Verb}{Noun} pattern and returns suggestion on{Noun}{Verb} if found.
 * Returns null if the prop is already correct (on{Noun}{Verb}) or not matched.
 */
function getNounVerbSuggestion(
  propName: string,
  verbs: string[],
  nouns: Set<string>,
): string | null {
  if (!isHandlerProp(propName)) return null;

  const rest = propName.slice(2);
  if (rest.length < 2) return null;

  if (isNounVerbPattern(rest, verbs, nouns)) return null;

  for (const verb of verbs) {
    if (!rest.startsWith(verb)) continue;

    const noun = rest.slice(verb.length);
    if (noun.length < 1) continue;
    if (noun[0] !== noun[0].toUpperCase()) continue;

    return `on${noun}${verb}`;
  }

  return null;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer on{Noun}{Verb} over on{Verb}{Noun} for handler prop names (e.g. onValueChange over onChangeValue).',
    },
    messages: {
      preferNounVerb: "Prefer '{{suggestion}}' over '{{prop}}' (noun before verb).",
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedVerbs: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          allowedNouns: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = (context.options[0] as RuleOptions | undefined) ?? {};
    const verbs = options.allowedVerbs ?? [...DEFAULT_VERBS];
    verbs.sort((a, b) => b.length - a.length);
    const nouns = new Set<string>(options.allowedNouns ?? [...DEFAULT_NOUNS]);

    return {
      JSXAttribute(node: Rule.Node) {
        const attr = node as unknown as {
          name: JSXIdentifier | JSXNamespacedName;
        };
        const propName = getPropName(attr.name);
        if (!propName) return;

        const suggestion = getNounVerbSuggestion(propName, verbs, nouns);
        if (!suggestion) return;

        context.report({
          node: attr.name,
          messageId: 'preferNounVerb',
          data: { prop: propName, suggestion },
        });
      },
    };
  },
};

export default rule;
