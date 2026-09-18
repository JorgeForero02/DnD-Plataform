import type { Coste } from "@dnd/shared";
import type { PrismaService } from "../prisma/prisma.service";

/**
 * Task 4b (3A.3) — lo mínimo de `EncountersService` que hace falta para gastar la economía del
 * turno: el método `gastar`, con su misma firma. **No se importa la clase `EncountersService`**
 * —eso es justo lo que un consumidor en `characters` no puede hacer sin un ciclo de módulos
 * (`EncountersModule` ya importa `CharactersModule`, por `getInitiativeModifier`)— sino esta
 * forma estructural, igual que `ActivityCatalog` en `activities.service.ts`. Quien la implementa
 * de verdad es `EncountersService`; quien la pide solo necesita saber que existe `gastar`.
 */
export interface PuertaDeEconomia {
  gastar(
    userId: string,
    campaignId: string,
    sessionId: string,
    encounterId: string,
    combatantId: string,
    input: { coste: Coste },
  ): Promise<{ excedido: boolean }>;
}

/** Token de inyección para quien no puede pedir `EncountersService` por su clase. */
export const TURN_ECONOMY_GATE = "TURN_ECONOMY_GATE";

/**
 * Task 4b (3A.3) — extraído de `ActivitiesService.gastarActivacion`: gasta `coste` SOLO si quien
 * actúa es combatiente de un encuentro `ACTIVE` de esta campaña. Fuera de combate no hay turno
 * que gastar, y no es un error: se calla, igual que hacía `gastarActivacion` desde la tarea A2.
 *
 * **Nunca rechaza** (misma doctrina): `EncountersService.gastar` cuenta y avisa (`excedido`), no
 * bloquea — un guerrero que ataca dos veces en el mismo turno sigue pudiendo hacerlo, y el
 * segundo ataque vuelve con `excedido: true` en vez de un 400.
 *
 * Comparte esta puerta `ActivitiesService.usar()` (el caso con `activation.coste`) y
 * `CharacterSheetService.resolveAttack` — el hueco que dejaba el segundo, medido por la Task 4:
 * un ataque de arma contra un objetivo no gastaba la acción del turno en el servidor (D-CF-146).
 */
export async function gastarSiEnCombate(
  prisma: Pick<PrismaService, "combatant">,
  puerta: PuertaDeEconomia,
  userId: string,
  campaignId: string,
  characterId: string,
  coste: Coste,
): Promise<{ excedido: boolean } | undefined> {
  const combatiente = await prisma.combatant.findFirst({
    where: { characterId, encounter: { status: "ACTIVE", session: { campaignId } } },
    select: { id: true, encounterId: true, encounter: { select: { sessionId: true } } },
  });
  if (!combatiente) return undefined;

  return puerta.gastar(
    userId,
    campaignId,
    combatiente.encounter.sessionId,
    combatiente.encounterId,
    combatiente.id,
    { coste },
  );
}
