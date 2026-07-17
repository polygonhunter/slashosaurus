/**
 * Footnotes need two edits: the marker at the cursor and a definition at the
 * end of the document. This plans both from the document text alone.
 */

export interface FootnotePlan {
	/** Marker to place at the cursor, e.g. "[^4]". */
	marker: string;
	/** Text to append at the very end of the document, e.g. "\n[^4]: ". */
	appendText: string;
}

export function planFootnote(doc: string): FootnotePlan {
	// Next number = highest numeric footnote + 1; named footnotes ([^why])
	// don't participate in numbering.
	let highest = 0;
	const re = /\[\^(\d+)\]/g;
	let match: RegExpExecArray | null;
	while ((match = re.exec(doc)) !== null) {
		highest = Math.max(highest, Number(match[1]));
	}
	const marker = `[^${highest + 1}]`;
	const needsNewline = doc.length > 0 && !doc.endsWith("\n");
	return {
		marker,
		appendText: `${needsNewline ? "\n" : ""}${marker}: `,
	};
}
