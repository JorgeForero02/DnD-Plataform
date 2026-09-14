import { BadRequestException } from "@nestjs/common";
import type { Entity, EntityVisibilityGrant, Prisma } from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";
import { canView, comoRecursoVisible, type Viewer } from "./visibility";

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
