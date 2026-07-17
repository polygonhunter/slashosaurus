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

export function detectTrigger(lineBeforeCursor: string, triggerChar: string): TriggerHit | null {
	if (triggerChar.length === 0) return null;
	const match = triggerRegex(triggerChar).exec(lineBeforeCursor);
	if (!match || match.index === undefined) return null;
	const query = match[1] ?? "";
	// match[0] may start with the whitespace that guards the trigger.
	const startCh = match.index + (match[0].length - triggerChar.length - query.length);
	return { startCh, query };
}
