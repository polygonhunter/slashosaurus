import type { BlockDef } from "./types";

/** The environment capabilities the catalog filter needs, injected so core
 *  stays pure (production wires app.plugins / app.commands, tests a stub). */
export interface PluginCapabilities {
	isPluginEnabled(id: string): boolean;
	/** Optional: whether a command id is registered. When absent, command
	 *  entries are judged by their plugin alone. */
	hasCommand?(id: string): boolean;
}

/** Drop defs whose requiresPlugin is not installed and enabled, and command
 *  entries whose command doesn't exist (e.g. renamed in a plugin update). A
 *  group whose defs all vanish leaves no trace — no overline label, no dead
 *  rows. */
export function filterAvailable(
	defs: readonly BlockDef[],
	caps: PluginCapabilities,
): BlockDef[] {
	return defs.filter((def) => {
		if (def.requiresPlugin !== undefined && !caps.isPluginEnabled(def.requiresPlugin)) {
			return false;
		}
		if (def.commandId !== undefined && caps.hasCommand && !caps.hasCommand(def.commandId)) {
			return false;
		}
		return true;
	});
}
