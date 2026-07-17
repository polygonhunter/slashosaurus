import type { Extension } from "@codemirror/state";
import { EditorView, type ViewUpdate } from "@codemirror/view";

/**
 * When text is selected and the user types the trigger character, CodeMirror
 * replaces the selection with that character before onTrigger ever runs — the
 * selection is gone. This update listener watches for exactly that shape of
 * transaction ("one trigger character replaced a non-empty range") and stashes
 * the replaced text so the suggest can wrap it. Any other edit clears the
 * stash; the suggest grabs it into its own session state immediately.
 */

export interface SelectionStash {
	text: string;
	/** Document offset where the trigger character now sits. */
	atOffset: number;
	time: number;
}

export class SelectionStashTracker {
	private stash: SelectionStash | null = null;

	constructor(private readonly getTriggerChar: () => string) {}

	extension(): Extension {
		return EditorView.updateListener.of((update: ViewUpdate) => {
			if (!update.docChanged) return;
			const trigger = this.getTriggerChar();
			update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
				if (inserted.toString() === trigger && toA > fromA) {
					this.stash = {
						text: update.startState.sliceDoc(fromA, toA),
						atOffset: fromA,
						time: Date.now(),
					};
				} else {
					this.stash = null;
				}
			});
		});
	}

	/** Return the stashed text if it belongs to a trigger at this offset. */
	consume(triggerOffset: number): string | null {
		const stash = this.stash;
		this.stash = null;
		if (!stash) return null;
		if (stash.atOffset !== triggerOffset) return null;
		if (Date.now() - stash.time > 2000) return null;
		return stash.text;
	}

	clear(): void {
		this.stash = null;
	}
}
