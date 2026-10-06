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
import type { UserSnippet } from "./core/types";
import { validateSnippet } from "./core/snippets";

export interface SlashosaurusSettings {
	/** Character that opens the menu. One character, defaults to "/". */
	triggerChar: string;
	/** Moment format for the "Today's date" block. */
	dateFormat: string;
	/** User-defined blocks; {cursor} marks the writing position. */
	snippets: UserSnippet[];
}

export const DEFAULT_SETTINGS: SlashosaurusSettings = {
	triggerChar: "/",
	dateFormat: "YYYY-MM-DD",
	snippets: [],
};

/** Structural host interface — avoids a settings.ts ↔ main.ts import cycle. */
export interface SettingsHost extends Plugin {
	settings: SlashosaurusSettings;
	/** Immediate write. */
	saveSettings(): Promise<void>;
	/** Debounced write — for per-keystroke edits. */
	requestSave: Debouncer<[], void>;
	/** Re-apply anything derived from settings (catalog with snippets, trigger). */
	onSettingsChanged(): void;
}

const HEADS_UP = {
	name: "Heads-up",
	desc: 'If Obsidian\'s core "Slash commands" plugin is enabled, two menus will open on "/". Disable it under Settings → Core plugins, or pick a different trigger character below.',
};
const TRIGGER = {
	name: "Trigger character",
	desc: "The character that opens the menu. Must be a single character.",
};
const DATE_FORMAT = { name: "Date format" };
const SNIPPETS_INTRO =
	"Your own blocks for the menu. Put {cursor} where writing should continue; without it the cursor lands at the end.";

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

	// ── Declarative path (1.13+) ────────────────────────────────────────

	getSettingDefinitions(): SettingDefinitionItem[] {
		const settings = this.host.settings;
		return [
			{ ...HEADS_UP },
			{
				...TRIGGER,
				control: {
					type: "text",
					key: "triggerChar",
					placeholder: DEFAULT_SETTINGS.triggerChar,
					defaultValue: DEFAULT_SETTINGS.triggerChar,
					validate: (value: string) =>
						value.trim().length === 1 ? undefined : "Must be a single character.",
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
					name: snippet.name || `Snippet ${index + 1}`,
					render: (setting: Setting) => {
						setting.setDesc(validateSnippet(snippet) ?? "");
						this.addSnippetControls(setting, snippet);
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
			settings.triggerChar = String(value).trim();
		} else if (key === "dateFormat") {
			settings.dateFormat = String(value).trim() || DEFAULT_SETTINGS.dateFormat;
		} else {
			return;
		}
		this.persist();
		// Refresh the live "Currently: …" preview in the date format desc —
		// debounced, so typing a format doesn't re-render per keystroke.
		if (key === "dateFormat") this.refreshDefinitionsSoon();
	}

	/** Name + template controls for one snippet row — shared by both paths. */
	private addSnippetControls(setting: Setting, snippet: UserSnippet): void {
		setting
			.addText((text) =>
				text
					.setPlaceholder("Name")
					.setValue(snippet.name)
					.onChange((value) => {
						snippet.name = value;
						this.persist();
					}),
			)
			.addTextArea((area) =>
				area
					.setPlaceholder("Template with {cursor}")
					.setValue(snippet.template)
					.onChange((value) => {
						snippet.template = value;
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

		new Setting(containerEl).setName(HEADS_UP.name).setDesc(HEADS_UP.desc);

		new Setting(containerEl)
			.setName(TRIGGER.name)
			.setDesc(TRIGGER.desc)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.triggerChar)
					.setValue(settings.triggerChar)
					.onChange((value) => {
						const char = value.trim();
						if (char.length !== 1) return;
						settings.triggerChar = char;
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
				.setName(snippet.name || `Snippet ${index + 1}`)
				.setDesc(validateSnippet(snippet) ?? "");
			this.addSnippetControls(row, snippet);
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
		return `Format for the "Today's date" block — tokens like YYYY, MM, DD, HH, mm (literal text in [brackets]). Currently: ${formatDate(new Date(), format)}`;
	}
}
