import { debounce, Plugin } from "obsidian";
import { CATALOG } from "./core/catalog";
import { defaultSettings, normalizeSettings, pushRecent } from "./core/settings-normalize";
import { snippetsToBlockDefs } from "./core/snippets";
import type { BlockDef } from "./core/types";
import { SlashosaurusSettingTab, type SlashosaurusSettings } from "./settings";
import { SelectionStashTracker } from "./suggest/selection-stash";
import { SlashSuggest } from "./suggest/slash-suggest";

export default class SlashosaurusPlugin extends Plugin {
	settings: SlashosaurusSettings = defaultSettings();

	/** Coalesces bursts of edits (typing in a settings field) into one
	 *  data.json write once the user pauses. */
	readonly requestSave = debounce(
		() => {
			this.saveData(this.settings).catch((error) => {
				console.error("Slashosaurus: could not save settings", error);
			});
		},
		400,
		true,
	);

	private settingTab: SlashosaurusSettingTab | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();
		const stashTracker = new SelectionStashTracker(() => this.settings.triggerChar);
		this.registerEditorExtension(stashTracker.extension());
		const suggest = new SlashSuggest(this.app, this, stashTracker);
		this.registerEditorSuggest(suggest);
		// An open popover (and its pill observer) must not outlive the plugin.
		this.register(() => suggest.close());
		this.settingTab = new SlashosaurusSettingTab(this.app, this);
		this.addSettingTab(this.settingTab);
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

	/** data.json changed on disk (Sync, Git, iCloud). Adopt it — otherwise
	 *  the next debounced save (e.g. after an insert updates "recent") would
	 *  write the stale in-memory state back over the newer file. */
	async onExternalSettingsChange(): Promise<void> {
		this.requestSave.cancel();
		await this.loadSettings();
		this.onSettingsChanged();
		// An open tab still edits the replaced settings object — redraw it.
		this.settingTab?.refreshIfOpen();
	}

	onunload(): void {
		// Don't lose the last keystrokes if the plugin is disabled mid-typing.
		this.requestSave.run();
	}

	/** Built-in catalog plus the user's snippets (rankBlocks groups them). */
	private blockDefs: readonly BlockDef[] | null = null;

	/** Cached per settings state, so typing in the editor doesn't rebuild the
	 *  snippet defs on every keystroke. Plugin availability is NOT baked in —
	 *  the suggest filters that per trigger, since plugins come and go. */
	getBlockDefs(): readonly BlockDef[] {
		if (this.blockDefs === null) {
			this.blockDefs = [...CATALOG, ...snippetsToBlockDefs(this.settings.snippets)];
		}
		return this.blockDefs;
	}

	/** Remember an inserted block for the "Recent" group. Debounced write —
	 *  a burst of inserts costs one save. */
	recordRecent(id: string): void {
		if (this.settings.recent[0] === id) return;
		this.settings.recent = pushRecent(this.settings.recent, id);
		this.requestSave();
	}

	/** Called by the settings tab after every change: drops derived caches. */
	onSettingsChanged(): void {
		this.blockDefs = null;
	}
}
