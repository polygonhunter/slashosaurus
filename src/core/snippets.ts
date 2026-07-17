import type { BlockDef, UserSnippet } from "./types";

/** Returns a human-readable problem, or null if the snippet is usable. */
export function validateSnippet(snippet: UserSnippet): string | null {
	if (snippet.name.trim().length === 0) return "Snippet needs a name.";
	if (snippet.template.length === 0) return "Snippet needs a template.";
	return null;
}

export function snippetsToBlockDefs(snippets: readonly UserSnippet[]): BlockDef[] {
	return snippets
		.filter((s) => validateSnippet(s) === null)
		.map((s, index) => ({
			id: `snippet-${index}`,
			name: s.name,
			aliases: ["snippet"],
			group: "snippet" as const,
			// A template without {cursor} still works: the cursor lands at the end.
			template: s.template,
			wrap: "inline" as const,
			tile: { kind: "icon" as const, icon: "lucide-scissors" },
		}));
}
