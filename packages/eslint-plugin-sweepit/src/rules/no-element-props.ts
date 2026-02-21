import type { Rule } from "eslint";
import ts from "typescript";

interface TSPropertySignatureNode {
	type: string;
	key: { type: string; name?: string };
	typeAnnotation?: { typeAnnotation: unknown };
}

interface TSInterfaceBodyNode {
	type: string;
	body: TSPropertySignatureNode[];
}

interface TSInterfaceDeclarationNode {
	type: string;
	body: TSInterfaceBodyNode;
}

interface TSTypeLiteralNode {
	type: string;
	members: TSPropertySignatureNode[];
}

interface TSTypeAliasDeclarationNode {
	type: string;
	id?: { type: string; name?: string };
	typeAnnotation: unknown;
}

interface TSTypeReferenceNode {
	type: string;
	typeName:
		| { type: string; name?: string }
		| {
				type: string;
				left: { type: string; name?: string };
				right: { type: string; name?: string };
		  };
}

function getPropKeyName(prop: TSPropertySignatureNode): string | null {
	const key = prop.key;
	if (key.type === "Identifier" && "name" in key) return key.name ?? null;
	return null;
}

function getPropsFromInterfaceBody(
	body: TSInterfaceBodyNode,
): TSPropertySignatureNode[] {
	return body.body ?? [];
}

function getPropsFromTypeLiteral(typeNode: unknown): TSPropertySignatureNode[] {
	const n = typeNode as TSTypeLiteralNode;
	if (n && n.type === "TSTypeLiteral" && Array.isArray(n.members))
		return n.members;
	return [];
}

