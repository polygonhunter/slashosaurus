import { Plugin } from "obsidian";
import {
	DEFAULT_SETTINGS,
	SlashosaurusSettingTab,
	type SlashosaurusSettings,
} from "./settings";
import { SelectionStashTracker } from "./suggest/selection-stash";
import { SlashSuggest } from "./suggest/slash-suggest";

export default class SlashosaurusPlugin extends Plugin {
	settings: SlashosaurusSettings = { ...DEFAULT_SETTINGS };

	async onload(): Promise<void> {
		await this.loadSettings();
		const stashTracker = new SelectionStashTracker(() => this.settings.triggerChar);
		this.registerEditorExtension(stashTracker.extension());
		this.registerEditorSuggest(new SlashSuggest(this.app, this, stashTracker));
		this.addSettingTab(new SlashosaurusSettingTab(this.app, this));
	}

	async loadSettings(): Promise<void> {
		const stored: unknown = await this.loadData();
		this.settings = { ...DEFAULT_SETTINGS, ...(stored as Partial<SlashosaurusSettings>) };
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	onSettingsChanged(): void {
		// The suggest reads settings through the host on every trigger, so
		// nothing needs to be rebuilt eagerly (yet).
	}
}
