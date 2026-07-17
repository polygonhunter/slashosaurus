import { PluginSettingTab, Setting, type App, type Plugin } from "obsidian";
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

/**
 * Imperative settings tab — deliberately NOT the 1.13 declarative API, so one
 * code path serves every app version from minAppVersion up.
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

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		const settings = this.host.settings;

		new Setting(containerEl)
			.setName("Heads-up")
			.setDesc(
				'If Obsidian\'s core "Slash commands" plugin is enabled, two menus will open on "/". Disable it under Settings → Core plugins, or pick a different trigger character below.',
			);

		new Setting(containerEl)
			.setName("Trigger character")
			.setDesc("The character that opens the menu. Must be a single character.")
			.addText((text) =>
				text
					.setPlaceholder("/")
					.setValue(settings.triggerChar)
					.onChange(async (value) => {
						const char = value.trim();
						if (char.length !== 1) return;
						settings.triggerChar = char;
						await this.persist();
					}),
			);

		new Setting(containerEl)
			.setName("Date format")
			.setDesc(this.dateFormatDesc(settings.dateFormat))
			.addText((text) =>
				text
					.setPlaceholder("YYYY-MM-DD")
					.setValue(settings.dateFormat)
					.onChange(async (value) => {
						settings.dateFormat = value.trim() || DEFAULT_SETTINGS.dateFormat;
						await this.persist();
						this.display();
					}),
			);

		new Setting(containerEl).setName("Snippets").setHeading();

		new Setting(containerEl).setDesc(
			"Your own blocks for the menu. Put {cursor} where writing should continue; without it the cursor lands at the end.",
		);

		settings.snippets.forEach((snippet, index) => {
			const problem = validateSnippet(snippet);
			new Setting(containerEl)
				.setName(snippet.name || `Snippet ${index + 1}`)
				.setDesc(problem ?? "")
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
				)
				.addExtraButton((button) =>
					button
						.setIcon("x")
						.setTooltip("Remove")
						.onClick(async () => {
							settings.snippets.splice(index, 1);
							await this.persist();
							this.display();
						}),
				);
		});

		new Setting(containerEl).addButton((button) =>
			button.setButtonText("Add snippet").onClick(() => {
				settings.snippets.push({ name: "", template: "" });
				this.display();
			}),
		);
	}

	private dateFormatDesc(format: string): string {
		return `Format for the "Today's date" block — tokens like YYYY, MM, DD, HH, mm (literal text in [brackets]). Currently: ${formatDate(new Date(), format)}`;
	}
}
