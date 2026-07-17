/**
 * The 13 callout types Obsidian ships with, plus everything needed to draw
 * them: the CSS variable that carries the theme's RGB triple, a fallback
 * triple (Obsidian's defaults) for themes that don't define it, the Lucide
 * icon Obsidian itself uses, and the official type aliases.
 *
 * Note the variable names do NOT match the type names one-to-one:
 * note→default, abstract→summary, tip→important, failure→fail, danger→error.
 */

export interface CalloutSpec {
	type: string;
	cssVar: string;
	fallbackRgb: string; // "r, g, b"
	icon: string;
	aliases: string[];
}

export const CALLOUTS: readonly CalloutSpec[] = [
	{ type: "note", cssVar: "--callout-default", fallbackRgb: "68, 138, 255", icon: "lucide-pencil", aliases: [] },
	{ type: "abstract", cssVar: "--callout-summary", fallbackRgb: "0, 191, 188", icon: "lucide-clipboard-list", aliases: ["summary", "tldr"] },
	{ type: "info", cssVar: "--callout-info", fallbackRgb: "0, 184, 212", icon: "lucide-info", aliases: [] },
	{ type: "todo", cssVar: "--callout-todo", fallbackRgb: "0, 184, 212", icon: "lucide-check-circle-2", aliases: [] },
	{ type: "tip", cssVar: "--callout-important", fallbackRgb: "0, 191, 188", icon: "lucide-flame", aliases: ["hint", "important"] },
	{ type: "success", cssVar: "--callout-success", fallbackRgb: "68, 207, 110", icon: "lucide-check", aliases: ["check", "done"] },
	{ type: "question", cssVar: "--callout-question", fallbackRgb: "236, 117, 0", icon: "lucide-help-circle", aliases: ["help", "faq"] },
	{ type: "warning", cssVar: "--callout-warning", fallbackRgb: "236, 117, 0", icon: "lucide-alert-triangle", aliases: ["caution", "attention"] },
	{ type: "failure", cssVar: "--callout-fail", fallbackRgb: "233, 49, 71", icon: "lucide-x", aliases: ["fail", "missing"] },
	{ type: "danger", cssVar: "--callout-error", fallbackRgb: "233, 49, 71", icon: "lucide-zap", aliases: ["error"] },
	{ type: "bug", cssVar: "--callout-bug", fallbackRgb: "233, 49, 71", icon: "lucide-bug", aliases: [] },
	{ type: "example", cssVar: "--callout-example", fallbackRgb: "120, 82, 238", icon: "lucide-list", aliases: [] },
	{ type: "quote", cssVar: "--callout-quote", fallbackRgb: "158, 158, 158", icon: "lucide-quote", aliases: ["cite"] },
];
