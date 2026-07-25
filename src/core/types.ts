/**
 * Pure data types shared across the plugin. This module (like everything in
 * core/) must not import from "obsidian" so it stays unit-testable.
 */

export type GroupId = "text" | "callout" | "insert" | "snippet" | "bible";

export const GROUP_ORDER: readonly GroupId[] = ["text", "callout", "insert", "snippet", "bible"];

export const GROUP_LABELS: Record<GroupId, string> = {
	text: "Text",
	callout: "Callouts",
	insert: "Insert",
	snippet: "Snippets",
	bible: "Daily Bible Verse",
};

/** How a text selection is embedded when a block is chosen while text was selected. */
export type WrapKind =
	| "inline" // selection lands where {cursor} is (link, embed, math, comment)
	| "prefixLines" // every selection line gets linePrefix (quote, callout, lists, headings)
	| "fenced" // selection goes between the fences, cursor after the block
	| "none"; // selection is re-emitted verbatim before the block — never lost

/** What the preview tile on the left of a menu row shows. */
export type TileSpec =
	| { kind: "callout"; calloutType: string; emoji?: string; label?: string }
	| { kind: "heading"; level: 1 | 2 | 3 }
	| { kind: "quote" }
	| { kind: "mono"; sample: string }
	| { kind: "list"; marker: "bullet" | "number" | "check" }
	| { kind: "table" }
	| { kind: "divider" }
	| { kind: "emoji"; char: string }
	| { kind: "icon"; icon: string };

export interface BlockDef {
	id: string;
	name: string;
	/** Extra match terms besides the name; shown as hint and fed to the fuzzy filter. */
	aliases: string[];
	group: GroupId;
	template: string; // may contain {cursor}, {date}, {fold}, {lang}
	wrap: WrapKind;
	linePrefix?: string; // only for wrap === "prefixLines"
	tile: TileSpec;
	special?: "codeblock" | "footnote" | "date" | "command";
	foldable?: boolean; // callouts: Shift+Enter inserts the collapsed variant
	commandId?: string; // only for special === "command": the command to execute on select
	requiresPlugin?: string; // hidden unless this community plugin is installed and enabled
}

/** Result of scanning the text left of the cursor for the trigger. */
export interface TriggerHit {
	/** Column of the trigger character itself. */
	startCh: number;
	/** What was typed after the trigger, without the trigger character. */
	query: string;
}

/** Everything environment-specific, injected so core stays pure. */
export interface TemplateEnv {
	selection: string | null;
	date: string;
	folded: boolean;
	language: string | null;
}

export interface InsertPlan {
	/** Final text, all placeholders resolved. */
	text: string;
	/**
	 * Where the editor cursor belongs, relative to the insertion start:
	 * lineDelta 0 → same line, `ch` is an offset from the insertion column;
	 * lineDelta > 0 → `ch` is the absolute column on that line.
	 */
	cursor: { lineDelta: number; ch: number };
}

export interface UserSnippet {
	name: string;
	template: string; // {cursor} marks the writing position
}