const rule: Rule.RuleModule = {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Disallow ReactNode/ReactElement-typed props except children/render.",
			url: "https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-element-props.md",
		},
		messages: {
			noElementProps:
				"Prop '{{prop}}' has an element type (ReactNode/ReactElement). Use compound composition instead: expose parts and compose via 'children' (for example <Card><Card.Header /></Card>) rather than passing '{{prop}}' as an element prop. See: https://github.com/jjenzz/sweepit/tree/main/packages/eslint-plugin-sweepit/docs/rules/no-element-props.md.",
		},
		schema: [],
	},
	create(context) {
		const parserServices =
			(
				context.sourceCode as {
					parserServices?: {
						program?: ts.Program;
						getTypeAtLocation?: (node: unknown) => ts.Type;
						esTreeNodeToTSNodeMap?: Map<unknown, ts.Node>;
					};
				}
			).parserServices ??
			(
				context as Rule.RuleContext & {
					parserServices?: {
						program?: ts.Program;
						getTypeAtLocation?: (node: unknown) => ts.Type;
						esTreeNodeToTSNodeMap?: Map<unknown, ts.Node>;
					};
				}
			).parserServices;
		const checker = parserServices?.program?.getTypeChecker();
		const aliasTypeMap = new Map<string, unknown>();

		function getTypeNameFromRef(node: TSTypeReferenceNode): string | null {
			const typeName = node.typeName as {
				type: string;
				name?: string;
				right?: { name?: string };
			};
			if ("name" in typeName && typeName.name) return typeName.name;
			if ("right" in typeName && typeName.right?.name)
				return typeName.right.name;
			return null;
		}

		function astContainsReactType(
			typeNode: unknown,
			reactTypeName: "ReactNode" | "ReactElement",
			visitedAliases: Set<string>,
		): boolean {
			if (!typeNode || typeof typeNode !== "object") return false;
			const node = typeNode as Record<string, unknown>;

			if (node.type === "TSTypeReference") {
				const ref = node as unknown as TSTypeReferenceNode;
				const typeName = getTypeNameFromRef(ref);
				if (typeName === reactTypeName) return true;
				if (
					typeName &&
					aliasTypeMap.has(typeName) &&
					!visitedAliases.has(typeName)
				) {
					visitedAliases.add(typeName);
					return astContainsReactType(
						aliasTypeMap.get(typeName),
						reactTypeName,
						visitedAliases,
					);
				}
				return false;
			}

			if (node.type === "TSUnionType" || node.type === "TSIntersectionType") {
				const unionNode = node as { types?: unknown[] };
				return (unionNode.types ?? []).some((entry) =>
					astContainsReactType(entry, reactTypeName, visitedAliases),
				);
			}

			if (
				node.type === "TSOptionalType" ||
				node.type === "TSParenthesizedType"
			) {
				const wrapped = node as { typeAnnotation?: unknown };
				return astContainsReactType(
					wrapped.typeAnnotation,
					reactTypeName,
					visitedAliases,
				);
			}

			return false;
		}

		function isReactSymbol(
			symbol: ts.Symbol | undefined,
			name: string,
		): boolean {
			if (!symbol || symbol.getName() !== name) return false;
			return (
				symbol.declarations?.some((declaration) =>
					declaration.getSourceFile().fileName.includes("/react/"),
				) ?? false
			);
		}

		function symbolContainsReactType(
			symbol: ts.Symbol | undefined,
			reactTypeName: "ReactNode" | "ReactElement",
			visitedSymbols: Set<ts.Symbol>,
			visitedTypes: Set<ts.Type>,
		): boolean {
			if (!symbol || !checker) return false;
			if (visitedSymbols.has(symbol)) return false;
			visitedSymbols.add(symbol);

			if (isReactSymbol(symbol, reactTypeName)) return true;

			if ((symbol.flags & ts.SymbolFlags.Alias) !== 0) {
				const aliased = checker.getAliasedSymbol(symbol);
				if (
					symbolContainsReactType(
						aliased,
						reactTypeName,
						visitedSymbols,
						visitedTypes,
					)
				)
					return true;
			}

			if ((symbol.flags & ts.SymbolFlags.TypeAlias) !== 0) {
				const declaredType = checker.getDeclaredTypeOfSymbol(symbol);
				if (
					typeContainsReactType(
						declaredType,
						reactTypeName,
						visitedSymbols,
						visitedTypes,
					)
				)
					return true;
			}

			if ((symbol.flags & ts.SymbolFlags.Interface) !== 0) {
				const declaredType = checker.getDeclaredTypeOfSymbol(symbol);
				if (declaredType.flags & ts.TypeFlags.Object) {
					const objectType = declaredType as ts.ObjectType;
					for (const baseType of checker.getBaseTypes(
						objectType as ts.InterfaceType,
					) ?? []) {
						if (
							typeContainsReactType(
								baseType,
								reactTypeName,
								visitedSymbols,
								visitedTypes,
							)
						)
							return true;
					}
				}
			}

			return false;
		}

		function typeContainsReactType(
			type: ts.Type | undefined,
			reactTypeName: "ReactNode" | "ReactElement",
			visitedSymbols: Set<ts.Symbol>,
			visitedTypes: Set<ts.Type>,
		): boolean {
			if (!type || !checker) return false;
			if (visitedTypes.has(type)) return false;
			visitedTypes.add(type);

			if (type.isUnionOrIntersection()) {
				return type.types.some((entry) =>
					typeContainsReactType(
						entry,
						reactTypeName,
						visitedSymbols,
						visitedTypes,
					),
				);
			}

			if (
				symbolContainsReactType(
					type.aliasSymbol,
					reactTypeName,
					visitedSymbols,
					visitedTypes,
				)
			)
				return true;
			if (
				symbolContainsReactType(
					type.getSymbol(),
					reactTypeName,
					visitedSymbols,
					visitedTypes,
				)
			)
				return true;

			if ("target" in type) {
				const target = (type as ts.TypeReference).target;
				if (
					typeContainsReactType(
						target,
						reactTypeName,
						visitedSymbols,
						visitedTypes,
					)
				)
					return true;
			}

			return false;
		}

		function getTypeAtProp(prop: TSPropertySignatureNode): ts.Type | null {
			if (!checker) return null;
			const typeNode = prop.typeAnnotation?.typeAnnotation;
			if (!typeNode) return null;
			if (parserServices?.getTypeAtLocation) {
				return parserServices.getTypeAtLocation(typeNode);
			}
			if (!parserServices?.esTreeNodeToTSNodeMap) return null;
			const tsNode = parserServices.esTreeNodeToTSNodeMap.get(typeNode);
			if (!tsNode) return null;
			return checker.getTypeAtLocation(tsNode);
		}

		function checkProp(prop: TSPropertySignatureNode, reportNode: Rule.Node) {
			const name = getPropKeyName(prop);
			if (!name) return;
			const typeAnn = prop.typeAnnotation?.typeAnnotation;
			const propType = getTypeAtProp(prop);
			const hasReactNodeType =
				(propType
					? typeContainsReactType(propType, "ReactNode", new Set(), new Set())
					: false) || astContainsReactType(typeAnn, "ReactNode", new Set());
			const hasReactElementType =
				(propType
					? typeContainsReactType(
							propType,
							"ReactElement",
							new Set(),
							new Set(),
						)
					: false) || astContainsReactType(typeAnn, "ReactElement", new Set());

			const hasElementType = hasReactNodeType || hasReactElementType;
			if (hasElementType && name !== "children" && name !== "render") {
				context.report({
					node: reportNode,
					messageId: "noElementProps",
					data: { prop: name },
				});
			}
		}

		function visitProps(props: TSPropertySignatureNode[]) {
			for (const prop of props) {
				if (prop.type !== "TSPropertySignature") continue;
				checkProp(prop, prop.key as Rule.Node);
			}
		}

		return {
			TSInterfaceDeclaration(node: Rule.Node) {
				const decl = node as unknown as TSInterfaceDeclarationNode;
				if (decl.body?.type === "TSInterfaceBody") {
					visitProps(getPropsFromInterfaceBody(decl.body));
				}
			},
			TSTypeAliasDeclaration(node: Rule.Node) {
				const decl = node as unknown as TSTypeAliasDeclarationNode;
				if (
					decl.id?.type === "Identifier" &&
					decl.id.name &&
					decl.typeAnnotation
				) {
					aliasTypeMap.set(decl.id.name, decl.typeAnnotation);
				}
				const typeAnn = decl.typeAnnotation;
				if (typeAnn) {
					visitProps(getPropsFromTypeLiteral(typeAnn));
				}
			},
		};
	},
};

export default rule;
