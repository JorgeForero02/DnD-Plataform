import { BadRequestException } from "@nestjs/common";
import type { ContentRefInput, ResolvedItem } from "@dnd/shared";
import type { CampaignItem, Prisma } from "@prisma/client";
import { findSrdItem } from "../../rules/catalog/items-srd";
import { campaignItemToResolvedItem } from "../../campaign-items/campaign-item-to-resolved";
import { PrismaService } from "../../prisma/prisma.service";
import { comoRecursoVisible } from "../../common/visibility";

// Carril A4 — resolver un `ContentRef` (SRD o de campaña) a la forma única que consumen el
// inventario y la pantalla, `ResolvedItem` (`packages/shared/src/item.schema.ts`).
//
// La traducción de fila a objeto la hace `campaign-items/campaign-item-to-resolved.ts`, que es su
// dueño único: aquí solo se decide **de dónde sale la fila** (el catálogo del SRD, que es código,
// o la tabla de la campaña) y se traduce el fallo a un 400 con motivo. Los dos carriles paralelos
// de 2B escribieron su propia copia del mapeo dentro de su frontera; el orquestador las fundió al
// integrar, porque dos copias discrepan el día que el esquema gane una columna.

/** El objeto de campaña, ya traducido a `ResolvedItem`, junto con su visibilidad cruda. */
export interface ResolvedCampaignItem {
  resolved: ResolvedItem;
  visibility: CampaignItem["visibility"];
  createdById: string;
  grantedUserIds: string[];
}

/**
 * Resuelve una `ContentRef` a su `ResolvedItem`. Lanza 400 —nunca 500— cuando la clave del SRD
 * no existe o el objeto de campaña no está (o es de otra campaña): un objeto que no se puede
 * resolver es un dato de entrada malo, no un fallo del servidor (regla 7 del encargo).
 *
 * Para `CAMPAIGN`, además devuelve la visibilidad cruda y las concesiones nominales: quien llama
 * decide con eso si el dueño del personaje puede verlo (regla 6).
 */
export async function resolveContentRef(
  prisma: PrismaService,
  campaignId: string,
  ref: ContentRefInput,
  client: Prisma.TransactionClient | PrismaService = prisma,
): Promise<{ resolved: ResolvedItem; campaignItem?: ResolvedCampaignItem }> {
  if (ref.source === "SRD") {
    const item = findSrdItem(ref.key);
    if (!item) {
      throw new BadRequestException(`"${ref.key}" no es un objeto del catálogo del SRD.`);
    }
    return { resolved: item };
  }

  const row = await client.campaignItem.findFirst({
    where: { id: ref.id, campaignId },
    include: { grants: true },
  });
  if (!row) {
    throw new BadRequestException("Ese objeto de campaña no existe, o no es de esta campaña.");
  }
  const resolved = campaignItemToResolvedItem(row);
  return {
    resolved,
    campaignItem: {
      resolved,
      ...comoRecursoVisible(row),
    },
  };
}

/**
 * Resuelve el objeto que ya está en una fila del inventario (`srdKey` o `campaignItemId`), tal y
 * como quedó escrito al meterlo. Se usa para listar y para las comprobaciones de ranura/manos
 * sobre lo que YA se lleva puesto —nunca sobre lo que se está pidiendo—.
 */
export async function resolveInventoryRowItem(
  prisma: PrismaService,
  campaignId: string,
  row: { srdKey: string | null; campaignItemId: string | null },
  client: Prisma.TransactionClient | PrismaService = prisma,
): Promise<ResolvedItem> {
  const ref: ContentRefInput = row.srdKey
    ? { source: "SRD", key: row.srdKey }
    : { source: "CAMPAIGN", id: row.campaignItemId as string };
  const { resolved } = await resolveContentRef(prisma, campaignId, ref, client);
  return resolved;
}
