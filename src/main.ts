import { debounce, Plugin } from "obsidian";
import { defaultSettings, normalizeSettings } from "./core/settings-normalize";
import { SlashosaurusSettingTab, type SlashosaurusSettings } from "./settings";
import { SelectionStashTracker } from "./suggest/selection-stash";
import { SlashSuggest } from "./suggest/slash-suggest";

export default class SlashosaurusPlugin extends Plugin {
	settings: SlashosaurusSettings = defaultSettings();

	/** Coalesces bursts of edits (typing in a settings field) into one
	 *  data.json write once the user pauses. */
	readonly requestSave = debounce(() => void this.saveData(this.settings), 400, true);

	async onload(): Promise<void> {
		await this.loadSettings();
		const stashTracker = new SelectionStashTracker(() => this.settings.triggerChar);
		this.registerEditorExtension(stashTracker.extension());
		const suggest = new SlashSuggest(this.app, this, stashTracker);
		this.registerEditorSuggest(suggest);
		// An open popover (and its pill observer) must not outlive the plugin.
		this.register(() => suggest.close());
		this.addSettingTab(new SlashosaurusSettingTab(this.app, this));
	}

	async loadSettings(): Promise<void> {
		const stored: unknown = await this.loadData();
		// Validate field by field: a hand-edited or outdated data.json must not
		// produce a multi-character trigger or a non-array snippets list.
		this.settings = normalizeSettings(stored);
	}

	/** Write immediately (structural changes: delete, reorder). Any pending
	 *  debounced write is superseded by this one. */
	async saveSettings(): Promise<void> {
		this.requestSave.cancel();
		await this.saveData(this.settings);
	}

	onunload(): void {
		// Don't lose the last keystrokes if the plugin is disabled mid-typing.
		this.requestSave.run();
	}

	onSettingsChanged(): void {
		// The suggest reads settings through the host on every trigger, so
		// nothing needs to be rebuilt eagerly (yet).
	}
}
