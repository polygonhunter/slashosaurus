import { Platform } from "obsidian";

/**
 * The gliding selection pill: a single absolutely positioned element inside
 * Obsidian's scrolling suggestion list that slides behind whichever item
 * carries .is-selected. Purely additive — if the expected DOM isn't there,
 * the CSS fallback highlight takes over.
 */
export class SelectionPill {
	private pillEl: HTMLElement | null = null;
	private listEl: HTMLElement | null = null;
	private observer: MutationObserver | null = null;
	/** Pending animation frame for a batched update(), or 0. */
	private frame = 0;
	/** Window that owns the list — a popout's own, not the main window, whose
	 *  frames are throttled while it is minimized or hidden. */
	private win: Window = window;

	/** Idempotent; call freely on every render pass. */
	mount(containerEl: HTMLElement): void {
		if (Platform.isMobile) {
			// No pill on touch devices — but the selected row still needs the
			// fallback highlight (tablets are not body.is-phone).
			containerEl.addClass("slashosaurus-no-pill");
			return;
		}
		if (this.pillEl && this.pillEl.isConnected) return;
		this.destroy();
		const listEl = containerEl.querySelector<HTMLElement>(".suggestion");
		if (!listEl) {
			containerEl.addClass("slashosaurus-no-pill");
			return;
		}
		this.listEl = listEl;
		this.win = listEl.win;
		this.pillEl = listEl.createDiv({ cls: "slashosaurus-pill is-teleporting" });
		this.observer = new MutationObserver((records) => {
			// The pill's own class flips (is-teleporting) are no news.
			if (records.every((r) => r.target === this.pillEl)) return;
			this.scheduleUpdate();
		});
		this.observer.observe(listEl, {
			attributes: true,
			attributeFilter: ["class"],
			subtree: true,
			childList: true,
		});
		this.update();
	}

	/** Arrow keys and re-renders fire bursts of mutations; measure at most
	 *  once per frame. */
	private scheduleUpdate(): void {
		if (this.frame !== 0) return;
		this.frame = this.win.requestAnimationFrame(() => {
			this.frame = 0;
			this.update();
		});
	}

	private update(): void {
		const pill = this.pillEl;
		const list = this.listEl;
		if (!pill || !list) return;
		if (!pill.isConnected) {
			// Obsidian re-rendered the list and dropped us; remount lazily.
			list.appendChild(pill);
			pill.addClass("is-teleporting");
		}
		const selected = list.querySelector<HTMLElement>(".suggestion-item.is-selected");
		const row = selected ? selected.querySelector<HTMLElement>(".slashosaurus-row") : null;
		if (!selected || !row) {
			pill.setCssStyles({ opacity: "0" });
			return;
		}
		// Measure the row, not the item — group overlines must stay outside.
		pill.setCssStyles({
			opacity: "1",
			transform: `translateY(${selected.offsetTop + row.offsetTop}px)`,
			height: `${row.offsetHeight}px`,
		});
		if (pill.hasClass("is-teleporting")) {
			// Two frames: land instantly first, then transitions come back on.
			const win = this.win;
			win.requestAnimationFrame(() => {
				win.requestAnimationFrame(() => pill.removeClass("is-teleporting"));
			});
		}
	}

	destroy(): void {
		if (this.frame !== 0) {
			this.win.cancelAnimationFrame(this.frame);
			this.frame = 0;
		}
		this.observer?.disconnect();
		this.observer = null;
		this.pillEl?.remove();
		this.pillEl = null;
		this.listEl = null;
	}
}
