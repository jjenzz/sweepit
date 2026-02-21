import type { Rule } from "eslint";

interface JSXIdentifier {
	type: "JSXIdentifier";
	name: string;
}

interface JSXNamespacedName {
	type: "JSXNamespacedName";
	namespace: JSXIdentifier;
	name: JSXIdentifier;
}

const DEFAULT_VERBS = [
	"abort",
	"access",
	"activate",
	"activated",
	"add",
	"blur",
	"cancel",
	"checked",
	"change",
	"clear",
	"click",
	"close",
	"collapse",
	"collapsed",
	"complete",
	"connect",
	"copy",
	"create",
	"created",
	"deactivate",
	"deactivated",
	"delete",
	"deleted",
	"disable",
	"disabled",
	"dismiss",
	"drag",
	"drop",
	"edit",
	"enable",
	"enabled",
	"end",
	"error",
	"expand",
	"expanded",
	"finish",
	"focus",
	"generate",
	"get",
	"hide",
	"hidden",
	"hover",
	"input",
	"install",
	"keydown",
	"keyup",
	"load",
	"loaded",
	"mount",
	"move",
	"moved",
	"open",
	"paste",
	"pause",
	"persist",
	"play",
	"press",
	"progress",
	"query",
	"ready",
	"remove",
	"rename",
	"request",
	"reset",
	"resize",
	"resized",
	"retry",
	"revalidate",
	"revert",
	"save",
	"saved",
	"scroll",
	"seek",
	"select",
	"show",
	"shown",
	"skip",
	"start",
	"submit",
	"success",
	"track",
	"undo",
	"update",
	"updated",
	"upgrade",
	"upload",
	"validate",
	"validated",
	"wheel",
] as const;

const DEFAULT_NOUNS = [
	"accordion",
	"action",
	"animation",
	"attempt",
	"audio",
	"autoscroll",
	"backspace",
	"buffering",
	"button",
	"callback",
	"cell",
	"color",
	"column",
	"commit",
	"content",
	"date",
	"dialog",
	"document",
	"down",
	"drawer",
	"dropdown",
	"editor",
	"enter",
	"escape",
	"event",
	"feature",
	"field",
	"file",
	"filter",
	"folder",
	"form",
	"icon",
	"input",
	"item",
	"label",
	"limit",
	"limits",
	"link",
	"menu",
	"modal",
	"mode",
	"name",
	"note",
	"notification",
	"option",
	"options",
	"order",
	"overlay",
	"page",
	"panel",
	"player",
	"popover",
	"portal",
	"prompt",
	"range",
	"resource",
	"route",
	"row",
	"section",
	"selection",
	"sidebar",
	"sort",
	"status",
	"step",
	"stream",
	"suggestion",
	"tab",
	"text",
	"theme",
	"time",
	"title",
	"toast",
	"toggle",
	"tooltip",
	"trigger",
	"up",
	"user",
	"users",
	"value",
	"view",
	"viewport",
	"word",
] as const;

interface RuleOptions {
	extendVerbs?: string[];
	extendNouns?: string[];
}

function mergeAllowedValues(
	defaults: readonly string[],
	configured?: string[],
): string[] {
	const configuredValues = configured ?? [];
	const allValues = [...defaults, ...configuredValues];
	return [
		...new Set<string>(allValues.map(normalizeConfigValue).filter(Boolean)),
	];
}

function normalizeConfigValue(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, "");
}

function getPropName(node: JSXIdentifier | JSXNamespacedName): string | null {
	if (node.type === "JSXIdentifier") {
		return node.name;
	}
	if (node.type === "JSXNamespacedName") {
		return `${node.namespace.name}:${node.name.name}`;
	}
	return null;
}

function isHandlerProp(name: string): boolean {
	return name.startsWith("on") && name.length > 2;
}

/**
 * Returns true if rest can be parsed as Noun+Verb (correct pattern on{Noun}{Verb})
 * and the noun is a common UI noun (avoids treating onFocusInput as correct).
 */
function isNounVerbPattern(
	rest: string,
	verbs: string[],
	nouns: Set<string>,
): boolean {
	const restLower = rest.toLowerCase();
	for (const verb of verbs) {
		if (!restLower.endsWith(verb)) continue;
		const nounLower = restLower.slice(0, -verb.length);
		if (nounLower.length < 1) continue;
		const nounOriginal = rest.slice(0, -verb.length);
		if (nounOriginal[0] !== nounOriginal[0].toUpperCase()) continue;
		if (!nouns.has(nounLower)) continue;
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
	const restLower = rest.toLowerCase();
	if (rest.length < 2) return null;

	if (isNounVerbPattern(rest, verbs, nouns)) return null;

	for (const verb of verbs) {
		if (!restLower.startsWith(verb)) continue;
		// If the leading token can also be a noun, this split is ambiguous.
		// Avoid enforcing a rewrite to prevent false positives.
		if (nouns.has(verb)) return null;

		const verbOriginal = rest.slice(0, verb.length);
		const noun = rest.slice(verb.length);
		if (noun.length < 1) continue;
		if (noun[0] !== noun[0].toUpperCase()) continue;

		return `on${noun}${verbOriginal}`;
	}

	return null;
}

const rule: Rule.RuleModule = {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Prefer on{Noun}{Verb} over on{Verb}{Noun} for handler prop names (e.g. onValueChange over onChangeValue).",
			url: "https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/jsx-on-noun-verb-handler-props.md",
		},
		messages: {
			preferNounVerb:
				"Prefer '{{suggestion}}' over '{{prop}}' (noun before verb). See: https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/jsx-on-noun-verb-handler-props.md.",
		},
		schema: [
			{
				type: "object",
				properties: {
					extendVerbs: {
						type: "array",
						items: {
							type: "string",
						},
					},
					extendNouns: {
						type: "array",
						items: {
							type: "string",
						},
					},
				},
				additionalProperties: false,
			},
		],
	},
	create(context) {
		const options = (context.options[0] as RuleOptions | undefined) ?? {};
		const verbs = mergeAllowedValues(DEFAULT_VERBS, options.extendVerbs);
		verbs.sort((a, b) => b.length - a.length);
		const nouns = new Set<string>(mergeAllowedValues(DEFAULT_NOUNS, options.extendNouns));

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
					messageId: "preferNounVerb",
					data: { prop: propName, suggestion },
				});
			},
		};
	},
};

export default rule;
