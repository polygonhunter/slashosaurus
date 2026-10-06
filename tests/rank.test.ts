import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/core/catalog";
import { languageOptions, rankBlocks, rankStrings, type FuzzyFactory } from "../src/core/rank";
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

describe("rankStrings", () => {
	it("keeps the order for an empty query", () => {
		expect(rankStrings(["b", "a"], "", testFuzzy)).toEqual(["b", "a"]);
	});

	it("ranks better matches first and drops non-matches", () => {
		expect(
			rankStrings(["javascript", "rust", "typescript", "python"], "pt", testFuzzy),
		).toEqual(["python", "typescript", "javascript"]);
	});

	it("prepares the scorer only once per call", () => {
		let prepared = 0;
		const counting: FuzzyFactory = (query) => {
			prepared++;
			return testFuzzy(query);
		};
		rankStrings(["a", "b", "c", "d"], "a", counting);
		expect(prepared).toBe(1);
	});
});

describe("languageOptions", () => {
	const LANGS = ["javascript", "typescript", "python"];
	const values = (q: string) => languageOptions(LANGS, q, testFuzzy).map((o) => `${o.kind}:${o.value}`);

	it("leads with 'No language' for an empty query", () => {
		expect(values("")).toEqual([
			"none:",
			"known:javascript",
			"known:typescript",
			"known:python",
		]);
	});

	it("offers the typed query first when it isn't an exact entry", () => {
		expect(values("py")).toEqual(["custom:py", "known:python"]);
	});

	it("never dead-ends: an unknown language is still offered", () => {
		expect(values("dataviewjs")).toEqual(["custom:dataviewjs"]);
	});

	it("does not duplicate an exact match (case-insensitive)", () => {
		expect(values("Python")).toEqual(["known:python"]);
	});
});

describe("rankBlocks with recently used blocks", () => {
	it("leads the empty-query list with a Recent group, originals stay put", () => {
		const ranked = rankBlocks(CATALOG, "", testFuzzy, ["table", "h2"]);
		expect(ranked.slice(0, 2).map((d) => `${d.group}:${d.id}`)).toEqual([
			"recent:table",
			"recent:h2",
		]);
		expect(ranked).toHaveLength(CATALOG.length + 2);
		expect(ranked.filter((d) => d.id === "table" && d.group === "insert")).toHaveLength(1);
	});

	it("skips recent ids that are no longer available", () => {
		const ranked = rankBlocks(CATALOG, "", testFuzzy, ["snippet:gone", "h1"]);
		expect(ranked[0]?.id).toBe("h1");
		expect(ranked[1]?.group).not.toBe("recent");
	});

	it("does not mutate the catalog defs", () => {
		rankBlocks(CATALOG, "", testFuzzy, ["h1"]);
		expect(CATALOG.find((d) => d.id === "h1")?.group).toBe("text");
	});

	it("breaks score ties in favor of recent blocks while typing", () => {
		// testFuzzy gives h1/h2/h3 the same score for "h".
		const plain = rankBlocks(CATALOG, "h", testFuzzy);
		const withRecent = rankBlocks(CATALOG, "h", testFuzzy, ["h3"]);
		expect(plain.indexOf(plain.find((d) => d.id === "h3")!)).toBeGreaterThan(0);
		expect(withRecent[0]?.id).toBe("h3");
		// No group change and no duplicates while typing.
		expect(withRecent).toHaveLength(plain.length);
	});
});
