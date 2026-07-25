import type { BlockDef } from "./types";

/** The one environment capability the catalog filter needs, injected so core
 *  stays pure (production wires app.plugins.enabledPlugins, tests a stub). */
export interface PluginCapabilities {
	isPluginEnabled(id: string): boolean;
}

/** Drop defs whose requiresPlugin is not installed and enabled. A group whose
 *  defs all vanish leaves no trace — no overline label, no dead rows. */
export function filterAvailable(
	defs: readonly BlockDef[],
	caps: PluginCapabilities,
): BlockDef[] {
	return defs.filter(
		(def) => def.requiresPlugin === undefined || caps.isPluginEnabled(def.requiresPlugin),
	);
}
