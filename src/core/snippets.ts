import type { BlockDef, UserSnippet } from "./types";

/** Returns a human-readable problem, or null if the snippet is usable. */
export function validateSnippet(snippet: UserSnippet): string | null {
	if (snippet.name.trim().length === 0) return "Snippet needs a name.";
	if (snippet.template.length === 0) return "Snippet needs a template.";
	return null;
}

export function snippetId(name: string): string {
	return `snippet:${name.trim()}`;
}

/** Templates that open a block of their own: heading, quote or callout,
 *  fence, table, list item or math block. */
const BLOCK_START = /^(?:#{1,6} |>|```|~~~|\||[-*+] |\d+[.)] |\$\$)/;

export function snippetsToBlockDefs(snippets: readonly UserSnippet[]): BlockDef[] {
	const seen = new Map<string, number>();
	return snippets
		.filter((s) => validateSnippet(s) === null)
		.map((s) => {
			// Name-based, not index-based: stays stable when snippets are
			// reordered, so "recently used" keeps pointing at the same one.
			// A repeated name gets a counter, or "recent" could only ever
			// reach the first snippet of that name.
			const base = snippetId(s.name);
			const count = (seen.get(base) ?? 0) + 1;
			seen.set(base, count);
			const def: BlockDef = {
				id: count === 1 ? base : `${base} (${count})`,
				name: s.name,
				aliases: ["snippet"],
				group: "snippet",
				// A template without {cursor} still works: the cursor lands at the end.
				template: s.template,
				wrap: "inline",
				tile: { kind: "icon", icon: "lucide-scissors" },
			};
			// A block-shaped snippet needs its own line like the built-in
			// blocks — "Text /my-callout" must not glue "> [!info]" onto "Text".
			if (s.template.includes("\n") || BLOCK_START.test(s.template)) def.block = true;
			return def;
		});
}
