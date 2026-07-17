import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/core/catalog";
import { buildInsertion } from "../src/core/insert";
import { embedSelection } from "../src/core/wrap";
import type { BlockDef, TemplateEnv } from "../src/core/types";

const env = (selection: string): TemplateEnv => ({
	selection,
	date: "2026-07-17",
	folded: false,
	language: null,
});

const byId = (id: string): BlockDef => {
	const def = CATALOG.find((d) => d.id === id);
	if (!def) throw new Error(`no such block: ${id}`);
	return def;
};

describe("embedSelection", () => {
	it("inline: selection lands inside, cursor right behind it", () => {
		expect(embedSelection("[[{cursor}]]", "My Note", "inline", "")).toBe(
			"[[My Note{cursor}]]",
		);
	});

	it("prefixLines: later lines get the prefix, first line reuses the template's", () => {
		expect(embedSelection("> {cursor}", "one\ntwo", "prefixLines", "> ")).toBe(
			"> one\n> two{cursor}",
		);
	});

	it("prefixLines: numbered prefixes count up", () => {
		expect(embedSelection("1. {cursor}", "a\nb\nc", "prefixLines", "1. ")).toBe(
			"1. a\n2. b\n3. c{cursor}",
		);
	});

	it("fenced: selection fills the block, cursor continues below", () => {
		expect(embedSelection("```\n{cursor}\n```", "x = 1", "fenced", "")).toBe(
			"```\nx = 1\n```\n{cursor}",
		);
	});

	it("none: selection is preserved above the block", () => {
		expect(embedSelection("---\n{cursor}", "keep me", "none", "")).toBe(
			"keep me\n---\n{cursor}",
		);
	});
});

describe("buildInsertion with a selection", () => {
	it("wraps a multi-line selection into a callout", () => {
		const plan = buildInsertion(byId("callout-tip"), env("first\nsecond"));
		expect(plan.text).toBe("> [!tip]\n> first\n> second");
		expect(plan.cursor).toEqual({ lineDelta: 2, ch: 8 });
	});

	it("wraps a selection into a fenced code block", () => {
		const plan = buildInsertion(byId("codeblock"), env("let x = 1;"));
		expect(plan.text).toBe("```\nlet x = 1;\n```\n");
		expect(plan.cursor).toEqual({ lineDelta: 3, ch: 0 });
	});

	it("keeps the selection when the block accepts none", () => {
		const plan = buildInsertion(byId("divider"), env("do not lose this"));
		expect(plan.text).toBe("do not lose this\n---\n");
	});

	it("turns each selected line into a heading", () => {
		const plan = buildInsertion(byId("h2"), env("alpha\nbeta"));
		expect(plan.text).toBe("## alpha\n## beta");
	});
});
