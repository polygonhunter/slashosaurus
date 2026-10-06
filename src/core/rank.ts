import type { BlockDef } from "./types";
import { GROUP_ORDER } from "./types";

/**
 * Query-driven ranking. The fuzzy scorer is injected so core stays free of
 * obsidian imports — production wires in prepareFuzzySearch, tests a trivial
 * substring scorer.
 */

export type FuzzyScorer = (text: string) => { score: number } | null;
export type FuzzyFactory = (query: string) => FuzzyScorer;

/**
 * @param recentIds last-used block ids, newest first. With an empty query
 *   they lead the list as copies in the "recent" group (the originals stay
 *   in their own groups); while typing they only break score ties.
 */
export function rankBlocks(
	defs: readonly BlockDef[],
	query: string,
	fuzzy: FuzzyFactory,
	recentIds: readonly string[] = [],
): BlockDef[] {
	if (query.length === 0) {
		// Stable sort: catalog order within each group, groups in GROUP_ORDER.
		const sorted = [...defs].sort(
			(a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group),
		);
		const recent: BlockDef[] = [];
		for (const id of recentIds) {
			const def = defs.find((d) => d.id === id);
			if (def) recent.push({ ...def, group: "recent" });
		}
		return [...recent, ...sorted];
	}
	const scorer = fuzzy(query);
	const scored: Array<{ def: BlockDef; score: number }> = [];
	for (const def of defs) {
		let best: number | null = null;
		for (const term of [def.name, ...def.aliases]) {
			const result = scorer(term);
			if (result && (best === null || result.score > best)) best = result.score;
		}
		if (best !== null) scored.push({ def, score: best });
	}
	// Position among the recent ids; blocks not used lately sort after them.
	const recency = (id: string): number => {
		const i = recentIds.indexOf(id);
		return i === -1 ? recentIds.length : i;
	};
	scored.sort((a, b) => b.score - a.score || recency(a.def.id) - recency(b.def.id));
	return scored.map((s) => s.def);
}

/**
 * Rank plain strings by fuzzy score, best first; non-matches are dropped.
 * The scorer is prepared once per call, not once per item. An empty query
 * keeps the original order.
 */
export function rankStrings(
	items: readonly string[],
	query: string,
	fuzzy: FuzzyFactory,
): string[] {
	if (query.length === 0) return [...items];
	const scorer = fuzzy(query);
	const scored: Array<{ item: string; score: number }> = [];
	for (const item of items) {
		const result = scorer(item);
		if (result) scored.push({ item, score: result.score });
	}
	scored.sort((a, b) => b.score - a.score);
	return scored.map((s) => s.item);
}

/** One row of the code block's language stage. */
export interface LanguageOption {
	/** What goes behind the opening fence; "" = no language. */
	value: string;
	/** "none": the explicit no-language row; "custom": the typed query
	 *  itself, offered when it isn't in the list; "known": a list entry. */
	kind: "none" | "custom" | "known";
}

/**
 * Options for the language stage. There is always a way out: an empty query
 * leads with "No language", and a query that isn't an exact list entry is
 * offered verbatim — so any fence language never dead-ends in an empty list.
 * The verbatim row comes AFTER the fuzzy matches: typing "pyth" + Enter must
 * still pick "python", not insert "```pyth".
 */
export function languageOptions(
	languages: readonly string[],
	query: string,
	fuzzy: FuzzyFactory,
): LanguageOption[] {
	if (query.length === 0) {
		return [
			{ value: "", kind: "none" },
			...languages.map((value) => ({ value, kind: "known" as const })),
		];
	}
	const known = rankStrings(languages, query, fuzzy).map((value) => ({
		value,
		kind: "known" as const,
	}));
	const lower = query.toLowerCase();
	if (languages.some((lang) => lang.toLowerCase() === lower)) return known;
	return [...known, { value: query, kind: "custom" }];
}
