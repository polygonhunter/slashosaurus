import {
	debounce,
	PluginSettingTab,
	Setting,
	type App,
	type Debouncer,
	type Plugin,
	type SettingDefinitionItem,
} from "obsidian";
import { formatDate } from "./core/dateformat";
import type { BlockDef, UserSnippet } from "./core/types";
import { validateSnippet } from "./core/snippets";
import {
	DEFAULT_SETTINGS,
	isSingleChar,
	type SlashosaurusSettings,
} from "./core/settings-normalize";

export { DEFAULT_SETTINGS, type SlashosaurusSettings } from "./core/settings-normalize";

/** Structural host interface — avoids a settings.ts ↔ main.ts import cycle. */
export interface SettingsHost extends Plugin {
	settings: SlashosaurusSettings;
	/** Immediate write. */
	saveSettings(): Promise<void>;
	/** Debounced write — for per-keystroke edits. */
	requestSave: Debouncer<[], void>;
	/** Drop anything derived from settings (cached catalog with snippets). */
	onSettingsChanged(): void;
	/** Catalog plus snippets, cached until the next onSettingsChanged(). */
	getBlockDefs(): readonly BlockDef[];
	/** Note a block as just used (feeds the "Recent" group). */
	recordRecent(id: string): void;
}

const HEADS_UP = {
	name: "Heads-up",
	desc: 'If Obsidian\'s core "Slash commands" plugin is enabled, two menus will open on "/". Disable it under Settings → Core plugins, or pick a different trigger character below.',
};
const TRIGGER = {
	name: "Trigger character",
	desc: "The character that opens the menu. Must be a single character.",
};
const TRIGGER_INVALID = "Must be a single character — the previous one stays active.";
const DATE_FORMAT = { name: "Date format" };

/** Non-public App surface for the core-plugin check. Not in the official
 *  typings — every access is optional. */
interface InternalPluginsHost {
	internalPlugins?: {
		getPluginById?(id: string): { enabled?: boolean } | null | undefined;
	};
}
const SNIPPETS_INTRO =
	"Your own blocks for the menu. Put {cursor} where writing should continue (without it the cursor lands at the end). Also filled in: {selection} (selected text), {date} (in the format above), {time} (HH:mm) and {title} (note name).";

/**
 * Dual-path settings tab: on Obsidian 1.13+ the declarative definitions from
 * getSettingDefinitions() render the tab and feed the settings search; on
 * older versions (minAppVersion 1.12.4) that method is never called and the
 * imperative display() fallback renders instead.
 */
