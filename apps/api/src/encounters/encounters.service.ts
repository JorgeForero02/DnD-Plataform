import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  SEGUNDOS_POR_ASALTO,
  type SetInitiativeInput,
  type StartEncounterInput,
} from "@dnd/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { CharacterSheetService } from "../characters/character-sheet.service";
import { RollsService } from "../rolls/rolls.service";
import { GameClockService } from "../game-clock/game-clock.service";
import { canView, Viewer } from "../common/visibility";

// Tarea 2.5.2 — iniciativa y orden de turnos.
//
// **Todo de servidor.** El spec (§2.5.2) acepta que quede sin pantalla hasta que exista la mesa
// de combate (§2.5.6): lo que hace valioso construirlo ahora es que las condiciones de 2C
// —que ya caducan solas contra el reloj de campaña— empiezan a caducar en combate sin tocarlas,
// porque un asalto avanza el mismo contador (decisión D-2C-1, `SEGUNDOS_POR_ASALTO`).

/** `1d20` + 3 → `1d20+3`; + 0 → `1d20`; − 1 → `1d20-1`. El evaluador no entiende un `+0`. */
function conSigno(modificador: number): string {
  if (modificador === 0) return "1d20";
  return modificador > 0 ? `1d20+${modificador}` : `1d20${modificador}`;
}

