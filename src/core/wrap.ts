import { CURSOR, type WrapKind } from "./types";

/**
 * Embed a text selection into a block template. The selection replaces the
 * spot marked by the cursor marker; where the marker ends up afterwards
 * depends on the wrap kind. Whatever happens, the selected text is never
 * dropped.
 *
 * All replacements use replacer functions — a string replacement would
 * interpret "$&", "$$", "$`" and "$'" inside the selection as patterns.
 */

/** "1. " → "3. " for the third line; non-numbered prefixes pass through. */
function prefixForLine(linePrefix: string, lineIndex: number): string {
	const numbered = /^(\d+)([.)] )$/.exec(linePrefix);
	if (!numbered) return linePrefix;
	return `${Number(numbered[1]) + lineIndex}${numbered[2]}`;
}

/** Insert `replacement` at the first `marker`; append it if there is none. */
function putAtMarker(template: string, marker: string, replacement: string): string {
	if (!template.includes(marker)) return template + replacement;
	return template.replace(marker, () => replacement);
}

/** Length of the longest run of backticks in `text`. */
function longestBacktickRun(text: string): number {
	let longest = 0;
	for (const run of text.match(/`+/g) ?? []) longest = Math.max(longest, run.length);
	return longest;
}

/**
 * A selection that itself contains ``` would end a three-backtick fence
 * early. Lengthen both fences to one more than the longest run inside.
 */
function widenFence(template: string, selection: string): string {
	const length = Math.max(3, longestBacktickRun(selection) + 1);
	if (length === 3) return template;
	const fence = "`".repeat(length);
	return template.replace(/^`{3,}/, () => fence).replace(/`{3,}$/, () => fence);
}

export function embedSelection(
	template: string,
	selection: string,
	kind: WrapKind,
	linePrefix: string,
	marker: string = CURSOR,
): string {
	switch (kind) {
		case "inline":
			// Selection lands inside the construct, cursor right behind it.
			return putAtMarker(template, marker, selection + marker);
		case "prefixLines": {
			// First selection line sits behind the prefix the template already
			// carries; every further line gets its own prefix.
			const lines = selection.split("\n");
			const joined = lines
				.map((line, i) => (i === 0 ? line : prefixForLine(linePrefix, i) + line))
				.join("\n");
			return putAtMarker(template, marker, joined + marker);
		}
		case "fenced":
			// Selection fills the block, cursor continues below it.
			return widenFence(template, selection).replace(marker, () => selection) + "\n" + marker;
		case "none":
			// Block doesn't accept content — re-emit the selection above it.
			return selection + "\n" + template;
	}
}
