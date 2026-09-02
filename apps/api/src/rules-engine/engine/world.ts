import type { WorldSnapshot } from "./types";

/** Un mundo vacío, listo para que un test o el servicio sobrescriban solo lo que necesitan. */
export function emptyWorld(overrides: Partial<WorldSnapshot> = {}): WorldSnapshot {
  return {
    rulesEnabled: true,
    sessionNumber: null,
    allPlayersPresent: false,
    flags: {},
    sets: {},
    entityTags: {},
    entityExists: {},
    entityVisibility: {},
    revealedEntityIds: [],
    sessionNotes: [],
    ruleArmed: {},
    ruleFireCounts: {},
    ...overrides,
  };
}
