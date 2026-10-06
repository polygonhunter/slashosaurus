import { describe, expect, it } from "vitest";
import {
	DEFAULT_SETTINGS,
	defaultSettings,
	isSingleChar,
	normalizeSettings,
	pushRecent,
	RECENT_LIMIT,
} from "../src/core/settings-normalize";

describe("normalizeSettings", () => {
	it("returns the defaults for missing or non-object data", () => {
		for (const raw of [null, undefined, 42, "x", []]) {
			expect(normalizeSettings(raw)).toEqual(defaultSettings());
		}
	});

	it("keeps valid values", () => {
		const raw = {
			triggerChar: ";",
			dateFormat: "DD.MM.YYYY",
			snippets: [{ name: "Sig", template: "— {cursor}" }],
			recent: ["h1", "snippet:Sig"],
		};
		expect(normalizeSettings(raw)).toEqual(raw);
	});

	it("rejects a trigger that is empty or longer than one character", () => {
		expect(normalizeSettings({ triggerChar: "" }).triggerChar).toBe("/");
		expect(normalizeSettings({ triggerChar: "  " }).triggerChar).toBe("/");
		expect(normalizeSettings({ triggerChar: "//" }).triggerChar).toBe("/");
		expect(normalizeSettings({ triggerChar: 7 }).triggerChar).toBe("/");
	});

	it("accepts a single emoji (one code point, two UTF-16 units) and trims", () => {
		expect(normalizeSettings({ triggerChar: "🦖" }).triggerChar).toBe("🦖");
		expect(normalizeSettings({ triggerChar: " ; " }).triggerChar).toBe(";");
	});

	it("falls back for an empty or non-string date format", () => {
		expect(normalizeSettings({ dateFormat: "" }).dateFormat).toBe("YYYY-MM-DD");
		expect(normalizeSettings({ dateFormat: "   " }).dateFormat).toBe("YYYY-MM-DD");
		expect(normalizeSettings({ dateFormat: null }).dateFormat).toBe("YYYY-MM-DD");
	});

	it("drops malformed snippets and copies the valid ones", () => {
		const good = { name: "A", template: "a", extra: true };
		const result = normalizeSettings({
			snippets: [good, null, "x", { name: 1, template: "t" }, { name: "B" }],
		});
		expect(result.snippets).toEqual([{ name: "A", template: "a" }]);
		expect(result.snippets[0]).not.toBe(good);
	});

	it("ignores a non-array snippets field", () => {
		expect(normalizeSettings({ snippets: { name: "A" } }).snippets).toEqual([]);
	});

	it("never shares the snippets array with the defaults", () => {
		const a = normalizeSettings({});
		a.snippets.push({ name: "leak", template: "x" });
		expect(DEFAULT_SETTINGS.snippets).toHaveLength(0);
		expect(normalizeSettings({}).snippets).toHaveLength(0);
	});
});

describe("recent", () => {
	it("keeps unique non-empty string ids, capped at the limit", () => {
		const recent = normalizeSettings({
			recent: ["a", "a", "", 3, null, "b", "c", "d", "e", "f", "g"],
		}).recent;
		expect(recent).toEqual(["a", "b", "c", "d", "e"]);
		expect(recent).toHaveLength(RECENT_LIMIT);
	});

	it("ignores a non-array value", () => {
		expect(normalizeSettings({ recent: "h1" }).recent).toEqual([]);
	});

	it("pushRecent moves an id to the front without duplicates", () => {
		expect(pushRecent(["a", "b", "c"], "c")).toEqual(["c", "a", "b"]);
		expect(pushRecent(["a", "b", "c", "d", "e"], "x")).toEqual(["x", "a", "b", "c", "d"]);
		expect(pushRecent([], "a")).toEqual(["a"]);
	});
});

describe("isSingleChar", () => {
	it("counts code points, not UTF-16 units", () => {
		expect(isSingleChar("/")).toBe(true);
		expect(isSingleChar("🦖")).toBe(true);
		expect(isSingleChar("ab")).toBe(false);
		expect(isSingleChar("")).toBe(false);
	});
});
