import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/core/catalog";
import { buildInsertion, resolveCursor } from "../src/core/insert";
import type { BlockDef, TemplateEnv } from "../src/core/types";

const env = (overrides: Partial<TemplateEnv> = {}): TemplateEnv => ({
	selection: null,
	date: "2026-07-17",
	folded: false,
	language: null,
	...overrides,
});

const byId = (id: string): BlockDef => {
	const def = CATALOG.find((d) => d.id === id);
	if (!def) throw new Error(`no such block: ${id}`);
	return def;
};

describe("resolveCursor", () => {
	it("places the cursor on a single line", () => {
		expect(resolveCursor("# {cursor}")).toEqual({
			text: "# ",
			cursor: { lineDelta: 0, ch: 2 },
		});
	});

	it("places the cursor across multiple lines", () => {
		expect(resolveCursor("> [!note]\n> {cursor}")).toEqual({
			text: "> [!note]\n> ",
			cursor: { lineDelta: 1, ch: 2 },
		});
	});

	it("defaults to the end when the sentinel is missing", () => {
		expect(resolveCursor("abc\nde")).toEqual({
			text: "abc\nde",
			cursor: { lineDelta: 1, ch: 2 },
		});
	});
});

describe("buildInsertion", () => {
	it("resolves a callout, unfolded by default", () => {
		const plan = buildInsertion(byId("callout-warning"), env());
		expect(plan.text).toBe("> [!warning]\n> ");
		expect(plan.cursor).toEqual({ lineDelta: 1, ch: 2 });
	});

	it("resolves the folded callout variant", () => {
		const plan = buildInsertion(byId("callout-warning"), env({ folded: true }));
		expect(plan.text).toBe("> [!warning]-\n> ");
	});

	it("resolves the code block with and without a language", () => {
		expect(buildInsertion(byId("codeblock"), env({ language: "ts" })).text).toBe(
			"```ts\n\n```",
		);
		const bare = buildInsertion(byId("codeblock"), env());
		expect(bare.text).toBe("```\n\n```");
		expect(bare.cursor).toEqual({ lineDelta: 1, ch: 0 });
	});

	it("resolves {date}", () => {
		const plan = buildInsertion(byId("date"), env());
		expect(plan.text).toBe("2026-07-17");
		expect(plan.cursor).toEqual({ lineDelta: 0, ch: 10 });
	});

	it("puts the table cursor into the first header cell", () => {
		const plan = buildInsertion(byId("table"), env());
		expect(plan.text.split("\n")).toHaveLength(4);
		expect(plan.cursor).toEqual({ lineDelta: 0, ch: 2 });
	});
});
