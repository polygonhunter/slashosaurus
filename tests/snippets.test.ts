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

	it("keeps templates without {cursor} usable (cursor falls to the end)", () => {
		const defs = snippetsToBlockDefs([{ name: "Sig", template: "— written by me" }]);
		expect(defs[0]?.template).toBe("— written by me");
	});
});