export class SlashosaurusSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly host: SettingsHost,
	) {
		super(app, host);
	}

	/** Per-keystroke edits: in-memory settings change now, disk write is
	 *  debounced. */
	private persist(): void {
		this.host.requestSave();
		this.host.onSettingsChanged();
	}

	/** Structural edits (delete, reorder): written immediately. */
	private async persistNow(): Promise<void> {
		await this.host.saveSettings();
		this.host.onSettingsChanged();
	}

	hide(): void {
		// Closing the tab flushes whatever is still waiting in the debounce.
		this.host.requestSave.run();
		// A pending preview refresh would re-render a tab that is gone.
		this.refreshDefinitionsSoon.cancel();
		super.hide();
	}

	/** Re-render/re-index the declarative tab. Only ever invoked from the
	 *  declarative callbacks (1.13+), but guarded structurally so it is a
	 *  no-op instead of a TypeError on apps without update(). */
	private refreshDefinitions(): void {
		(this as { update?: () => void }).update?.();
	}

	/** Same as refreshDefinitions, but at most once per typing pause — used
	 *  for live previews that would otherwise re-render on every keystroke. */
	private readonly refreshDefinitionsSoon = debounce(() => this.refreshDefinitions(), 400, true);

	/**
	 * The heads-up only matters when both menus would open on "/": our
	 * trigger is "/" and the core "Slash commands" plugin is on. If the
	 * internal API can't tell, it stays visible to be safe.
	 */
	private showHeadsUp(): boolean {
		if (this.host.settings.triggerChar !== "/") return false;
		const internal = (this.app as App & InternalPluginsHost).internalPlugins;
		if (typeof internal?.getPluginById !== "function") return true;
		return internal.getPluginById("slash-command")?.enabled !== false;
	}

	private snippetName(snippet: UserSnippet, index: number): string {
		return snippet.name || `Snippet ${index + 1}`;
	}

	// ── Declarative path (1.13+) ────────────────────────────────────────

	getSettingDefinitions(): SettingDefinitionItem[] {
		const settings = this.host.settings;
		return [
			...(this.showHeadsUp() ? [{ ...HEADS_UP }] : []),
			{
				...TRIGGER,
				control: {
					type: "text",
					key: "triggerChar",
					placeholder: DEFAULT_SETTINGS.triggerChar,
					defaultValue: DEFAULT_SETTINGS.triggerChar,
					validate: (value: string) =>
						isSingleChar(value) ? undefined : "Must be a single character.",
				},
			},
			{
				...DATE_FORMAT,
				desc: this.dateFormatDesc(settings.dateFormat),
				control: {
					type: "text",
					key: "dateFormat",
					placeholder: DEFAULT_SETTINGS.dateFormat,
					defaultValue: DEFAULT_SETTINGS.dateFormat,
				},
			},
			{
				type: "list",
				heading: "Snippets",
				emptyState: SNIPPETS_INTRO,
				items: settings.snippets.map((snippet, index) => ({
					name: this.snippetName(snippet, index),
					render: (setting: Setting) => {
						setting.setDesc(validateSnippet(snippet) ?? "");
						this.addSnippetControls(setting, snippet, index);
					},
				})),
				addItem: {
					name: "Add snippet",
					action: () => {
						settings.snippets.push({ name: "", template: "" });
						this.refreshDefinitions();
					},
				},
				onDelete: (index: number) => {
					settings.snippets.splice(index, 1);
					void this.persistNow().then(() => this.refreshDefinitions());
				},
				onReorder: (oldIndex: number, newIndex: number) => {
					const [moved] = settings.snippets.splice(oldIndex, 1);
					if (moved === undefined) return;
					settings.snippets.splice(newIndex, 0, moved);
					void this.persistNow().then(() => this.refreshDefinitions());
				},
			},
		];
	}

	getControlValue(key: string): unknown {
		const settings = this.host.settings;
		if (key === "triggerChar") return settings.triggerChar;
		if (key === "dateFormat") return settings.dateFormat;
		return undefined;
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		const settings = this.host.settings;
		if (key === "triggerChar") {
			const char = String(value).trim();
			// validate() only flags the field; never store an unusable trigger.
			if (!isSingleChar(char)) return;
			settings.triggerChar = char;
		} else if (key === "dateFormat") {
			settings.dateFormat = String(value).trim() || DEFAULT_SETTINGS.dateFormat;
		} else {
			return;
		}
		this.persist();
		// Refresh the live "Currently: …" preview in the date format desc and
		// the trigger-dependent heads-up — debounced, so typing doesn't
		// re-render per keystroke.
		this.refreshDefinitionsSoon();
	}

	/** Name + template controls for one snippet row — shared by both paths. */
	private addSnippetControls(setting: Setting, snippet: UserSnippet, index: number): void {
		// Keep the row's title and problem hint in step with the inputs —
		// without re-rendering, which would steal focus.
		const refreshRow = (): void => {
			setting.setName(this.snippetName(snippet, index));
			setting.setDesc(validateSnippet(snippet) ?? "");
		};
		setting
			.addText((text) =>
				text
					.setPlaceholder("Name")
					.setValue(snippet.name)
					.onChange((value) => {
						snippet.name = value;
						refreshRow();
						this.persist();
					}),
			)
			.addTextArea((area) =>
				area
					.setPlaceholder("Template with {cursor}")
					.setValue(snippet.template)
					.onChange((value) => {
						snippet.template = value;
						refreshRow();
						this.persist();
					}),
			);
	}

	// ── Imperative fallback (≤1.12) — not called once getSettingDefinitions
	// returns a non-empty array. ─────────────────────────────────────────

	display(): void {
		this.renderLegacy();
	}

	private renderLegacy(): void {
		const { containerEl } = this;
		containerEl.empty();
		const settings = this.host.settings;

		const headsUp = new Setting(containerEl).setName(HEADS_UP.name).setDesc(HEADS_UP.desc);
		headsUp.settingEl.toggle(this.showHeadsUp());

		const triggerSetting = new Setting(containerEl).setName(TRIGGER.name).setDesc(TRIGGER.desc);
		triggerSetting.addText((text) =>
			text
				.setPlaceholder(DEFAULT_SETTINGS.triggerChar)
				.setValue(settings.triggerChar)
				.onChange((value) => {
					const char = value.trim();
					const valid = isSingleChar(char);
					// Say why nothing happens instead of silently ignoring.
					text.inputEl.toggleClass("is-invalid", !valid);
					triggerSetting.setDesc(valid ? TRIGGER.desc : TRIGGER_INVALID);
					if (!valid) return;
					settings.triggerChar = char;
					headsUp.settingEl.toggle(this.showHeadsUp());
					this.persist();
				}),
		);

		const dateSetting = new Setting(containerEl)
			.setName(DATE_FORMAT.name)
			.setDesc(this.dateFormatDesc(settings.dateFormat));
		dateSetting.addText((text) =>
			text
				.setPlaceholder(DEFAULT_SETTINGS.dateFormat)
				.setValue(settings.dateFormat)
				.onChange((value) => {
					settings.dateFormat = value.trim() || DEFAULT_SETTINGS.dateFormat;
					// Only the preview changes — re-rendering the whole tab
					// here would steal focus from the input after every key.
					dateSetting.setDesc(this.dateFormatDesc(settings.dateFormat));
					this.persist();
				}),
		);

		new Setting(containerEl).setName("Snippets").setHeading();

		new Setting(containerEl).setDesc(SNIPPETS_INTRO);

		settings.snippets.forEach((snippet, index) => {
			const row = new Setting(containerEl)
				.setName(this.snippetName(snippet, index))
				.setDesc(validateSnippet(snippet) ?? "");
			this.addSnippetControls(row, snippet, index);
			row.addExtraButton((button) =>
				button
					.setIcon("x")
					.setTooltip("Remove")
					.onClick(async () => {
						settings.snippets.splice(index, 1);
						await this.persistNow();
						this.renderLegacy();
					}),
			);
		});

		new Setting(containerEl).addButton((button) =>
			button.setButtonText("Add snippet").onClick(() => {
				settings.snippets.push({ name: "", template: "" });
				this.renderLegacy();
			}),
		);
	}

	private dateFormatDesc(format: string): string {
		return `Format for the "Today's date" block — tokens like YYYY, MM, DD, Do, ddd, W, HH, mm (literal text in [brackets]). Currently: ${formatDate(new Date(), format)}`;
	}
}
