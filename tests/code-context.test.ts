import { describe, expect, it } from "vitest";
import { isInsideCode } from "../src/core/code-context";

/** The cursor sits at "|". */
const at = (text: string): boolean => {
	const lines = text.split("\n");
	const line = lines.findIndex((l) => l.includes("|"));
	const ch = (lines[line] ?? "").indexOf("|");
	lines[line] = (lines[line] ?? "").replace("|", "");
	return isInsideCode({ getLine: (n) => lines[n] ?? "", lineCount: () => lines.length }, line, ch);
};

describe("isInsideCode", () => {
	it("is false in plain text, lists and callouts", () => {
		expect(at("Hello /|")).toBe(false);
		expect(at("- item\n> [!note]\n> /|")).toBe(false);
	});

	it("is true inside a fenced code block, false after it", () => {
		expect(at("```bash\ncd /|")).toBe(true);
		expect(at("~~~\nls\ncd /|")).toBe(true);
		expect(at("```bash\ncd /\n```\n/|")).toBe(false);
	});

	it("only closes a fence with the same character and at least its length", () => {
		expect(at("````\n```\n/|")).toBe(true);
		expect(at("```\n~~~\n/|")).toBe(true);
		expect(at("```\n```` \n/|")).toBe(false);
		expect(at("```\n``` js\n/|")).toBe(true);
	});

	it("sees fences inside callouts and list items", () => {
		expect(at("> ```js\n> let a = 1 /|")).toBe(true);
		expect(at("- item\n  ```\n  /|")).toBe(true);
	});

	it("doesn't take inline code with backticks for a fence", () => {
		expect(at("```a``` text\n/|")).toBe(false);
	});

	it("is true inside a $$ math block, false after a one-line one", () => {
		expect(at("$$\nx /|")).toBe(true);
		expect(at("$$\nx\n$$\n/|")).toBe(false);
		expect(at("$$x$$\n/|")).toBe(false);
	});

	it("is true in closed frontmatter only", () => {
		expect(at("---\npath: /|\n---\nbody")).toBe(true);
		expect(at("---\ntags: x\n---\n/|")).toBe(false);
		// An unclosed "---" on the first line is a divider.
		expect(at("---\n/|")).toBe(false);
	});

	it("is true inside an open inline code span", () => {
		expect(at("run `cd /|")).toBe(true);
		expect(at("run `cd` /|")).toBe(false);
		expect(at("a ``x ` y`` /|")).toBe(false);
	});
});
