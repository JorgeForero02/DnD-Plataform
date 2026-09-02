import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { Character } from "@prisma/client";
import { MembershipService } from "../../campaigns/membership.service";
import { PrismaService } from "../../prisma/prisma.service";
import { canView, type Viewer } from "../../common/visibility";

// Tareas 2A.8 y 2A.12 — lo que recursos, descansos y condiciones necesitan preguntar antes de
// tocar nada: ¿puede esta persona VER este personaje?, y ¿puede además ESCRIBIR en él? Es el
// mismo par de preguntas que ya hacen `characters` y `sessions`, cada uno con su propio
// `viewerFor` duplicado (deuda declarada en `docs/06-pendientes.md`). Centralizarlo aquí no
// resuelve esa deuda ajena — está fuera de la frontera de esta tarea — pero al menos no la
// repite una tercera vez dentro de esta carpeta.

/** El visor: quién pregunta, con qué rol en la campaña y si es administrador. */
export async function viewerFor(
  prisma: PrismaService,
  membership: MembershipService,
  userId: string,
  campaignId: string,
): Promise<Viewer> {
  const [member, user] = await Promise.all([
    membership.getMembership(campaignId, userId),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);
  return { userId, role: member?.role ?? null, isAdmin: user?.isAdmin ?? false };
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
): Promise<Character> {
  await membership.requireMember(campaignId, userId);
  const character = await prisma.character.findFirst({ where: { id: characterId, campaignId } });
  const viewer = await viewerFor(prisma, membership, userId, campaignId);
  if (!character || !canSeeCharacter(viewer, character)) {
    throw new NotFoundException("Character not found");
  }
  return character;
}

/**
 * El único control de acceso que 2A.8/2A.12 exigen para escribir: DM o dueño. Ninguna otra
 * combinación puede tocar los recursos, los descansos o las condiciones de un personaje.
 */
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
