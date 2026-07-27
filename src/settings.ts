import {
	PluginSettingTab,
	Setting,
	type App,
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
	saveSettings(): Promise<void>;
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

	private async persist(): Promise<void> {
		await this.host.saveSettings();
		this.host.onSettingsChanged();
	}

	/** Re-render/re-index the declarative tab. Only ever invoked from the
	 *  declarative callbacks (1.13+), but guarded structurally so it is a
	 *  no-op instead of a TypeError on apps without update(). */
	private refreshDefinitions(): void {
		(this as { update?: () => void }).update?.();
	}

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
					void this.persist().then(() => this.refreshDefinitions());
				},
				onReorder: (oldIndex: number, newIndex: number) => {
					const [moved] = settings.snippets.splice(oldIndex, 1);
					if (moved === undefined) return;
					settings.snippets.splice(newIndex, 0, moved);
					void this.persist().then(() => this.refreshDefinitions());
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
		await this.persist();
		// Refresh the live "Currently: …" preview in the date format desc.
		if (key === "dateFormat") this.refreshDefinitions();
	}

	/** Name + template controls for one snippet row — shared by both paths. */
	private addSnippetControls(setting: Setting, snippet: UserSnippet): void {
		setting
			.addText((text) =>
				text
					.setPlaceholder("Name")
					.setValue(snippet.name)
					.onChange(async (value) => {
						snippet.name = value;
						await this.persist();
					}),
			)
			.addTextArea((area) =>
				area
					.setPlaceholder("Template with {cursor}")
					.setValue(snippet.template)
					.onChange(async (value) => {
						snippet.template = value;
						await this.persist();
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
					.onChange(async (value) => {
						const char = value.trim();
						if (char.length !== 1) return;
						settings.triggerChar = char;
						await this.persist();
					}),
			);

		new Setting(containerEl)
			.setName(DATE_FORMAT.name)
			.setDesc(this.dateFormatDesc(settings.dateFormat))
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.dateFormat)
					.setValue(settings.dateFormat)
					.onChange(async (value) => {
						settings.dateFormat = value.trim() || DEFAULT_SETTINGS.dateFormat;
						await this.persist();
						this.renderLegacy();
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
						await this.persist();
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
