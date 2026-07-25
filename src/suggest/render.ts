import { setIcon } from "obsidian";
import { CALLOUTS } from "../core/callouts";
import type { BlockDef, TileSpec } from "../core/types";

/**
 * DOM for one menu row: preview tile on the left, name + aliases on the
 * right, optionally topped by a group overline. The tile is the point of the
 * plugin — it shows what the block will look like, in the theme's own colors.
 */
export function renderBlockItem(def: BlockDef, el: HTMLElement, groupLabel?: string): void {
	el.addClass("slashosaurus-item");
	if (groupLabel) {
		el.addClass("slashosaurus-has-group");
		el.createDiv({ cls: "slashosaurus-group", text: groupLabel });
	}
	const row = el.createDiv({ cls: "slashosaurus-row" });
	renderTile(row, def.tile);
	const label = row.createDiv({ cls: "slashosaurus-label" });
	label.createDiv({ cls: "slashosaurus-name", text: def.name });
	const hints = def.aliases.filter((a) => a !== def.name.toLowerCase()).slice(0, 3);
	if (hints.length > 0) {
		label.createDiv({ cls: "slashosaurus-alias", text: hints.join(" · ") });
	}
}

/** DOM for a language row in the code block's second stage. */
export function renderLanguageItem(language: string, el: HTMLElement): void {
	el.addClass("slashosaurus-item");
	const row = el.createDiv({ cls: "slashosaurus-row" });
	const tile = row.createDiv({ cls: "slashosaurus-tile mod-code" });
	tile.createSpan({ cls: "slashosaurus-tile-mono", text: "```" });
	const label = row.createDiv({ cls: "slashosaurus-label" });
	label.createDiv({ cls: "slashosaurus-name", text: language });
}

function renderTile(row: HTMLElement, spec: TileSpec): void {
	const tile = row.createDiv({ cls: "slashosaurus-tile" });
	switch (spec.kind) {
		case "callout": {
			tile.addClasses(["mod-callout", `mod-callout-${spec.calloutType}`]);
			if (spec.emoji) {
				tile.createSpan({ cls: "slashosaurus-tile-emoji", text: spec.emoji });
			} else {
				const iconEl = tile.createDiv({ cls: "slashosaurus-tile-icon" });
				setIcon(iconEl, calloutIcon(spec.calloutType));
			}
			tile.createSpan({
				cls: "slashosaurus-tile-callout-name",
				text:
					spec.label ??
					spec.calloutType.charAt(0).toUpperCase() + spec.calloutType.slice(1),
			});
			break;
		}
		case "heading":
			tile.addClasses(["mod-heading", `mod-h${spec.level}`]);
			tile.createSpan({ text: `H${spec.level}` });
			break;
		case "quote":
			tile.addClass("mod-quote");
			tile.createSpan({ text: "Aa" });
			break;
		case "mono":
			tile.addClass("mod-code");
			tile.createSpan({ cls: "slashosaurus-tile-mono", text: spec.sample });
			break;
		case "list": {
			tile.addClass("mod-list");
			for (const lineNo of [0, 1]) {
				const line = tile.createDiv({ cls: "slashosaurus-tile-line" });
				if (spec.marker === "bullet") {
					line.createSpan({ cls: "slashosaurus-tile-marker", text: "•" });
				} else if (spec.marker === "number") {
					line.createSpan({ cls: "slashosaurus-tile-marker", text: `${lineNo + 1}.` });
				} else {
					line.createDiv({ cls: "slashosaurus-tile-checkbox" });
				}
				line.createDiv({ cls: "slashosaurus-tile-bar" });
			}
			break;
		}
		case "table": {
			tile.addClass("mod-table");
			const grid = tile.createDiv({ cls: "slashosaurus-tile-grid" });
			for (let i = 0; i < 4; i++) grid.createDiv();
			break;
		}
		case "divider":
			tile.addClass("mod-divider");
			tile.createDiv({ cls: "slashosaurus-tile-hr" });
			break;
		case "emoji":
			tile.addClass("mod-icon");
			tile.createSpan({ cls: "slashosaurus-tile-emoji", text: spec.char });
			break;
		case "icon": {
			tile.addClass("mod-icon");
			const iconEl = tile.createDiv({ cls: "slashosaurus-tile-icon" });
			setIcon(iconEl, spec.icon);
			break;
		}
	}
}

function calloutIcon(type: string): string {
	return CALLOUTS.find((c) => c.type === type)?.icon ?? "lucide-pencil";
}
