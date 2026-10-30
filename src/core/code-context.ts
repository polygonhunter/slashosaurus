/**
 * Whether a position sits where Markdown isn't written: inside the
 * frontmatter, a fenced code block, a $$ math block or an inline code span.
 * The slash menu stays shut there — "cd /" + Enter in a shell block must
 * insert a newline, not a heading.
 *
 * Scans from the top of the note, so only call it once the trigger has
 * already matched.
 */

/** The part of an editor this needs — Obsidian's Editor fits as is. */
export interface LineSource {
	getLine(line: number): string;
	lineCount(): number;
}

/** Quote markers and indentation: fences in callouts and list items count. */
const CONTAINER = /^(?:\s*>)*\s*/;
const FENCE = /^(`{3,}|~{3,})(.*)$/;
const FRONTMATTER_END = /^(?:---|\.\.\.)\s*$/;

export function isInsideCode(doc: LineSource, line: number, ch: number): boolean {
	let start = 0;
	if (doc.getLine(0).trimEnd() === "---") {
		// Frontmatter only counts once it is closed; an unclosed "---" is a
		// plain divider.
		const lineCount = doc.lineCount();
		for (let i = 1; i < lineCount; i++) {
			if (FRONTMATTER_END.test(doc.getLine(i))) {
				if (line <= i) return true;
				start = i + 1;
				break;
			}
		}
	}

	let fence: { char: string; length: number } | null = null;
	let math = false;
	for (let i = start; i < line; i++) {
		const content = doc.getLine(i).replace(CONTAINER, "");
		if (fence !== null) {
			const close = FENCE.exec(content);
			const run = close?.[1] ?? "";
			if (
				run.startsWith(fence.char) &&
				run.length >= fence.length &&
				(close?.[2] ?? "").trim() === ""
			) {
				fence = null;
			}
			continue;
		}
		if (math) {
			if (content.includes("$$")) math = false;
			continue;
		}
		const open = FENCE.exec(content);
		if (open) {
			const run = open[1] ?? "";
			// A backtick fence's info string can't hold backticks — "```a```"
			// is inline code, not a fence.
			if (!(run.startsWith("`") && (open[2] ?? "").includes("`"))) {
				fence = { char: run.charAt(0), length: run.length };
			}
			continue;
		}
		// "$$" opens a block unless the line closes it again ("$$x$$").
		if (content.startsWith("$$") && (content.match(/\$\$/g)?.length ?? 0) % 2 === 1) {
			math = true;
		}
	}
	if (fence !== null || math) return true;
	return insideInlineCode(doc.getLine(line).slice(0, ch));
}

/** An inline code span opened left of the cursor and not closed yet. */
function insideInlineCode(text: string): boolean {
	let open = 0;
	for (const run of text.match(/`+/g) ?? []) {
		if (open === 0) open = run.length;
		else if (run.length === open) open = 0;
	}
	return open !== 0;
}
