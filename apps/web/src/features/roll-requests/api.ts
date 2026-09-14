import type {
  CreateRollRequestInput,
  EffectApplied,
  RollAudience,
  RollMode,
  RollResult,
} from "@dnd/shared";
import { apiFetch } from "../../lib/api";

// Tarea 2C.5 — el cliente HTTP de «el DM pide una tirada y al jugador le aparece».
//
// `apiFetch` es el único que habla HTTP (docs/04-convenciones.md); este fichero es la única
// puerta de esta feature hacia `apps/api/src/roll-requests/`. **No se toca la API.**

/**
 * Una petición tal y como la devuelve el servidor (`model RollRequest`, schema.prisma).
 *
 * **El filtro de quién ve qué lo hace el servidor** (`RollRequestsService.list`: el DM ve las de
 * la campaña, un jugador solo las de sus personajes). Aquí no se esconde ninguna fila: lo que no
 * se puede ver, no viaja — que es la misma regla que gobierna el registro de tiradas.
 */
export interface RollRequestRow {
  id: string;
  campaignId: string;
  characterId: string;
  requestedById: string;
  /** Qué valor de la hoja se pide: `skill.perception`, `save.dex`. **No una expresión.** */
  key: string;
  /** La frase del DM: «Percepción para ver si oís al posadero». */
  label: string;
  dc: number | null;
  mode: RollMode;
  audience: RollAudience;
  createdAt: string;
  /** `null` = pendiente. Es lo que sondea la pantalla. */
  resolvedAt: string | null;
  resolvedEventId: string | null;
  /**
   * De qué encuentro salió, o `null` si no salió de ninguno (`schema.prisma`, `RollRequest`).
   *
   * **El servidor ya lo manda** — `RollRequestsService.list` hace un `findMany` sin `select`,
   * así que el campo viaja desde siempre — pero este tipo, escrito a mano, no lo declaraba.
   * Sin él, la sala de espera de un encuentro (tarea 8, 2026-09-05) no tenía forma de saber
   * cuáles de las peticiones pendientes de la campaña son las SUYAS: cualquier petición de
   * percepción abierta en otra sesión habría contado como alguien sin tirar iniciativa.
   */
  encounterId: string | null;
  /**
   * Ronda de arreglo 1 (tarea 9) — el modificador con el que se va a tirar, **calculado por el
   * servidor** (`RollRequestsService.list`, la misma función privada que usa `answer()` para
   * tirar de verdad). `null` cuando la hoja de ese personaje no deriva —le faltan características,
   * raza o clase— y también en cualquier petición ya respondida, que no tiene «antes de tirar» que
   * enseñar.
   *
   * **Opcional y no obligatorio**, aunque el servidor lo manda siempre desde esta ronda: hay
   * fixtures de otras pantallas (`features/encounters`, `features/game-clock`) que construyen un
   * `RollRequestRow` a mano y son de otro carril de trabajo en este mismo árbol — declararlo
   * obligatorio les rompería el tipo sin tocar una sola línea suya. `undefined` se trata igual que
   * `null`: sin número.
   */
  modifier?: number | null;
}

export function fetchRollRequests(
  campaignId: string,
  query: { includeResolved?: boolean; encounterId?: string } = {},
): Promise<RollRequestRow[]> {
  const p = new URLSearchParams();
  p.set("includeResolved", String(query.includeResolved ?? false));
  // **`encounterId` viaja al servidor, no se filtra aquí** (paso 1, tarea 17). La lista sale con
  // `take: 50` por fecha descendente: con más de cincuenta pendientes de otro tipo, las de
  // iniciativa se caen de la página y la sala de espera lee «todos han tirado» sin que nadie haya
  // tirado. Filtrar en el cliente lo que el servidor ya recortó no puede recuperarlas.
  if (query.encounterId) p.set("encounterId", query.encounterId);
  return apiFetch<RollRequestRow[]>(`/campaigns/${campaignId}/roll-requests?${p.toString()}`);
}

/**
 * Pedir. Devuelve **una petición por personaje**, no una con varios dueños: así cada uno tira con
 * su modificador (`roll-request.schema.ts`). Solo el DM; el servidor da 403 a cualquier otro.
 */
export function createRollRequest(
  campaignId: string,
  input: CreateRollRequestInput,
): Promise<RollRequestRow[]> {
  return apiFetch<RollRequestRow[]>(`/campaigns/${campaignId}/roll-requests`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Responderla tirando. **Sin cuerpo**: qué se tira, con qué CD y quién lo ve ya lo dijo el DM.
 *
 * Se manda `{}` y no un cuerpo vacío de verdad por la trampa de siempre (features/entities/api.ts,
 * features/campaigns/members.ts): `apiFetch` siempre pone `Content-Type: application/json` y
 * Fastify responde 500 a esa cabecera con el cuerpo realmente vacío.
 */
export function answerRollRequest(
  campaignId: string,
  requestId: string,
  /**
   * **Gastar su inspiración en esta tirada** (plan 08, I8). Es lo único que decide quien responde:
   * qué se tira, con qué CD y quién lo ve lo dijo el DM al pedirla. SRD: se gasta en un ataque,
   * una salvación o una prueba, y una petición del DM es una de las dos últimas.
   */
  spendInspiration = false,
  // **La puerta de efectos** (§4.3): si la salvación respondida traía un efecto pendiente
  // (`RollRequest.pendingEffect`), el servidor lo aplica en la misma transacción y lo devuelve
  // aquí — `undefined` cuando no había nada que aplicar. El daño de una salvación se tira UNA
  // vez, no dos: al pedirla, no al responderla, y esto es lo que dice qué pasó de verdad.
): Promise<RollResult & { effectApplied?: EffectApplied }> {
  return apiFetch<RollResult & { effectApplied?: EffectApplied }>(
    `/campaigns/${campaignId}/roll-requests/${requestId}/roll`,
    {
      method: "POST",
      body: JSON.stringify({ spendInspiration }),
    },
  );
}

/** Una fila de la tabla «Typical Difficulty Classes» del SRD 5.1. El rótulo lo pone la pantalla. */
export interface FilaDeGuiaDeCd {
  key: string;
  dc: number;
}

/**
 * La guía de CD del SRD, que viaja dentro de `GET /catalog`.
 *
 * **Se pide con su propio tipo y su propia clave de consulta** en vez de ampliar el `Catalog` de
 * `features/character-sheet/api.ts`: aquel fichero es de otra feature y esta tarea no lo toca. Lo
 * que **no** se hace es reutilizar su clave `["catalog"]` con otra forma — dos consultas con la
 * misma clave y formas distintas ya tiraron la aplicación una vez (ver el comentario de
 * `useCatalogItems` en `features/inventory/hooks.ts`), así que esta cuelga de
 * `["catalog", "difficulty-classes"]`, que es una entrada de caché distinta.
 */
export async function fetchDifficultyClasses(): Promise<FilaDeGuiaDeCd[]> {
  const catalogo = await apiFetch<{ difficultyClasses?: FilaDeGuiaDeCd[] }>("/catalog");
  return catalogo.difficultyClasses ?? [];
}
