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
