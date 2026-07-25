import { describe, expect, it } from "vitest";
import { CALLOUTS } from "../src/core/callouts";
import { CATALOG, LANGUAGES } from "../src/core/catalog";
import { GROUP_ORDER } from "../src/core/types";

describe("CATALOG", () => {
	it("has unique ids", () => {
		const ids = CATALOG.map((def) => def.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("contains all 13 official callout types, each foldable", () => {
		const callouts = CATALOG.filter((def) => def.group === "callout");
		expect(callouts).toHaveLength(13);
		expect(callouts.map((c) => c.id).sort()).toEqual(
			CALLOUTS.map((c) => `callout-${c.type}`).sort(),
		);
		for (const c of callouts) {
			expect(c.foldable).toBe(true);
			expect(c.template).toContain("{fold}");
		}
	});

	it("every template carries {cursor}, except the footnote special", () => {
		for (const def of CATALOG) {
			if (def.special === "footnote") continue;
			expect(def.template, def.id).toContain("{cursor}");
		}
	});

	it("prefixLines defs declare their line prefix, and {cursor} sits behind it", () => {
		for (const def of CATALOG) {
			if (def.wrap !== "prefixLines") continue;
			expect(def.linePrefix, def.id).toBeTruthy();
			const cursorLine = def.template.split("\n").find((l) => l.includes("{cursor}"));
			expect(cursorLine, def.id).toBe(`${def.linePrefix}{cursor}`);
		}
	});

	it("command entries carry a command id and a plugin guard", () => {
		const commands = CATALOG.filter((def) => def.special === "command");
		expect(commands.map((c) => c.id).sort()).toEqual(["bible-verse", "bible-verse-reroll"]);
		for (const def of commands) {
			expect(def.commandId, def.id).toMatch(/^daily-bible-verse:/);
			expect(def.requiresPlugin, def.id).toBe("daily-bible-verse");
			// Commands insert nothing themselves — the template only clears "/query".
			expect(def.template, def.id).toBe("{cursor}");
			expect(def.wrap, def.id).toBe("none");
		}
	});

	it("keeps the bible group at the very bottom of the group order", () => {
		expect(GROUP_ORDER[GROUP_ORDER.length - 1]).toBe("bible");
	});

	it("only uses known groups, in catalog order", () => {
		const seen: string[] = [];
		for (const def of CATALOG) {
			expect(GROUP_ORDER).toContain(def.group);
			if (!seen.includes(def.group)) seen.push(def.group);
		}
		// Groups appear as contiguous runs in GROUP_ORDER sequence.
		expect(seen).toEqual(GROUP_ORDER.filter((g) => seen.includes(g)));
	});

	it("offers a reasonable language list without duplicates", () => {
		expect(LANGUAGES.length).toBeGreaterThanOrEqual(30);
		expect(new Set(LANGUAGES).size).toBe(LANGUAGES.length);
	});
});
