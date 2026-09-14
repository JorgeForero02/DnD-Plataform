import { BadRequestException } from "@nestjs/common";
import type { Entity, EntityVisibilityGrant, Prisma } from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";
import type { GameEventsService } from "../game-events/game-events.service";
import { canView, comoRecursoVisible, POR_DEBAJO_DE_LA_MESA, type Viewer } from "./visibility";

// PNJ del mundo y la mesa (2026-09-14, spec §3.1 y §4) — **el único sitio que sabe dos cosas
// sobre `Character.entityId`**: qué fichas pueden ser el «mundo» de un cuerpo, y a quién se le
// enseña el enlace. Las dos puertas de escritura (`PATCH /characters/:id`, `POST /npcs`) validan
// con la primera; las seis lecturas que devuelven `entityId` redactan con la segunda.

type Db = Prisma.TransactionClient | PrismaService;
type EntityWithGrants = Entity & { grants: EntityVisibilityGrant[] };

export const ENTITY_NOT_NPC_MESSAGE =
  "Esa ficha del mundo no existe en esta campaña o no es un PNJ.";

/** 400 si la ficha no existe, es de otra campaña o no es `type: NPC`. Devuelve la ficha con sus concesiones. */
export async function requireNpcEntity(
  db: Db,
  campaignId: string,
  entityId: string,
): Promise<EntityWithGrants> {
  const entity = await db.entity.findFirst({
    where: { id: entityId, campaignId, type: "NPC" },
    include: { grants: true },
  });
  if (!entity) throw new BadRequestException(ENTITY_NOT_NPC_MESSAGE);
  return entity;
}

/**
 * De una lista de `entityId` (con nulos), las fichas que ESTE espectador puede ver. Una consulta
 * para toda la lista. **La existencia del enlace no puede filtrar que «Alguien» es Garrik**: quien
 * no ve la ficha recibe `entityId: null`.
 */
export async function entityIdsVisibleFor(
  db: Db,
  viewer: Viewer,
  ids: (string | null | undefined)[],
): Promise<Set<string>> {
  const unicos = [...new Set(ids.filter((id): id is string => !!id))];
  if (unicos.length === 0) return new Set();
  const fichas = await db.entity.findMany({
    where: { id: { in: unicos } },
    include: { grants: true },
  });
  return new Set(fichas.filter((f) => canView(viewer, comoRecursoVisible(f))).map((f) => f.id));
}

/** `{ ...fila, entityId }` redactado contra el conjunto visible. */
export function conEntityIdVisible<T extends { entityId: string | null }>(
  fila: T,
  visibles: Set<string>,
): T {
  return { ...fila, entityId: fila.entityId && visibles.has(fila.entityId) ? fila.entityId : null };
}

/** Parámetros de {@link raiseLiveBodies}. */
export interface RaiseLiveBodiesParams {
  campaignId: string;
  /** La ficha del mundo que acaba de subir a `PLAYERS`/`PUBLIC`. */
  entityId: string;
  entityName: string;
  /** Quien hizo la acción que reveló la ficha — el `actorUserId` del `NPC_REVEALED`. */
  userId: string;
}

/**
 * **Revelar una ficha del mundo sube todos sus cuerpos vivos** (spec §3.2, E-PM-5): la instancia
 * de `Character` con ese `entityId`, de la campaña, sin archivar, que siga por debajo de la mesa.
 * Un cuerpo derrotado sigue en el orden de turnos como «Cayó»; dejarlo oculto mientras su ficha
 * se revela sería un hueco en la lista que el jugador puede contar.
 *
 * **Extraída en I3 (ola de cierre, 2026-09-14).** Vivía inline, una sola vez, dentro de
 * `EntitiesService.update` — hasta que la revisión de cierre encontró la TERCERA puerta de
 * revelar una ficha (`REVEAL_ENTITY` del motor de reglas, `rules-engine.service.ts`) escribiendo
 * su propia visibilidad y su propio `ENTITY_REVEALED` sin pasar por aquí: una regla revelaba la
 * ficha y dejaba el cuerpo oculto en el orden de turnos, justo el hueco que E-PM-5 dice cerrar.
 * Ahora es el único sitio que sube cuerpos vivos, y los dos caminos (`EntitiesService.update` y
 * el `case "REVEAL_ENTITY"` del motor) lo llaman.
 *
 * **`updateMany` condicional, uno por cuerpo, no una foto y un `update` a ciegas** (m2, misma
 * ola): dos caminos que revelan la misma ficha a la vez pasarían los dos el `findMany` de arriba;
 * el `count` de cada `updateMany` dice quién de verdad la subió, y solo ese escribe su
 * `NPC_REVEALED`.
 */
export async function raiseLiveBodies(
  tx: Prisma.TransactionClient,
  { campaignId, entityId, entityName, userId }: RaiseLiveBodiesParams,
  gameEvents: GameEventsService,
  /**
   * Igual que `record`/`recordFromEngine`: de dónde viene la llamada, para que el `NPC_REVEALED`
   * que se escribe aquí lleve la misma marca que el `ENTITY_REVEALED` que lo acompaña y el motor
   * de reglas no confunda su propio eco con un hecho del mundo.
   */
  options?: { fromRulesEngine?: boolean },
): Promise<void> {
  const cuerpos = await tx.character.findMany({
    where: {
      entityId,
      campaignId,
      archivedAt: null,
      visibility: { in: POR_DEBAJO_DE_LA_MESA },
    },
    select: { id: true, name: true, visibility: true },
  });
  for (const cuerpo of cuerpos) {
    const { count } = await tx.character.updateMany({
      where: { id: cuerpo.id, visibility: { in: POR_DEBAJO_DE_LA_MESA } },
      data: { visibility: "PLAYERS" },
    });
    if (count !== 1) continue; // otra transacción ganó la carrera por este cuerpo.
    await gameEvents.record(
      userId,
      campaignId,
      {
        subjectType: "character",
        subjectId: cuerpo.id,
        visibility: "PLAYERS",
        payload: { type: "NPC_REVEALED", characterName: cuerpo.name, entityName },
      },
      tx,
      options,
    );
  }
}
