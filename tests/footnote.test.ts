import { describe, expect, it } from "vitest";
import { planFootnote } from "../src/core/footnote";

describe("planFootnote", () => {
	it("starts at 1 in an empty document", () => {
		expect(planFootnote("")).toEqual({ marker: "[^1]", appendText: "[^1]: " });
	});

	it("continues after the highest existing number", () => {
		const doc = "text[^1] more[^3]\n\n[^1]: a\n[^3]: b\n";
		expect(planFootnote(doc).marker).toBe("[^4]");
	});

	it("ignores named footnotes for numbering", () => {
		const doc = "text[^why]\n\n[^why]: because\n";
		expect(planFootnote(doc).marker).toBe("[^1]");
	});

	it("adds a newline when the document does not end with one", () => {
		expect(planFootnote("text").appendText).toBe("\n[^1]: ");
		expect(planFootnote("text\n").appendText).toBe("[^1]: ");
	});
});
