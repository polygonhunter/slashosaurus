import { describe, expect, it } from "vitest";
import { snippetsToBlockDefs, validateSnippet } from "../src/core/snippets";

describe("validateSnippet", () => {
	it("accepts a snippet with name and template", () => {
		expect(validateSnippet({ name: "Meeting", template: "## {cursor}" })).toBeNull();
	});

	it("rejects missing name or template", () => {
		expect(validateSnippet({ name: "  ", template: "x" })).toBeTruthy();
		expect(validateSnippet({ name: "x", template: "" })).toBeTruthy();
	});
});

describe("snippetsToBlockDefs", () => {
	it("converts valid snippets and skips broken ones", () => {
		const defs = snippetsToBlockDefs([
			{ name: "Meeting", template: "## Meeting {cursor}" },
			{ name: "", template: "broken" },
		]);
		expect(defs).toHaveLength(1);
		expect(defs[0]).toMatchObject({
			name: "Meeting",
			group: "snippet",
			template: "## Meeting {cursor}",
		});
	});

	it("derives stable, name-based ids", () => {
		const defs = snippetsToBlockDefs([
			{ name: " Meeting ", template: "x" },
			{ name: "Sig", template: "y" },
		]);
		expect(defs.map((d) => d.id)).toEqual(["snippet:Meeting", "snippet:Sig"]);
	});

	it("keeps templates without {cursor} usable (cursor falls to the end)", () => {
		const defs = snippetsToBlockDefs([{ name: "Sig", template: "— written by me" }]);
		expect(defs[0]?.template).toBe("— written by me");
	});

	it("gives repeated names their own ids", () => {
		const defs = snippetsToBlockDefs([
			{ name: "Sig", template: "a" },
			{ name: "Sig ", template: "b" },
			{ name: "Sig", template: "c" },
		]);
		expect(defs.map((d) => d.id)).toEqual(["snippet:Sig", "snippet:Sig (2)", "snippet:Sig (3)"]);
	});

	it("marks block-shaped snippets as needing their own line", () => {
		const block = (template: string) =>
			snippetsToBlockDefs([{ name: "x", template }])[0]?.block === true;
		expect(block("> [!info] {title}\n> {cursor}")).toBe(true);
		expect(block("## {cursor}")).toBe(true);
		expect(block("```js\n{cursor}\n```")).toBe(true);
		expect(block("| a | b |")).toBe(true);
		expect(block("- [ ] {cursor}")).toBe(true);
		expect(block("line one\nline two")).toBe(true);
		expect(block("— written by me")).toBe(false);
		expect(block("**{selection}**")).toBe(false);
		expect(block("#tag {cursor}")).toBe(false);
	});
});

