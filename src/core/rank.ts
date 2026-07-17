import type { BlockDef } from "./types";
import { GROUP_ORDER } from "./types";

/**
 * Query-driven ranking. The fuzzy scorer is injected so core stays free of
 * obsidian imports — production wires in prepareFuzzySearch, tests a trivial
 * substring scorer.
 */

export type FuzzyScorer = (text: string) => { score: number } | null;
export type FuzzyFactory = (query: string) => FuzzyScorer;

export function rankBlocks(
	defs: readonly BlockDef[],
	query: string,
	fuzzy: FuzzyFactory,
): BlockDef[] {
	if (query.length === 0) {
		// Stable sort: catalog order within each group, groups in GROUP_ORDER.
		return [...defs].sort(
			(a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group),
		);
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
	scored.sort((a, b) => b.score - a.score);
	return scored.map((s) => s.def);
}
