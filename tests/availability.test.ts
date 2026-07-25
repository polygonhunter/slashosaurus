import { describe, expect, it } from "vitest";
import { filterAvailable } from "../src/core/availability";
import { CATALOG } from "../src/core/catalog";
import { rankBlocks, type FuzzyFactory } from "../src/core/rank";
import type { BlockDef } from "../src/core/types";

const testFuzzy: FuzzyFactory = (query) => (text) =>
	text.toLowerCase().includes(query.toLowerCase()) ? { score: 0 } : null;

const BIBLE_IDS = ["bible-verse", "bible-verse-reroll"];

describe("filterAvailable", () => {
	it("hides the bible group entirely when the plugin is disabled", () => {
		const defs = filterAvailable(CATALOG, { isPluginEnabled: () => false });
		expect(defs.some((d) => d.group === "bible")).toBe(false);
		expect(defs.some((d) => d.requiresPlugin !== undefined)).toBe(false);
		// Every unguarded def survives.
		expect(defs).toHaveLength(CATALOG.length - BIBLE_IDS.length);
	});

	it("shows both bible entries when the plugin is enabled", () => {
		const defs = filterAvailable(CATALOG, {
			isPluginEnabled: (id) => id === "daily-bible-verse",
		});
		expect(defs).toHaveLength(CATALOG.length);
		expect(defs.filter((d) => d.group === "bible").map((d) => d.id)).toEqual(BIBLE_IDS);
	});

	it("queries the capability with the declared plugin id only", () => {
		const asked: string[] = [];
		filterAvailable(CATALOG, {
			isPluginEnabled: (id) => {
				asked.push(id);
				return true;
			},
		});
		expect(new Set(asked)).toEqual(new Set(["daily-bible-verse"]));
	});

	it("ranks the bible group below user snippets — the very bottom of the menu", () => {
		const snippet: BlockDef = {
			id: "snippet-0",
			name: "My snippet",
			aliases: [],
			group: "snippet",
			template: "x{cursor}",
			wrap: "none",
			tile: { kind: "mono", sample: "{ }" },
		};
		const defs = filterAvailable([...CATALOG, snippet], { isPluginEnabled: () => true });
		const ranked = rankBlocks(defs, "", testFuzzy);
		expect(ranked.slice(-2).map((d) => d.id)).toEqual(BIBLE_IDS);
	});
});
