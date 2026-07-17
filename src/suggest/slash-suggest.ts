import {
	EditorSuggest,
	moment,
	prepareFuzzySearch,
	type App,
	type Editor,
	type EditorPosition,
	type EditorSuggestContext,
	type EditorSuggestTriggerInfo,
	type TFile,
} from "obsidian";
import { CATALOG, LANGUAGES } from "../core/catalog";
import { planFootnote } from "../core/footnote";
import { buildInsertion } from "../core/insert";
import { rankBlocks, type FuzzyFactory } from "../core/rank";
import { snippetsToBlockDefs } from "../core/snippets";
import { detectTrigger } from "../core/trigger";
import { GROUP_LABELS, type BlockDef, type GroupId, type TemplateEnv } from "../core/types";
import type { SettingsHost } from "../settings";
import { SelectionPill } from "./pill";
import { renderBlockItem, renderLanguageItem } from "./render";
import type { SelectionStashTracker } from "./selection-stash";

export type SuggestItem =
	| { kind: "block"; def: BlockDef; groupLabel?: string }
	| { kind: "lang"; value: string };

const fuzzyFactory: FuzzyFactory = (query) => prepareFuzzySearch(query);

export class SlashSuggest extends EditorSuggest<SuggestItem> {
	private readonly pill = new SelectionPill();

	/**
	 * Two-stage state: picking a block, or picking the language after the
	 * code block was chosen. `langTarget` carries the code block def across
	 * the stage switch.
	 */
	private mode: "blocks" | "language" = "blocks";
	private langTarget: BlockDef | null = null;
	/** True between choosing "Code block" and the re-trigger it provokes. */
	private stageSwitchInFlight = false;

	/** Selection captured when the trigger replaced it (see selection-stash). */
	private pendingSelection: string | null = null;
	private pendingAt = -1;

	/** renderSuggestion's (el, item) pairs — lets Shift+Enter find the target. */
	private rendered: Array<{ el: HTMLElement; item: SuggestItem }> = [];

	constructor(
		app: App,
		private readonly host: SettingsHost,
		private readonly stashTracker: SelectionStashTracker,
	) {
		super(app);
		// The visible height is capped in CSS (~5 rows); the list itself stays
		// complete and scrollable, so every group remains reachable.
		this.limit = 100;
		this.showBlockInstructions();

		// Obsidian's own Enter binding carries no modifiers, so Shift+Enter
		// (foldable callout) needs its own scope registration.
		this.scope.register(["Shift"], "Enter", (evt) => {
			const hit = this.rendered.find((r) => r.el.hasClass("is-selected"));
			if (hit && evt instanceof KeyboardEvent) {
				this.selectSuggestion(hit.item, evt);
				this.close();
				return false;
			}
			return true;
		});

		// In language mode, Escape means "code block without a language" —
		// otherwise the default (dismiss) stays in charge.
		this.scope.register([], "Escape", () => {
			if (this.mode !== "language") return true;
			this.finishCodeBlock(null);
			return false;
		});
	}

	private showBlockInstructions(): void {
		this.setInstructions([
			{ command: "↵", purpose: "insert" },
			{ command: "shift ↵", purpose: "foldable callout" },
			{ command: "esc", purpose: "dismiss" },
		]);
	}

	private showLanguageInstructions(): void {
		this.setInstructions([
			{ command: "↵", purpose: "pick language" },
			{ command: "esc", purpose: "no language" },
		]);
	}

	onTrigger(
		cursor: EditorPosition,
		editor: Editor,
		_file: TFile | null,
	): EditorSuggestTriggerInfo | null {
		const lineBeforeCursor = editor.getLine(cursor.line).slice(0, cursor.ch);
		const hit = detectTrigger(lineBeforeCursor, this.host.settings.triggerChar);
		if (!hit) {
			if (this.mode === "language" && !this.stageSwitchInFlight) {
				// The trigger disappeared mid-language-pick (deleted, clicked
				// away and typed elsewhere) — abandon the stage cleanly.
				this.resetSession();
			}
			return null;
		}

		const triggerOffset = editor.posToOffset({ line: cursor.line, ch: hit.startCh });
		if (this.stageSwitchInFlight) {
			// This trigger was provoked by our own replaceRange; the stash now
			// holds the replaced "/query", which is NOT a user selection.
			this.stageSwitchInFlight = false;
			this.stashTracker.clear();
		} else {
			const stashed = this.stashTracker.consume(triggerOffset);
			if (stashed !== null) {
				this.pendingSelection = stashed;
				this.pendingAt = triggerOffset;
			} else if (this.pendingAt !== triggerOffset) {
				// A different trigger session — old pending state is stale.
				this.pendingSelection = null;
				this.pendingAt = triggerOffset;
				if (this.mode === "language") this.resetSession();
			}
		}

		return {
			start: { line: cursor.line, ch: hit.startCh },
			end: { line: cursor.line, ch: cursor.ch },
			query: hit.query,
		};
	}

