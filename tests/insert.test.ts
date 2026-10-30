import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/core/catalog";
import { buildInsertion, fitToLine, resolveCursor } from "../src/core/insert";
import type { BlockDef, TemplateEnv } from "../src/core/types";

const env = (overrides: Partial<TemplateEnv> = {}): TemplateEnv => ({
	selection: null,
	date: "2026-07-17",
	time: "09:30",
	title: "My Note",
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

describe("placeholders", () => {
	const custom = (template: string): BlockDef => ({
		id: "custom",
		name: "Custom",
		aliases: [],
		group: "snippet",
		template,
		wrap: "inline",
		tile: { kind: "icon", icon: "x" },
	});

	it("replaces every {date}, not just the first", () => {
		expect(buildInsertion(custom("{date} – {date}"), env()).text).toBe(
			"2026-07-17 – 2026-07-17",
		);
	});

	it("keeps $ patterns in the date literally", () => {
		expect(buildInsertion(custom("{date}"), env({ date: "$& $$" })).text).toBe("$& $$");
	});

	it("uses the first {cursor} and removes the rest", () => {
		const plan = buildInsertion(custom("a{cursor}b{cursor}c"), env());
		expect(plan.text).toBe("abc");
		expect(plan.cursor).toEqual({ lineDelta: 0, ch: 1 });
	});
});

describe("fitToLine", () => {
	const fit = (id: string, before: string, after: string, overrides: Partial<TemplateEnv> = {}) =>
		fitToLine(buildInsertion(byId(id), env(overrides)), byId(id), before, after);

	it("leaves a block at the start of an empty line alone", () => {
		expect(fit("codeblock", "", "")).toEqual(buildInsertion(byId("codeblock"), env()));
	});

	it("moves trailing text below a code block typed at the line start (/code before Hallo)", () => {
		const plan = fit("codeblock", "", "Hallo");
		expect(plan.text).toBe("```\n\n```\n");
		expect(plan.cursor).toEqual({ lineDelta: 1, ch: 0 });
	});

	it("starts a heading on its own line after text (Text /h1)", () => {
		const plan = fit("h1", "Text ", "");
		expect(plan.text).toBe("\n# ");
		expect(plan.cursor).toEqual({ lineDelta: 1, ch: 2 });
	});

	it("does both for a multi-line block in the middle of a line", () => {
		const plan = fit("callout-note", "before ", " after");
		expect(plan.text).toBe("\n> [!note]\n> \n");
		expect(plan.cursor).toEqual({ lineDelta: 2, ch: 2 });
	});

	it("keeps a single-line block glued to trailing text", () => {
		expect(fit("h2", "", "rest").text).toBe("## ");
	});

	it("never touches inline blocks or the date", () => {
		expect(fit("internal-link", "see ", " here").text).toBe("[[]]");
		expect(fit("date", "Due: ", "").text).toBe("2026-07-17");
	});

	it("treats quote markers and indentation as an empty line", () => {
		// The nested callout's body is nested too, not one level shallower.
		expect(fit("callout-tip", "> ", "").text).toBe("> [!tip]\n> > ");
		expect(fit("h1", "   ", "").text).toBe("# ");
	});

	it("gives the math block its own line (Text /math, /math before Hallo)", () => {
		const after = fit("math", "Text ", "");
		expect(after.text).toBe("\n$$\n\n$$");
		expect(after.cursor).toEqual({ lineDelta: 2, ch: 0 });
		expect(fit("math", "", "Hallo").text).toBe("$$\n\n$$\n");
	});

	it("treats an empty list or task marker as an empty line", () => {
		expect(fit("h2", "- ", "").text).toBe("## ");
		expect(fit("quote", "1. ", "").text).toBe("> ");
		// The callout body stays in the list item, under its text.
		expect(fit("callout-note", "- [ ] ", "").text).toBe("> [!note]\n  > ");
		expect(fit("h2", "> * ", "").text).toBe("## ");
		// A list item with text still pushes the block onto its own line.
		expect(fit("h2", "- item ", "").text).toBe("\n## ");
		expect(fit("h2", "-", "").text).toBe("\n## ");
	});

	it("separates divider and table from text by a blank line", () => {
		// "abc\n---" would be a setext heading.
		expect(fit("divider", "abc", "").text).toBe("\n\n---\n");
		const table = fit("table", "abc ", "");
		expect(table.text.startsWith("\n\n| ")).toBe(true);
		expect(table.cursor).toEqual({ lineDelta: 2, ch: 2 });
	});
});

describe("fitToLine keeps every line in its container", () => {
	const fit = (id: string, before: string, after = "", overrides: Partial<TemplateEnv> = {}) =>
		fitToLine(buildInsertion(byId(id), env(overrides)), byId(id), before, after);

	it("keeps a code block inside a quote or callout", () => {
		const plan = fit("codeblock", "> ", "", { language: "js" });
		expect(plan.text).toBe("```js\n> \n> ```");
		expect(plan.cursor).toEqual({ lineDelta: 1, ch: 2 });
	});

	it("keeps a code block inside a list item, indented under its text", () => {
		expect(fit("codeblock", "- ").text).toBe("```\n  \n  ```");
		expect(fit("codeblock", "\t1. ").text).toBe("```\n\t   \n\t   ```");
		expect(fit("codeblock", "> - ").text).toBe("```\n>   \n>   ```");
	});

	it("keeps a callout's body in the list item", () => {
		const plan = fit("callout-note", "- ");
		expect(plan.text).toBe("> [!note]\n  > ");
		expect(plan.cursor).toEqual({ lineDelta: 1, ch: 4 });
	});

	it("nests a callout's body as deep as its title", () => {
		const plan = fit("callout-warning", "> > ");
		expect(plan.text).toBe("> [!warning]\n> > > ");
		expect(plan.cursor).toEqual({ lineDelta: 1, ch: 6 });
	});

	it("keeps every table row and the math block in the quote", () => {
		const table = fit("table", "> ");
		expect(table.text.split("\n").slice(1).every((row) => row.startsWith("> |"))).toBe(true);
		expect(table.cursor).toEqual({ lineDelta: 0, ch: 2 });
		expect(fit("math", "> ").text).toBe("$$\n> \n> $$");
	});

	it("prefixes every line of a wrapped multi-line selection", () => {
		const plan = fit("h2", "> ", "", { selection: "a\nb" });
		expect(plan.text).toBe("## a\n> ## b");
		expect(plan.cursor).toEqual({ lineDelta: 1, ch: 6 });
	});

	it("moves trailing text below the block but keeps it in the quote", () => {
		expect(fit("codeblock", "> ", "rest").text).toBe("```\n> \n> ```\n> ");
	});

	it("keeps a block that starts a new line after text in the quote", () => {
		const plan = fit("codeblock", "> text ", "");
		expect(plan.text).toBe("\n> ```\n> \n> ```");
		expect(plan.cursor).toEqual({ lineDelta: 2, ch: 2 });
		expect(fit("table", "> text ").text.startsWith("\n> \n> | ")).toBe(true);
	});
});

describe("fitToLine on an empty list item", () => {
	const fit = (id: string, before: string) =>
		fitToLine(buildInsertion(byId(id), env()), byId(id), before, "");

	it("lets a list block take over the empty marker instead of nesting", () => {
		expect(fit("check-list", "- ")).toEqual({
			text: "- [ ] ",
			cursor: { lineDelta: 0, ch: 6 },
			consumeBefore: 2,
		});
		expect(fit("numbered-list", "- ").consumeBefore).toBe(2);
		expect(fit("bullet-list", "12. ").consumeBefore).toBe(4);
		expect(fit("check-list", "- [ ] ").consumeBefore).toBe(6);
	});

	it("keeps quote markers and indentation in front of the new marker", () => {
		expect(fit("bullet-list", "> \t- ").consumeBefore).toBe(2);
		expect(fit("check-list", "  * ").consumeBefore).toBe(2);
	});

	it("leaves non-list blocks in the item", () => {
		expect(fit("quote", "- ").consumeBefore).toBeUndefined();
		expect(fit("h2", "- ").consumeBefore).toBeUndefined();
	});
});

describe("snippet placeholders {time}, {title}, {selection}", () => {
	const snippet = (template: string): BlockDef => ({
		id: "snippet:x",
		name: "X",
		aliases: [],
		group: "snippet",
		template,
		wrap: "inline",
		tile: { kind: "icon", icon: "x" },
	});

	it("leaves double-brace {{title}}/{{date}}/{{selection}} untouched", () => {
		const plan = buildInsertion(
			snippet("{{title}} {title} {{date}} {{time}} {{selection}}{cursor}"),
			env({ selection: "sel" }),
		);
		// No single-brace {selection} → the selection is embedded inline.
		expect(plan.text).toBe("{{title}} My Note {{date}} {{time}} {{selection}}sel");
	});

	it("fills {time} and {title}", () => {
		expect(buildInsertion(snippet("## {title} – {date} {time}"), env()).text).toBe(
			"## My Note – 2026-07-17 09:30",
		);
	});

	it("puts the selection where {selection} says, cursor stays at {cursor}", () => {
		const plan = buildInsertion(
			snippet("**{selection}** {cursor}({selection})"),
			env({ selection: "hi" }),
		);
		expect(plan.text).toBe("**hi** (hi)");
		expect(plan.cursor).toEqual({ lineDelta: 0, ch: 7 });
	});

	it("drops {selection} when nothing is selected", () => {
		expect(buildInsertion(snippet("[{selection}]{cursor}"), env()).text).toBe("[]");
	});

	it("keeps placeholders inside the selected text literal", () => {
		expect(
			buildInsertion(snippet("> {selection}"), env({ selection: "{date} $&" })).text,
		).toBe("> {date} $&");
	});

	it("inserts the current time with the Current time block", () => {
		expect(buildInsertion(byId("time"), env()).text).toBe("09:30");
	});

	it("offers headings 4 to 6", () => {
		expect(buildInsertion(byId("h4"), env()).text).toBe("#### ");
		expect(buildInsertion(byId("h6"), env({ selection: "a\nb" })).text).toBe(
			"###### a\n###### b",
		);
	});
});
