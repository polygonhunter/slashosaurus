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

	/** Idempotent; call freely on every render pass. */
	mount(containerEl: HTMLElement): void {
		if (Platform.isMobile) return;
		if (this.pillEl && this.pillEl.isConnected) return;
		this.destroy();
		const listEl = containerEl.querySelector<HTMLElement>(".suggestion");
		if (!listEl) {
			containerEl.addClass("slashosaurus-no-pill");
			return;
		}
		this.listEl = listEl;
		this.pillEl = listEl.createDiv({ cls: "slashosaurus-pill is-teleporting" });
		this.observer = new MutationObserver(() => this.update());
		this.observer.observe(listEl, {
			attributes: true,
			attributeFilter: ["class"],
			subtree: true,
			childList: true,
		});
		this.update();
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
			window.requestAnimationFrame(() => {
				window.requestAnimationFrame(() => pill.removeClass("is-teleporting"));
			});
		}
	}

	destroy(): void {
		this.observer?.disconnect();
		this.observer = null;
		this.pillEl?.remove();
		this.pillEl = null;
		this.listEl = null;
	}
}
