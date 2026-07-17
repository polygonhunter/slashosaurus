import { CALLOUTS } from "./callouts";
import type { BlockDef } from "./types";

/**
 * The built-in block catalog. Order matters: it is the display order within
 * each group when the query is empty.
 */

function heading(level: 1 | 2 | 3): BlockDef {
	const hashes = "#".repeat(level);
	return {
		id: `h${level}`,
		name: `Heading ${level}`,
		aliases: [`h${level}`, "heading", "title"],
		group: "text",
		template: `${hashes} {cursor}`,
		wrap: "prefixLines",
		linePrefix: `${hashes} `,
		tile: { kind: "heading", level },
	};
}

function callout(type: string, aliases: string[], foldable = true): BlockDef {
	const name = type.charAt(0).toUpperCase() + type.slice(1);
	return {
		id: `callout-${type}`,
		name,
		aliases: ["callout", type, ...aliases],
		group: "callout",
		template: `> [!${type}]{fold}\n> {cursor}`,
		wrap: "prefixLines",
		linePrefix: "> ",
		tile: { kind: "callout", calloutType: type },
		foldable,
	};
}

export const CATALOG: readonly BlockDef[] = [
	// ── Text ────────────────────────────────────────────────────────────
	heading(1),
	heading(2),
	heading(3),
	{
		id: "bullet-list",
		name: "Bulleted list",
		aliases: ["ul", "list", "bullet"],
		group: "text",
		template: "- {cursor}",
		wrap: "prefixLines",
		linePrefix: "- ",
		tile: { kind: "list", marker: "bullet" },
	},
	{
		id: "numbered-list",
		name: "Numbered list",
		aliases: ["ol", "ordered", "numbered"],
		group: "text",
		template: "1. {cursor}",
		wrap: "prefixLines",
		linePrefix: "1. ",
		tile: { kind: "list", marker: "number" },
	},
	{
		id: "check-list",
		name: "To-do list",
		aliases: ["todo", "task", "checkbox", "checklist"],
		group: "text",
		template: "- [ ] {cursor}",
		wrap: "prefixLines",
		linePrefix: "- [ ] ",
		tile: { kind: "list", marker: "check" },
	},
	{
		id: "quote",
		name: "Quote",
		aliases: ["blockquote", "cite"],
		group: "text",
		template: "> {cursor}",
		wrap: "prefixLines",
		linePrefix: "> ",
		tile: { kind: "quote" },
	},
	{
		id: "divider",
		name: "Divider",
		aliases: ["hr", "rule", "separator", "line"],
		group: "text",
		template: "---\n{cursor}",
		wrap: "none",
		tile: { kind: "divider" },
	},

	// ── Callouts (the 13 official types) ────────────────────────────────
	...CALLOUTS.map((c) => callout(c.type, c.aliases)),

	// ── Insert ──────────────────────────────────────────────────────────
	{
		id: "codeblock",
		name: "Code block",
		aliases: ["code", "fence", "snippet"],
		group: "insert",
		template: "```{lang}\n{cursor}\n```",
		wrap: "fenced",
		tile: { kind: "mono", sample: "{ }" },
		special: "codeblock",
	},
	{
		id: "table",
		name: "Table",
		aliases: ["grid", "columns"],
		group: "insert",
		template: "| {cursor} |  |\n| --- | --- |\n|  |  |\n|  |  |",
		wrap: "none",
		tile: { kind: "table" },
	},
	{
		id: "math",
		name: "Math block",
		aliases: ["latex", "equation", "formula"],
		group: "insert",
		template: "$$\n{cursor}\n$$",
		wrap: "inline",
		tile: { kind: "mono", sample: "∑x" },
	},
	{
		id: "mermaid",
		name: "Mermaid diagram",
		aliases: ["diagram", "chart", "graph", "flowchart"],
		group: "insert",
		template: "```mermaid\n{cursor}\n```",
		wrap: "fenced",
		tile: { kind: "mono", sample: "⤷◇" },
	},
	{
		id: "comment",
		name: "Comment",
		aliases: ["hidden", "invisible"],
		group: "insert",
		template: "%%{cursor}%%",
		wrap: "inline",
		tile: { kind: "icon", icon: "lucide-eye-off" },
	},
	{
		id: "internal-link",
		name: "Internal link",
		aliases: ["link", "wikilink", "note"],
		group: "insert",
		template: "[[{cursor}]]",
		wrap: "inline",
		tile: { kind: "icon", icon: "lucide-link" },
	},
	{
		id: "embed",
		name: "Embed",
		aliases: ["transclude", "include", "image"],
		group: "insert",
		template: "![[{cursor}]]",
		wrap: "inline",
		tile: { kind: "icon", icon: "lucide-picture-in-picture-2" },
	},
	{
		id: "date",
		name: "Today's date",
		aliases: ["date", "today", "now"],
		group: "insert",
		template: "{date}{cursor}",
		wrap: "none",
		tile: { kind: "icon", icon: "lucide-calendar" },
		special: "date",
	},
	{
		id: "footnote",
		name: "Footnote",
		aliases: ["reference", "citation"],
		group: "insert",
		template: "",
		wrap: "none",
		tile: { kind: "icon", icon: "lucide-superscript" },
		special: "footnote",
	},
];

/** Fenced-code languages offered by the second stage of the code block picker. */
export const LANGUAGES: readonly string[] = [
	"javascript",
	"typescript",
	"python",
	"java",
	"c",
	"cpp",
	"csharp",
	"go",
	"rust",
	"swift",
	"kotlin",
	"ruby",
	"php",
	"bash",
	"shell",
	"powershell",
	"sql",
	"html",
	"css",
	"scss",
	"json",
	"yaml",
	"toml",
	"xml",
	"markdown",
	"latex",
	"r",
	"matlab",
	"lua",
	"perl",
	"haskell",
	"elixir",
	"clojure",
	"scala",
	"dart",
	"zig",
	"nim",
	"dockerfile",
	"ini",
	"diff",
	"plaintext",
];
