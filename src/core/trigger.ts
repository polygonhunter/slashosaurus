import type { TriggerHit } from "./types";

/**
 * Decide whether the slash menu should open, given everything on the current
 * line left of the cursor. The trigger only fires at the start of a line or
 * after whitespace — never inside a word, URL, or path — and the query is
 * limited to letters, digits, and dashes so ordinary punctuation closes the
 * menu naturally.
 */

const regexCache = new Map<string, RegExp>();

function escapeRegex(char: string): string {
	return char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function triggerRegex(triggerChar: string): RegExp {
	let re = regexCache.get(triggerChar);
	if (!re) {
		re = new RegExp(`(?:^|\\s)${escapeRegex(triggerChar)}([\\p{L}\\p{N}-]*)$`, "u");
		regexCache.set(triggerChar, re);
	}
	return re;
}

/** Characters the query itself may contain. */
const QUERY_CHAR = /^[\p{L}\p{N}-]$/u;

export function detectTrigger(lineBeforeCursor: string, triggerChar: string): TriggerHit | null {
	if (triggerChar.length === 0) return null;
	// Fast exit: most keystrokes happen on lines without the trigger at all.
	const last = lineBeforeCursor.lastIndexOf(triggerChar);
	if (last === -1) return null;

	// If the trigger can't appear inside a query, a match can only start at
	// its last occurrence — so only the tail (plus the one character that
	// must be whitespace or line start) needs the regex. Long lines then cost
	// the same as short ones. Triggers that are query characters themselves
	// (a letter, digit or "-") keep the full-line scan.
	const offset = QUERY_CHAR.test(triggerChar) ? 0 : Math.max(0, last - 1);
	const text = offset === 0 ? lineBeforeCursor : lineBeforeCursor.slice(offset);
	const match = triggerRegex(triggerChar).exec(text);
	if (!match || match.index === undefined) return null;
	const query = match[1] ?? "";
	// match[0] may start with the whitespace that guards the trigger.
	const startCh = offset + match.index + (match[0].length - triggerChar.length - query.length);
	return { startCh, query };
}