@Injectable()
export class EncountersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: GameEventsService,
    private readonly sheets: CharacterSheetService,
    private readonly rolls: RollsService,
    private readonly clock: GameClockService,
  ) {}

  private async viewerFor(userId: string, campaignId: string): Promise<Viewer> {
    const [member, user] = await Promise.all([
      this.membership.getMembership(campaignId, userId),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);
    return { userId, role: member?.role ?? null, isAdmin: user?.isAdmin ?? false };
  }

  private async sesion(campaignId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({ where: { id: sessionId, campaignId } });
    if (!session) throw new NotFoundException("Session not found");
    return session;
  }

  /**
   * Empieza un encuentro: agrupa los combatientes idénticos (mismo `statblockRef`), tira su
   * iniciativa **en el servidor** —una prueba de Destreza que ya deriva el motor
   * (`CharacterSheetService.getInitiativeModifier`), no `1d20 + modificador` a mano— y guarda el
   * orden **una vez**: el SRD dice que no cambia de asalto a asalto.
   *
   * **Como mucho un encuentro `ACTIVE` por sesión, lo garantiza la base** (índice único parcial,
   * `encounter_one_active_per_session`), no este método: la comprobación de abajo es solo un 409
   * legible antes de gastar tiradas, la garantía de verdad es la de Postgres.
   */
  async start(userId: string, campaignId: string, sessionId: string, input: StartEncounterInput) {
    await this.membership.requireDM(campaignId, userId);
    await this.sesion(campaignId, sessionId);

    const yaActivo = await this.prisma.encounter.findFirst({
      where: { sessionId, status: "ACTIVE" },
    });
    if (yaActivo) throw new ConflictException("Ya hay un encuentro activo en esta sesión");

    const combatientes = await this.prisma.character.findMany({
      where: { id: { in: input.characterIds }, campaignId },
    });
    if (combatientes.length !== input.characterIds.length) {
      throw new NotFoundException("Algún personaje no existe en esta campaña");
    }

    // Agrupar por `statblockRef`: los PNJ idénticos (los goblins de 2D) comparten grupo y, con
    // él, una única tirada. Un personaje sin `statblockRef` es su propio grupo de uno — no hace
    // falta un caso especial, la clave `statblockRef ?? id` ya lo hace único.
    const grupos = new Map<string, (typeof combatientes)[number][]>();
    for (const personaje of combatientes) {
      const clave = personaje.statblockRef ?? personaje.id;
      const grupo = grupos.get(clave) ?? [];
      grupo.push(personaje);
      grupos.set(clave, grupo);
    }

    // Una tirada por grupo. **El azar es del servidor** (`RollsService`, el tirador inyectable de
    // 2C); el resultado se copia a todos los miembros del grupo porque compartieron la tirada.
    const puntuaciones = new Map<string, number>(); // characterId -> initiative
    for (const [, miembros] of grupos) {
      const representante = miembros[0];
      const modificador = await this.sheets.getInitiativeModifier(
        userId,
        campaignId,
        representante.id,
      );
      const resultado = await this.rolls.roll(userId, campaignId, {
        expression: conSigno(modificador),
        label: "Iniciativa",
        characterId: representante.id,
        sessionId,
        mode: "NORMAL",
        // Pública: quién actúa y en qué orden no es un secreto del DM, lo ve la mesa entera —
        // igual que el reloj (`GameClockService`).
        audience: "PUBLIC",
      });
      // `revealed: false` solo pasa con `audience: "BLIND"`, que no se usa aquí — la iniciativa
      // nunca se tira a ciegas.
      if (!resultado.revealed) {
        throw new BadRequestException("La tirada de iniciativa no se pudo leer");
      }
      for (const miembro of miembros) puntuaciones.set(miembro.id, resultado.total);
    }

    // El orden se calcula UNA VEZ aquí y se guarda — el SRD: no cambia de asalto a asalto.
    // Puntuación descendente; los miembros de un mismo grupo comparten puntuación y por tanto
    // quedan adyacentes de forma natural. El desempate entre grupos distintos es estable, por
    // `id` de personaje, para que el resultado sea determinista.
    const ordenados = [...combatientes].sort((a, b) => {
      const diff = puntuaciones.get(b.id)! - puntuaciones.get(a.id)!;
      return diff !== 0 ? diff : a.id.localeCompare(b.id);
    });

    try {
      const creado = await this.prisma.transaction(async (tx) => {
        const encounter = await tx.encounter.create({
          data: { sessionId, status: "ACTIVE", round: 1, activePosition: 0 },
        });
        const filas = await Promise.all(
          ordenados.map((personaje, position) =>
            tx.combatant.create({
              data: {
                encounterId: encounter.id,
                characterId: personaje.id,
                initiative: puntuaciones.get(personaje.id)!,
                position,
              },
            }),
          ),
        );
        await this.events.record(
          userId,
          campaignId,
          {
            sessionId,
            subjectType: "encounter",
            subjectId: encounter.id,
            visibility: "PLAYERS",
            payload: {
              type: "ENCOUNTER_STARTED",
              encounterId: encounter.id,
              combatantCount: filas.length,
              positionCount: ordenados.length,
            },
          },
          tx,
        );
        return { encounter, combatants: filas };
      });
      return { ...creado.encounter, combatants: creado.combatants };
    } catch (error) {
      // P2002 = violación de restricción única: el índice parcial ganó la carrera a la
      // comprobación de arriba (el DM abrió dos pestañas). El mensaje es el mismo 409 legible.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Ya hay un encuentro activo en esta sesión");
      }
      throw error;
    }
  }

  async get(userId: string, campaignId: string, sessionId: string, encounterId: string) {
    await this.membership.requireMember(campaignId, userId);
    await this.sesion(campaignId, sessionId);
    const viewer = await this.viewerFor(userId, campaignId);

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, sessionId },
      include: { combatants: { include: { character: true }, orderBy: { position: "asc" } } },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");

    // Un combatiente cuyo personaje no se puede ver —un PNJ `DM_ONLY` sin revelar— no aparece:
    // la lista de combate no es un sitio nuevo por el que filtrar la misma fuga que ya se cazó en
    // 2D (statblock y PNJ son visibilidades distintas, pero aquí basta con la del `Character`).
    const combatants = encounter.combatants
      .filter((c) =>
        canView(viewer, {
          visibility: c.character.visibility,
          createdById: c.character.ownerId,
          grantedUserIds: [],
        }),
      )
      .map((c) => ({
        id: c.id,
        characterId: c.characterId,
        initiative: c.initiative,
        position: c.position,
      }));

    return {
      id: encounter.id,
      sessionId: encounter.sessionId,
      status: encounter.status,
      round: encounter.round,
      activePosition: encounter.activePosition,
      combatants,
    };
  }

  /**
   * El DM corrige el número de un combatiente tras la tirada — el SRD deja los empates a su
   * criterio, como en Foundry. Cambia solo su `initiative`; el `position` (el orden) **no se
   * toca**, porque no cambia de asalto a asalto y editar el número no es recalcular el orden.
   */
  async setInitiative(
    userId: string,
    campaignId: string,
    sessionId: string,
    encounterId: string,
    combatantId: string,
    input: SetInitiativeInput,
  ) {
    await this.membership.requireDM(campaignId, userId);
    await this.sesion(campaignId, sessionId);
    const combatiente = await this.prisma.combatant.findFirst({
      where: { id: combatantId, encounterId, encounter: { sessionId } },
    });
    if (!combatiente) throw new NotFoundException("Combatant not found");
    return this.prisma.combatant.update({
      where: { id: combatantId },
      data: { initiative: input.initiative },
    });
  }

  /**
   * Pasa de turno: recorre el orden guardado y **sube de asalto al llegar al final**.
   *
   * Subir de asalto avanza el reloj de campaña **seis segundos** (`SEGUNDOS_POR_ASALTO`,
   * D-2C-1) por el mismo camino que cualquier otro avance (`GameClockService.advance`, aquí
   * dentro de esta misma transacción): las condiciones de 2C, que ya caducan solas contra ese
   * reloj, empiezan a caducar en combate **sin que este método sepa nada de condiciones**.
   */
  async advanceTurn(userId: string, campaignId: string, sessionId: string, encounterId: string) {
    await this.membership.requireDM(campaignId, userId);
    await this.sesion(campaignId, sessionId);

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, sessionId },
      include: { combatants: { orderBy: { position: "asc" } } },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");
    if (encounter.status !== "ACTIVE") throw new ConflictException("Este encuentro no está activo");
    if (encounter.combatants.length === 0)
      throw new ConflictException("Este encuentro no tiene combatientes");

    const actualIndex = encounter.combatants.findIndex(
      (c) => c.position === encounter.activePosition,
    );
    const indiceSiguiente = (actualIndex + 1) % encounter.combatants.length;
    const sube = indiceSiguiente === 0;
    const toPosition = encounter.combatants[indiceSiguiente].position;
    const nuevoAsalto = sube ? encounter.round + 1 : encounter.round;

    return this.prisma.transaction(async (tx) => {
      const actualizado = await tx.encounter.update({
        where: { id: encounter.id },
        data: { activePosition: toPosition, round: nuevoAsalto },
      });

      await this.events.record(
        userId,
        campaignId,
        {
          sessionId,
          subjectType: "encounter",
          subjectId: encounter.id,
          visibility: "PLAYERS",
          payload: {
            type: "TURN_ADVANCED",
            encounterId: encounter.id,
            fromPosition: encounter.activePosition,
            toPosition,
            round: nuevoAsalto,
          },
        },
        tx,
      );

      if (sube) {
        // Comparte la transacción con `GameClockService.advance`: el asalto que sube y los seis
        // segundos que avanza el reloj se escriben juntos o no se escribe ninguno.
        const avance = await this.clock.advance(
          userId,
          campaignId,
          { kind: "TIME", seconds: SEGUNDOS_POR_ASALTO },
          tx,
        );
        await this.events.record(
          userId,
          campaignId,
          {
            sessionId,
            subjectType: "encounter",
            subjectId: encounter.id,
            visibility: "PLAYERS",
            payload: {
              type: "ROUND_ADVANCED",
              encounterId: encounter.id,
              from: encounter.round,
              to: nuevoAsalto,
              clockSeconds: avance.to,
            },
          },
          tx,
        );
      }

      return { ...actualizado, roundAdvanced: sube };
    });
  }
}
