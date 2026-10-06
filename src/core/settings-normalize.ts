import type { UserSnippet } from "./types";

/**
 * Settings shape, defaults and the loader-side validation. Lives in core so
 * it stays free of obsidian imports and can be unit-tested; settings.ts
 * re-exports everything for the UI.
 */

export interface SlashosaurusSettings {
	/** Character that opens the menu. One character, defaults to "/". */
	triggerChar: string;
	/** Moment-style format for the "Today's date" block. */
	dateFormat: string;
	/** User-defined blocks; {cursor} marks the writing position. */
	snippets: UserSnippet[];
}

export const DEFAULT_SETTINGS: Readonly<SlashosaurusSettings> = Object.freeze({
	triggerChar: "/",
	dateFormat: "YYYY-MM-DD",
	snippets: [],
});

/** A fresh, unshared copy of the defaults (no array aliasing). */
export function defaultSettings(): SlashosaurusSettings {
	return {
		triggerChar: DEFAULT_SETTINGS.triggerChar,
		dateFormat: DEFAULT_SETTINGS.dateFormat,
		snippets: [],
	};
}

/** Exactly one Unicode code point after trimming (emoji count as one). */
export function isSingleChar(value: string): boolean {
	return [...value.trim()].length === 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/**
 * Turn whatever data.json holds (hand-edited, from an older version, or
 * missing) into valid settings. Every invalid field falls back to its
 * default; nothing is shared with DEFAULT_SETTINGS or the input.
 */
export function normalizeSettings(raw: unknown): SlashosaurusSettings {
	const result = defaultSettings();
	if (!isRecord(raw)) return result;

	const trigger = raw.triggerChar;
	if (typeof trigger === "string" && isSingleChar(trigger)) {
		result.triggerChar = trigger.trim();
	}

	const format = raw.dateFormat;
	if (typeof format === "string" && format.trim().length > 0) {
		result.dateFormat = format;
	}

	if (Array.isArray(raw.snippets)) {
		for (const entry of raw.snippets as unknown[]) {
			if (
				isRecord(entry) &&
				typeof entry.name === "string" &&
				typeof entry.template === "string"
			) {
				result.snippets.push({ name: entry.name, template: entry.template });
			}
		}
	}

	return result;
}
