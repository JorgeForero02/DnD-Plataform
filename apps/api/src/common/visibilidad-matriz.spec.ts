import { QUIEN_VE, type Visibility } from "@dnd/shared";
import { canView, type Viewer, type ViewableResource } from "./visibility";

// Ficha 23 — la matriz declarada en `@dnd/shared` (`QUIEN_VE`) se compara aquí contra `canView`,
// el dueño único de la regla. Si alguien cambia un booleano de la matriz sin que `canView` haga lo
// mismo (o al revés), esta prueba enrojece — es la comprobación que faltaba y que dejó que el
// texto de la web mintiera una vez.

const CREADOR_ID = "creador-id";
const CONCEDIDO_ID = "concedido-id";
const OTRO_JUGADOR_ID = "otro-jugador-id";

function recurso(visibility: Visibility): ViewableResource {
  return {
    visibility,
    createdById: CREADOR_ID,
    grantedUserIds: [CONCEDIDO_ID],
  };
}

const ESPECTADORES: Record<keyof (typeof QUIEN_VE)["PUBLIC"], Viewer> = {
  noMiembro: { userId: "no-miembro-id", role: null, isAdmin: false },
  jugador: { userId: OTRO_JUGADOR_ID, role: "PLAYER", isAdmin: false },
  jugadorConcedido: { userId: CONCEDIDO_ID, role: "PLAYER", isAdmin: false },
  creador: { userId: CREADOR_ID, role: "PLAYER", isAdmin: false },
  dm: { userId: "dm-id", role: "DM", isAdmin: false },
};

const NIVELES: Visibility[] = ["PUBLIC", "PLAYERS", "SPECIFIC_PLAYERS", "OWNER_DM", "DM_ONLY"];

describe("QUIEN_VE (packages/shared) coincide con canView (apps/api)", () => {
  for (const nivel of NIVELES) {
    for (const archetipo of Object.keys(ESPECTADORES) as (keyof typeof ESPECTADORES)[]) {
      it(`${nivel} × ${archetipo} → ${QUIEN_VE[nivel][archetipo]}`, () => {
        const esperado = QUIEN_VE[nivel][archetipo];
        const visto = canView(ESPECTADORES[archetipo], recurso(nivel));
        expect(visto).toBe(esperado);
      });
    }
  }
});
