import type { Extension } from "@codemirror/state";
import { EditorView, type ViewUpdate } from "@codemirror/view";

/**
 * When text is selected and the user types the trigger character, CodeMirror
 * replaces the selection with that character before onTrigger ever runs — the
 * selection is gone. This update listener watches for exactly that shape of
 * transaction ("one trigger character typed over a non-empty range") and
 * stashes the replaced text so the suggest can wrap it. Any other edit clears
 * the stash; the suggest grabs it into its own session state immediately.
 */

interface SelectionStash {
	text: string;
	/** Document offset where the trigger character now sits. */
	atOffset: number;
}

export class SelectionStashTracker {
	private stash: SelectionStash | null = null;

	constructor(private readonly getTriggerChar: () => string) {}

	extension(): Extension {
		return EditorView.updateListener.of((update: ViewUpdate) => {
			if (!update.docChanged) return;
			// Only input counts. Undo, redo and programmatic edits produce the
			// same shape — undoing a block inserted from a bare "/" swaps the
			// block back for "/" — but what they replace is no selection.
			const typed = update.transactions.some((tr) => tr.isUserEvent("input"));
			const trigger = this.getTriggerChar();
			update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
				// Cheap checks first: this runs on every document change, and
				// almost none of them replace a range with exactly the trigger.
				if (
					typed &&
					toA > fromA &&
					inserted.length === trigger.length &&
					inserted.sliceString(0) === trigger
				) {
					this.stash = {
						text: update.startState.sliceDoc(fromA, toA),
						atOffset: fromA,
					};
				} else if (this.stash !== null) {
					this.stash = null;
				}
			});
		});
	}

	/** Return the stashed text if it belongs to a trigger at this offset. */
	consume(triggerOffset: number): string | null {
		const stash = this.stash;
		this.stash = null;
		if (!stash || stash.atOffset !== triggerOffset) return null;
		return stash.text;
	}

	clear(): void {
		this.stash = null;
	}
}
