import type { TriggerHit } from "./types";

const regexCache = new Map<string, RegExp>();

function escapeRegex(char: string): string {
	return char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Escape for use inside a character class, where "-" and "^" matter too. */
function escapeClass(char: string): string {
	return char.replace(/[\\\]^-]/g, "\\$&");
}

function triggerRegex(triggerChar: string, loose: boolean): RegExp {
	const key = (loose ? "loose:" : "word:") + triggerChar;
	let re = regexCache.get(key);
	if (!re) {
		// Loose: no whitespace, no trigger, and no backtick — a fence's
		// language can't contain one.
		const query = loose ? `[^\\s\`${escapeClass(triggerChar)}]*` : "[\\p{L}\\p{N}-]*";
		re = new RegExp(`(?:^|\\s)${escapeRegex(triggerChar)}(${query})$`, "u");
		regexCache.set(key, re);
	}
	return re;
}

/** Characters the query itself may contain. */
const QUERY_CHAR = /^[\p{L}\p{N}-]$/u;

/**
 * Decide whether the slash menu should open, given everything on the current
 * line left of the cursor. The trigger only fires at the start of a line or
 * after whitespace — never inside a word, URL, or path — and the query is
 * limited to letters, digits, and dashes so ordinary punctuation closes the
 * menu naturally.
 *
 * @param loose any character but whitespace, a backtick or the trigger may
 *   follow it — for the code block's language, where "c++" or "f#" are
 *   valid answers.
 */
export function detectTrigger(
	lineBeforeCursor: string,
	triggerChar: string,
	loose = false,
): TriggerHit | null {
	if (triggerChar.length === 0) return null;
	// Fast exit: most keystrokes happen on lines without the trigger at all.
	const last = lineBeforeCursor.lastIndexOf(triggerChar);
	if (last === -1) return null;

	// If the trigger can't appear inside a query, a match can only start at
	// its last occurrence — so only the tail (plus the one character that
	// must be whitespace or line start) needs the regex. Long lines then cost
	// the same as short ones. Triggers that are query characters themselves
	// (a letter, digit or "-") keep the full-line scan.
	const offset = !loose && QUERY_CHAR.test(triggerChar) ? 0 : Math.max(0, last - 1);
	const text = offset === 0 ? lineBeforeCursor : lineBeforeCursor.slice(offset);
	const match = triggerRegex(triggerChar, loose).exec(text);
	if (!match || match.index === undefined) return null;
	const query = match[1] ?? "";
	// match[0] may start with the whitespace that guards the trigger.
	const startCh = offset + match.index + (match[0].length - triggerChar.length - query.length);
	return { startCh, query };
}
