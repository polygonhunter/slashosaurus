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

	it("counts footnotes in a pending selection that is not in the document", () => {
		const plan = planFootnote("/\n\n[^1]: a\n", "see[^1] and[^2]");
		expect(plan.marker).toBe("[^3]");
		// The newline check still looks at the document only.
		expect(planFootnote("/", "x[^1]").appendText).toBe("\n[^2]: ");
	});
});
