import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/core/catalog";
import { rankBlocks, type FuzzyFactory } from "../src/core/rank";
import { GROUP_ORDER } from "../src/core/types";

/**
 * Test scorer that mimics prepareFuzzySearch's shape: subsequence match,
 * higher score = better (earlier + denser matches win).
 */
const testFuzzy: FuzzyFactory = (query) => (text) => {
	const q = query.toLowerCase();
	const t = text.toLowerCase();
	let ti = 0;
	let firstHit = -1;
	for (const char of q) {
		ti = t.indexOf(char, ti);
		if (ti === -1) return null;
		if (firstHit === -1) firstHit = ti;
		ti++;
	}
	const span = ti - firstHit;
	return { score: -(firstHit * 10 + (span - q.length)) };
};

describe("rankBlocks", () => {
	it("returns the full catalog grouped when the query is empty", () => {
		const ranked = rankBlocks(CATALOG, "", testFuzzy);
		expect(ranked).toHaveLength(CATALOG.length);
		const groups = ranked.map((d) => GROUP_ORDER.indexOf(d.group));
		expect(groups).toEqual([...groups].sort((a, b) => a - b));
		// Catalog order preserved within a group.
		expect(ranked.filter((d) => d.group === "text").map((d) => d.id)).toEqual(
			CATALOG.filter((d) => d.group === "text").map((d) => d.id),
		);
	});

	it('ranks the warning callout first for "wa"', () => {
		expect(rankBlocks(CATALOG, "wa", testFuzzy)[0]?.id).toBe("callout-warning");
	});

	it('finds heading 2 for "h2"', () => {
		expect(rankBlocks(CATALOG, "h2", testFuzzy)[0]?.id).toBe("h2");
	});

	it("matches via alias", () => {
		const ranked = rankBlocks(CATALOG, "tldr", testFuzzy);
		expect(ranked[0]?.id).toBe("callout-abstract");
	});

	it("drops non-matching blocks entirely", () => {
		const ranked = rankBlocks(CATALOG, "zzzz", testFuzzy);
		expect(ranked).toHaveLength(0);
	});
});
