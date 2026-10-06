import { CURSOR, CURSOR_MARK, type BlockDef, type InsertPlan, type TemplateEnv } from "./types";
import { embedSelection } from "./wrap";

/** Replace every occurrence literally — no regex, no "$" patterns. */
function replaceAllLiteral(text: string, search: string, value: string): string {
	return text.split(search).join(value);
}

/** First {cursor} becomes the internal mark, any further ones vanish. */
function markCursor(template: string): string {
	const idx = template.indexOf(CURSOR);
	if (idx === -1) return template;
	const rest = replaceAllLiteral(template.slice(idx + CURSOR.length), CURSOR, "");
	return template.slice(0, idx) + CURSOR_MARK + rest;
}

/**
 * Resolve a template into the final text plus the cursor position relative to
 * the insertion start. Placeholders: {lang}, {fold}, {date}, {cursor}.
 */
export function buildInsertion(def: BlockDef, env: TemplateEnv): InsertPlan {
	let template = markCursor(def.template);
	template = replaceAllLiteral(template, "{lang}", env.language ?? "");
	template = replaceAllLiteral(template, "{fold}", env.folded ? "-" : "");
	template = replaceAllLiteral(template, "{date}", env.date);
	if (env.selection !== null && env.selection.length > 0) {
		template = embedSelection(
			template,
			env.selection,
			def.wrap,
			def.linePrefix ?? "",
			CURSOR_MARK,
		);
	}
	return resolveCursor(template, CURSOR_MARK);
}

/** Strip the cursor marker and compute where it was, multi-line safe. */
export function resolveCursor(template: string, marker: string = CURSOR): InsertPlan {
	const idx = template.indexOf(marker);
	const text = idx === -1 ? template : template.slice(0, idx) + template.slice(idx + marker.length);
	// No marker → cursor at the very end of the inserted text.
	const before = idx === -1 ? text : template.slice(0, idx);
	const lines = before.split("\n");
	return {
		text,
		cursor: {
			lineDelta: lines.length - 1,
			ch: lines[lines.length - 1]?.length ?? 0,
		},
	};
}

/** Blocks that only work at the start of their own line. Inline constructs
 *  and single-line "none" blocks (date, plugin commands) may sit mid-line. */
export function isBlockLevel(def: BlockDef): boolean {
	if (def.wrap === "prefixLines" || def.wrap === "fenced") return true;
	return def.wrap === "none" && def.template.includes("\n");
}

/** Only whitespace and quote markers — typing "> /note" stays in the quote. */
const CONTAINER_ONLY = /^(?:\s*>)*\s*$/;

/**
 * Make a block-level insertion fit the line it lands on: text left of the
 * trigger pushes the block onto its own line, and text right of the cursor
 * is moved below a multi-line block instead of gluing onto its last line
 * (e.g. behind a closing code fence).
 */
export function fitToLine(
	plan: InsertPlan,
	def: BlockDef,
	lineBefore: string,
	lineAfter: string,
): InsertPlan {
	if (!isBlockLevel(def)) return plan;
	let text = plan.text;
	let cursor = plan.cursor;
	const multiLine = text.includes("\n");
	if (!CONTAINER_ONLY.test(lineBefore)) {
		// Divider and table need a blank line above: "text\n---" would turn
		// the text into a setext heading, and tables don't interrupt a
		// paragraph. Headings, quotes, lists and fences only need a new line.
		const breaks = def.wrap === "none" ? "\n\n" : "\n";
		text = breaks + text;
		// The block now starts at column 0 of a later line, so the relative
		// column becomes an absolute one unchanged.
		cursor = { lineDelta: cursor.lineDelta + breaks.length, ch: cursor.ch };
	}
	if (multiLine && lineAfter.trim().length > 0) text += "\n";
	return { text, cursor };
}
