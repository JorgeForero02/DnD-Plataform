import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { Character, Prisma } from "@prisma/client";
import { MembershipService } from "../campaigns/membership.service";
import { PrismaService } from "../prisma/prisma.service";
import { canView, type Viewer } from "./visibility";

// **El visor de un personaje, en un solo sitio.** Las dos preguntas que se hace todo el que toca
// un personaje —¿puede esta persona VERLO?, ¿puede además ESCRIBIR en él?— vivían escritas tres
// veces: `characters`, `character-state` y, al llegar la fase 2B, una tercera en `inventory`. La tercera copia fue la que decidió cerrarlo: una regla de autorización repetida
// es una regla que se arregla en dos sitios de tres el día que cambie.
//
// La deuda estaba declarada en `docs/06-pendientes.md` y se cierra aquí en vez de crecer.

/**
 * El visor: quién pregunta, con qué rol en la campaña y si es administrador.
 *
 * **`cliente` es el patrón `tx?` de siempre** (ficha P2-0): quien ya tiene una transacción
 * abierta le pasa su cliente y estas lecturas van por ahí, en vez de pedirle al pool una segunda
 * conexión mientras la primera sigue ocupada. Sin él, el comportamiento no cambia en nada.
 */
export async function viewerFor(
  prisma: PrismaService,
  membership: MembershipService,
  userId: string,
  campaignId: string,
  cliente?: Prisma.TransactionClient,
): Promise<Viewer> {
  const db = cliente ?? prisma;
  const [member, user] = await Promise.all([
    membership.getMembership(campaignId, userId),
    db.user.findUnique({ where: { id: userId } }),
  ]);
  return {
    userId,
    role: member?.role ?? null,
    isAdmin: user?.isAdmin ?? false,
    // La fila ya se ha traído entera para mirar `isAdmin`: el nombre viaja gratis (B3).
    displayName: user?.displayName,
  };
}

function canSeeCharacter(viewer: Viewer, character: Pick<Character, "ownerId" | "visibility">) {
  return canView(viewer, {
    visibility: character.visibility,
    createdById: character.ownerId,
    grantedUserIds: [],
  });
}

/**
 * Busca el personaje y exige que quien pregunta pueda verlo. 404 en los dos casos —no existe,
 * o existe pero no se ve— para no filtrar por respuesta cuáles personajes hay en la campaña.
 */
export async function requireVisibleCharacter(
  prisma: PrismaService,
  membership: MembershipService,
  userId: string,
  campaignId: string,
  characterId: string,
  cliente?: Prisma.TransactionClient,
): Promise<Character> {
  const { character } = await requireVisibleCharacterWithViewer(
    prisma,
    membership,
    userId,
    campaignId,
    characterId,
    cliente,
  );
  return character;
}

/**
 * Igual que `requireVisibleCharacter`, pero además entrega el `Viewer` de quien pregunta —con su
 * `displayName`, ya en la mano tras `viewerFor`—, para quien necesite citar a esa persona sin
 * pagar una segunda consulta por la misma fila de `User` (B3, inventario: dar algo a alguien
 * dice quién lo dio).
 */
export async function requireVisibleCharacterWithViewer(
  prisma: PrismaService,
  membership: MembershipService,
  userId: string,
  campaignId: string,
  characterId: string,
  cliente?: Prisma.TransactionClient,
): Promise<{ character: Character; viewer: Viewer }> {
  await membership.requireMember(campaignId, userId);
  const db = cliente ?? prisma;
  const character = await db.character.findFirst({ where: { id: characterId, campaignId } });
  const viewer = await viewerFor(prisma, membership, userId, campaignId, cliente);
  if (!character || !canSeeCharacter(viewer, character)) {
    throw new NotFoundException("Character not found");
  }
  return { character, viewer };
}

/** DM o dueño: el único par que puede escribir en el inventario o la bolsa de un personaje. */
export async function requireOwnerOrDM(
  membership: MembershipService,
  campaignId: string,
  userId: string,
  character: Pick<Character, "ownerId">,
  message = "Solo el DM o el dueño del personaje puede hacer esto.",
): Promise<boolean> {
  const member = await membership.getMembership(campaignId, userId);
  const isDM = member?.role === "DM";
  if (!isDM && character.ownerId !== userId) {
    throw new ForbiddenException(message);
  }
  return isDM;
}

/**
 * Igual que `requireVisibleCharacter`, pero sin exigir permiso de escritura: la usa quien
 * necesita saber por los ojos de QUIÉN se ve un objeto (el dueño del personaje), sin que ese
 * dueño sea forzosamente quien está llamando al endpoint.
 */
export async function viewerForCharacterOwner(
  prisma: PrismaService,
  membership: MembershipService,
  campaignId: string,
  character: Pick<Character, "ownerId">,
): Promise<Viewer> {
  return viewerFor(prisma, membership, character.ownerId, campaignId);
}
