import type { Rule } from "eslint";

interface JSXIdentifier {
	type: "JSXIdentifier";
	name: string;
}

interface JSXAttributeNode {
	type: "JSXAttribute";
	name: JSXIdentifier;
}

interface RuleOptions {
	threshold?: number;
}

const DEFAULT_THRESHOLD = 3;
const IGNORED_PREFIXES = new Set([
	"aria",
	"can",
	"data",
	"has",
	"is",
	"on",
	"should",
]);

function getBundlePrefix(propName: string): string | null {
	if (!propName) return null;
	const first = propName[0];
	if (!first || first < "a" || first > "z") return null;

	let firstUpperIndex = -1;
	for (let index = 1; index < propName.length; index += 1) {
		const char = propName[index];
		if (char >= "A" && char <= "Z") {
			firstUpperIndex = index;
			break;
		}
	}

	if (firstUpperIndex <= 0 || firstUpperIndex >= propName.length) return null;
	const prefix = propName.slice(0, firstUpperIndex);
	if (!prefix || IGNORED_PREFIXES.has(prefix)) return null;
	return prefix;
}

const rule: Rule.RuleModule = {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Disallow bundles of similarly-prefixed JSX props that suggest over-grouped component APIs",
		},
		messages: {
			noPrefixedPropBundle:
				"Prop '{{prop}}' is part of a '{{prefix}}*' prop bundle ({{count}} props). Prefer unprefixed, explicit props and compound composition. If grouped data must be shared, use context.",
		},
		schema: [
			{
				type: "object",
				properties: {
					threshold: {
						type: "integer",
						minimum: 2,
					},
				},
				additionalProperties: false,
			},
		],
	},
	create(context) {
		const options = (context.options[0] as RuleOptions | undefined) ?? {};
		const threshold = options.threshold ?? DEFAULT_THRESHOLD;

		return {
			JSXOpeningElement(node: Rule.Node) {
				const opening = node as unknown as { attributes?: unknown[] };
				const groups = new Map<string, JSXAttributeNode[]>();

				for (const attributeNode of opening.attributes ?? []) {
					const maybeAttribute = attributeNode as { type?: string };
					if (maybeAttribute.type !== "JSXAttribute") continue;
					const attribute = attributeNode as unknown as JSXAttributeNode;
					if (attribute.name.type !== "JSXIdentifier") continue;

					const propName = attribute.name.name;
					const prefix = getBundlePrefix(propName);
					if (!prefix) continue;

					const existing = groups.get(prefix);
					if (existing) {
						existing.push(attribute);
						continue;
					}
					groups.set(prefix, [attribute]);
				}

				for (const [prefix, attributes] of groups.entries()) {
					if (attributes.length < threshold) continue;

					for (const attribute of attributes) {
						context.report({
							node: attribute.name as unknown as Rule.Node,
							messageId: "noPrefixedPropBundle",
							data: {
								prop: attribute.name.name,
								prefix,
								count: String(attributes.length),
							},
						});
					}
				}
			},
		};
	},
};

export default rule;
