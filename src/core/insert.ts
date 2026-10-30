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
 * Fill {name} everywhere, but leave {{name}} alone: that is Templater/core
 * Templates syntax a user snippet may carry on purpose, and filling the inner
 * braces would mangle it into "{value}".
 */
function fillPlaceholder(template: string, name: string, value: string): string {
	const escaped = `{{${name}}}`;
	return template
		.split(escaped)
		.map((part) => replaceAllLiteral(part, `{${name}}`, value))
		.join(escaped);
}

function hasPlaceholder(template: string, name: string): boolean {
	return template.split(`{{${name}}}`).some((part) => part.includes(`{${name}}`));
}

/**
 * Resolve a template into the final text plus the cursor position relative to
 * the insertion start. Placeholders: {lang}, {fold}, {date}, {time}, {title},
 * {selection}, {cursor}. A template with {selection} decides itself where
 * selected text goes; otherwise the def's wrap kind embeds it.
 */
export function buildInsertion(def: BlockDef, env: TemplateEnv): InsertPlan {
	let template = markCursor(def.template);
	template = replaceAllLiteral(template, "{lang}", env.language ?? "");
	template = replaceAllLiteral(template, "{fold}", env.folded ? "-" : "");
	template = fillPlaceholder(template, "date", env.date);
	template = fillPlaceholder(template, "time", env.time);
	template = fillPlaceholder(template, "title", env.title);
	if (hasPlaceholder(template, "selection")) {
		// Last, so placeholders inside the selected text stay literal.
		template = fillPlaceholder(template, "selection", env.selection ?? "");
	} else if (env.selection !== null && env.selection.length > 0) {
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
 *  and single-line "none" blocks (date, plugin commands) may sit mid-line;
 *  the math block wraps a selection inline but still needs its own line. */
export function isBlockLevel(def: BlockDef): boolean {
	if (def.block === true) return true;
	if (def.wrap === "prefixLines" || def.wrap === "fenced") return true;
	return def.wrap === "none" && def.template.includes("\n");
}

/** Only whitespace, quote markers and at most one empty list or task marker
 *  — "> /note" stays in the quote, "- /h2" stays in the list item instead of
 *  leaving an empty bullet behind (Enter in a list, then /…).
 *  Groups: quote markers, indentation, list marker, trailing spaces. */
const CONTAINER_ONLY = /^((?:\s*>)*)(\s*)(?:([-*+]|\d+[.)])(?: \[.\])? )?(\s*)$/;

/** Quote markers in front of text — "> text /code" keeps the code in the quote. */
const QUOTE_PREFIX = /^(?:\s*>)+ ?/;

/** A def whose prefix is itself a list or task marker. */
const LIST_PREFIX = /^(?:[-*+]|\d+[.)])(?: \[.\])? $/;

/**
 * Make a block-level insertion fit the line it lands on: text left of the
 * trigger pushes the block onto its own line, and text right of the cursor
 * is moved below a multi-line block instead of gluing onto its last line
 * (e.g. behind a closing code fence). Every further line repeats the
 * container the block sits in — quote markers, or a list item's indentation
 * — so a code fence or table typed in a callout stays inside it.
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
	let consumeBefore = 0;
	let continuation: string;
	const multiLine = text.includes("\n");
	const container = CONTAINER_ONLY.exec(lineBefore);
	if (container) {
		const [, quotes = "", indent = "", marker, trailing = ""] = container;
		if (marker !== undefined && LIST_PREFIX.test(def.linePrefix ?? "")) {
			// A list block takes over the empty item's marker: "- " + /todo
			// is "- [ ] ", not the nested "- - [ ] ".
			consumeBefore = lineBefore.length - quotes.length - indent.length;
			continuation = quotes + indent;
		} else {
			// Content of a list item continues under its text, so the
			// marker turns into indentation of the same width.
			const markerWidth = marker === undefined ? 0 : marker.length + 1;
			continuation = quotes + indent + " ".repeat(markerWidth) + trailing;
		}
	} else {
		// Divider and table need a blank line above: "text\n---" would turn
		// the text into a setext heading, and tables don't interrupt a
		// paragraph. Headings, quotes, lists and fences only need a new line.
		const breaks = def.wrap === "none" ? "\n\n" : "\n";
		text = breaks + text;
		// The block now starts at column 0 of a later line, so the relative
		// column becomes an absolute one (shifted by the continuation below).
		cursor = { lineDelta: cursor.lineDelta + breaks.length, ch: cursor.ch };
		continuation = QUOTE_PREFIX.exec(lineBefore)?.[0] ?? "";
	}
	if (multiLine && lineAfter.trim().length > 0) text += "\n";
	if (continuation.length > 0 && text.includes("\n")) {
		text = text.split("\n").join("\n" + continuation);
		if (cursor.lineDelta > 0) {
			cursor = { lineDelta: cursor.lineDelta, ch: cursor.ch + continuation.length };
		}
	}
	return consumeBefore > 0 ? { text, cursor, consumeBefore } : { text, cursor };
}
