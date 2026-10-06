/**
 * The 13 callout types Obsidian ships with: the Lucide icon Obsidian itself
 * uses and the official type aliases. The colors live in styles.css (theme
 * variable plus Obsidian's default as fallback); note the variable names do
 * NOT match the type names one-to-one: note→default, abstract→summary,
 * tip→important, failure→fail, danger→error.
 */

export interface CalloutSpec {
	type: string;
	icon: string;
	aliases: string[];
}

export const CALLOUTS: readonly CalloutSpec[] = [
	{ type: "note", icon: "lucide-pencil", aliases: [] },
	{ type: "abstract", icon: "lucide-clipboard-list", aliases: ["summary", "tldr"] },
	{ type: "info", icon: "lucide-info", aliases: [] },
	{ type: "todo", icon: "lucide-check-circle-2", aliases: [] },
	{ type: "tip", icon: "lucide-flame", aliases: ["hint", "important"] },
	{ type: "success", icon: "lucide-check", aliases: ["check", "done"] },
	{ type: "question", icon: "lucide-help-circle", aliases: ["help", "faq"] },
	{ type: "warning", icon: "lucide-alert-triangle", aliases: ["caution", "attention"] },
	{ type: "failure", icon: "lucide-x", aliases: ["fail", "missing"] },
	{ type: "danger", icon: "lucide-zap", aliases: ["error"] },
	{ type: "bug", icon: "lucide-bug", aliases: [] },
	{ type: "example", icon: "lucide-list", aliases: [] },
	{ type: "quote", icon: "lucide-quote", aliases: ["cite"] },
];