	getSuggestions(context: EditorSuggestContext): SuggestItem[] {
		this.rendered = [];
		if (this.mode === "language") {
			const query = context.query;
			const languages = query
				? LANGUAGES.map((lang) => ({ lang, match: fuzzyFactory(query)(lang) }))
						.filter((x) => x.match !== null)
						.sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0))
						.map((x) => x.lang)
				: [...LANGUAGES];
			return languages.map((value) => ({ kind: "lang" as const, value }));
		}

		const defs = [...CATALOG, ...snippetsToBlockDefs(this.host.settings.snippets)];
		const ranked = rankBlocks(defs, context.query, fuzzyFactory);
		if (context.query.length > 0) {
			return ranked.map((def) => ({ kind: "block" as const, def }));
		}
		// Empty query → grouped view with overline labels on each group start.
		let previousGroup: GroupId | null = null;
		return ranked.map((def) => {
			const groupLabel = def.group !== previousGroup ? GROUP_LABELS[def.group] : undefined;
			previousGroup = def.group;
			return { kind: "block" as const, def, groupLabel };
		});
	}

	renderSuggestion(item: SuggestItem, el: HTMLElement): void {
		this.adoptPopover(el);
		this.rendered.push({ el, item });
		if (item.kind === "block") {
			renderBlockItem(item.def, el, item.groupLabel);
		} else {
			renderLanguageItem(item.value, el);
		}
	}

	/** Scope our styling to this popover and mount the pill — idempotent. */
	private adoptPopover(itemEl: HTMLElement): void {
		const container = itemEl.closest(".suggestion-container");
		if (container instanceof HTMLElement) {
			container.addClass("slashosaurus-popover");
			this.pill.mount(container);
		}
	}

	close(): void {
		this.pill.destroy();
		if (!this.stageSwitchInFlight) {
			this.resetSession();
		}
		super.close();
	}

	private resetSession(): void {
		this.mode = "blocks";
		this.langTarget = null;
		this.pendingSelection = null;
		this.pendingAt = -1;
		this.showBlockInstructions();
	}

	selectSuggestion(item: SuggestItem, evt: MouseEvent | KeyboardEvent): void {
		if (item.kind === "lang") {
			this.finishCodeBlock(item.value);
			return;
		}
		const context = this.context;
		if (!context) return;
		if (item.def.special === "codeblock") {
			this.enterLanguageStage(context, item.def);
			return;
		}
		if (item.def.special === "footnote") {
			this.insertFootnote(context);
			return;
		}
		this.insertBlock(context, item.def, {
			folded: evt.shiftKey && item.def.foldable === true,
			language: null,
		});
	}

	/** Stage 1 → 2: collapse "/query" back to a bare trigger; the resulting
	 *  editor transaction re-fires onTrigger and the popup reopens showing
	 *  languages. */
	private enterLanguageStage(context: EditorSuggestContext, def: BlockDef): void {
		this.mode = "language";
		this.langTarget = def;
		this.stageSwitchInFlight = true;
		this.showLanguageInstructions();
		const trigger = this.host.settings.triggerChar;
		context.editor.replaceRange(trigger, context.start, context.end);
		context.editor.setCursor({ line: context.start.line, ch: context.start.ch + 1 });
	}

	private finishCodeBlock(language: string | null): void {
		const context = this.context;
		const def = this.langTarget;
		if (!context || !def) {
			this.resetSession();
			this.close();
			return;
		}
		this.insertBlock(context, def, { folded: false, language });
		this.resetSession();
		this.close();
	}

	private insertBlock(
		context: EditorSuggestContext,
		def: BlockDef,
		opts: { folded: boolean; language: string | null },
	): void {
		const env: TemplateEnv = {
			selection: this.pendingSelection,
			date: moment().format(this.host.settings.dateFormat),
			folded: opts.folded,
			language: opts.language,
		};
		const plan = buildInsertion(def, env);
		context.editor.replaceRange(plan.text, context.start, context.end);
		context.editor.setCursor({
			line: context.start.line + plan.cursor.lineDelta,
			ch:
				plan.cursor.lineDelta === 0
					? context.start.ch + plan.cursor.ch
					: plan.cursor.ch,
		});
		this.pendingSelection = null;
		this.pendingAt = -1;
	}

	private insertFootnote(context: EditorSuggestContext): void {
		const { editor } = context;
		// The typed "/query" is still in the document but can't contain "[^",
		// so it never affects the numbering.
		const plan = planFootnote(editor.getValue());
		editor.replaceRange(plan.marker, context.start, context.end);
		const lastLine = editor.lastLine();
		const docEnd = { line: lastLine, ch: editor.getLine(lastLine).length };
		editor.replaceRange(plan.appendText, docEnd);
		const newLastLine = editor.lastLine();
		editor.setCursor({ line: newLastLine, ch: editor.getLine(newLastLine).length });
	}
}
