import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  SEGUNDOS_POR_ASALTO,
  type CombatantSide,
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
import { canView, loVeLaMesa, Viewer } from "../common/visibility";

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

/**
 * **La única función que convierte «iniciativa + grupo» en «orden», y por eso la usan las dos**
 * —empezar un encuentro y corregir un número—. Dos copias de esta regla se habrían separado a la
 * semana, y separarse aquí significa que la mesa juega en un orden distinto del que enseña.
 *
 * Dos reglas del SRD 5.1 («Initiative»), las dos citadas porque las dos deciden código:
 *
 *   «The DM makes one roll for an entire group of identical creatures, **so each member of the
 *   group acts at the same time**.» → los de una misma clave de grupo comparten UNA posición.
 *
 *   «The DM ranks the combatants in order from the one with the highest Dexterity check total to
 *   the one with the lowest.» → orden por iniciativa descendente.
 *
 * **El desempate es por clave de grupo antes que por identificador, y eso lo escribió un
 * hallazgo.** Con el desempate solo por `id`, seis goblins que sacan 12 y cuatro orcos que
 * sacan 12 se ordenaban por `cuid` y quedaban **intercalados** —goblin, orco, orco, goblin—,
 * así que dos grupos que debían actuar cada uno a la vez se partían el uno al otro. Ni la
 * unitaria ni el e2e lo veían: los dos usaban un solo grupo.
 */
export interface FilaDeCombatiente {
  id: string;
  characterId: string;
  initiative: number;
  groupKey: string;
  position: number;
  /** El bando dentro de este encuentro. `recolocar` no lo usa, pero lo devuelve intacto. */
  side: CombatantSide;
}

/** Lo mínimo del cliente de Prisma que `recolocar` necesita — el `tx` real lo cumple de sobra. */
interface TxDeCombatientes {
  combatant: {
    findMany(args: {
      where: { encounterId: string };
      orderBy?: { position: "asc" };
    }): Promise<FilaDeCombatiente[]>;
    update(args: { where: { id: string }; data: { position: number } }): Promise<unknown>;
  };
}

/**
 * El separador con el que se compone la clave «iniciativa + grupo». Un carácter que **no puede
 * aparecer** en ninguna de las dos mitades, para que dos combatientes distintos no colisionen.
 *
 * **Se escribe como escape, y eso lo corrigió la revisión de cierre de 2.5.6.** Aquí había tres
 * bytes NUL **literales** dentro del fuente, y la consecuencia no era funcional sino de proceso:
 * git clasificaba el fichero como binario, así que `git show` lo listaba como `Bin 19708 -> 22896
 * bytes` y **todo lo que se escribió aquí desde 2.5.2 llegó a `main` sin un solo diff legible** —
 * el filtrado por `canView`, la renumeración densa, `current` y `end` incluidos—. Ni Prettier ni
 * ESLint miran los bytes de control. La revisión que este proyecto declara obligatoria estaba
 * anulada en el fichero más sensible del módulo.
 */
const SEPARADOR_DE_CLAVE = "\u0000";

async function recolocar(tx: TxDeCombatientes, encounterId: string) {
  const filas = await tx.combatant.findMany({ where: { encounterId } });

  const entradas = [
    ...new Set(filas.map((f) => `${f.initiative}${SEPARADOR_DE_CLAVE}${f.groupKey}`)),
  ]
    .map((clave) => {
      const [iniciativa, grupo] = clave.split(SEPARADOR_DE_CLAVE);
      return { iniciativa: Number(iniciativa), grupo, clave };
    })
    .sort((a, b) => {
      const diff = b.iniciativa - a.iniciativa;
      return diff !== 0 ? diff : a.grupo.localeCompare(b.grupo);
    });

  const posicionDe = new Map(entradas.map((e, i) => [e.clave, i]));

  await Promise.all(
    filas.map((f) =>
      tx.combatant.update({
        where: { id: f.id },
        data: { position: posicionDe.get(`${f.initiative}${SEPARADOR_DE_CLAVE}${f.groupKey}`)! },
      }),
    ),
  );

  return tx.combatant.findMany({ where: { encounterId }, orderBy: { position: "asc" } });
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

    // `archivedAt: null` desde 2.5.8, por lo mismo que en las peticiones de tirada: un
    // personaje archivado no baja a un combate.
    const combatientes = await this.prisma.character.findMany({
      where: { id: { in: input.characterIds }, campaignId, archivedAt: null },
    });
    if (combatientes.length !== input.characterIds.length) {
      throw new NotFoundException("Algún personaje no existe en esta campaña");
    }

    // Agrupar por `statblockRef`: los PNJ idénticos (los goblins de 2D) comparten grupo y, con
    // él, una única tirada. Un personaje sin `statblockRef` es su propio grupo de uno — no hace
    // falta un caso especial, la clave `statblockRef ?? id` ya lo hace único.
    const grupos = new Map<string, (typeof combatientes)[number][]>();
    const claveDe = new Map<string, string>();
    for (const personaje of combatientes) {
      const clave = personaje.statblockRef ?? personaje.id;
      claveDe.set(personaje.id, clave);
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
        // La iniciativa **no es** ninguna de las tres tiradas del SRD en las que se gasta la
        // inspiración (ataque, salvación, prueba): es una tirada de Destreza aparte, y el
        // servidor la lanza por el grupo, no la pide un jugador.
        spendInspiration: false,
        // **La audiencia sale de la visibilidad del personaje, NUNCA es `PUBLIC` fija.**
        //
        // Lo cazó la revisión de cierre, y es **la misma forma exacta** de un fallo ya arreglado
        // en este repositorio: `character-sheet.service.ts` lleva escrito que «un PNJ `DM_ONLY`
        // que ataca escribía un suceso a la mesa entera con su nombre dentro», y ese arreglo es
        // hermano del segundo hallazgo de la revisión de 2C. Aquí había vuelto.
        //
        // Con `PUBLIC` fija, el jugador que pide la línea de tiempo veía **una tirada de
        // «Iniciativa» de un sujeto que no conoce**, y de ahí sacaba tres cosas que no debía:
        // que hay una emboscada montada, la iniciativa exacta del monstruo y su modificador de
        // Destreza. La ficha del encuentro los escondía; el registro los cantaba.
        //
        // **Y son DOS niveles, no uno**, que es lo que encontró la revisión de 2.5.6: el
        // predicado era `=== "PLAYERS"`, así que un personaje `PUBLIC` —el más abierto de los
        // cinco— caía en el `else` y su tirada de iniciativa se escondía como `DM_PRIVATE`. Ni su
        // propio dueño la veía. Es la tercera copia mal escrita del mismo predicado, y por eso
        // ahora vive en `common/visibility.ts` junto a `canView`, que es su dueño declarado.
        audience: loVeLaMesa(representante.visibility) ? "PUBLIC" : "DM_PRIVATE",
      });
      // `revealed: false` solo pasa con `audience: "BLIND"`, que no se usa aquí — la iniciativa
      // nunca se tira a ciegas.
      if (!resultado.revealed) {
        throw new BadRequestException("La tirada de iniciativa no se pudo leer");
      }
      for (const miembro of miembros) puntuaciones.set(miembro.id, resultado.total);
    }

    // El orden se calcula UNA VEZ aquí y se guarda — el SRD: no cambia de asalto a asalto.
    const ordenados = [...combatientes];

    try {
      const creado = await this.prisma.transaction(async (tx) => {
        const encounter = await tx.encounter.create({
          data: { sessionId, status: "ACTIVE", round: 1, activePosition: 0 },
        });
        // Se crean con `position: 0` y se coloca a todos de una vez con `recolocar`, que es la
        // ÚNICA función que sabe convertir «iniciativa + grupo» en «orden». Que la use tanto
        // empezar como corregir un número es lo que impide que las dos se separen.
        await Promise.all(
          ordenados.map((personaje) =>
            tx.combatant.create({
              data: {
                encounterId: encounter.id,
                characterId: personaje.id,
                initiative: puntuaciones.get(personaje.id)!,
                groupKey: claveDe.get(personaje.id)!,
                position: 0,
                // Quien no venga clasificado entra como `NEUTRAL`, que es lo que significa «no se
                // ha dicho». El servidor no rellena el hueco con una suposición.
                side: input.sides?.[personaje.id] ?? "NEUTRAL",
              },
            }),
          ),
        );
        const filas = await recolocar(tx, encounter.id);
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
              // **Sin conteos.** Los llevaba —`combatantCount` y `positionCount`— y los dos
              // eran una fuga por deducción que cazó la revisión de cierre: el jugador que ve
              // dos combatientes suyos en la ficha del encuentro y lee «ocho» en el registro
              // sabe que hay seis enemigos escondidos. El suceso dice que **empezó** un
              // encuentro, que es lo que la mesa tiene que saber; cuántos hay se ve mirando, y
              // lo que se ve lo decide `canView`.
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

  /**
   * Tarea 2.5.6 — **el encuentro activo de esta sesión, o `null`.**
   *
   * Sin esto la pantalla no puede existir: `get` exige un `encounterId` que solo conoce quien
   * acaba de llamar a `start`, así que recargar la mesa —o abrirla en otro dispositivo, o entrar
   * un jugador a mitad de combate— dejaba el combate invisible aunque estuviera en curso. La base
   * ya garantiza **como mucho uno activo por sesión** (índice único parcial, ver `start`), así que
   * «el activo» es una pregunta con una sola respuesta y no hace falta ningún listado.
   *
   * Devuelve `null`, no un 404: «no hay combate» es el estado normal de una mesa, no un error.
   * Reutiliza `get` entero para que el filtrado por visibilidad y la renumeración densa de
   * posiciones vivan **en un solo sitio** — duplicarlos aquí sería abrir por segunda vez la fuga
   * que la revisión de 2.5.2 cerró.
   */
  async current(userId: string, campaignId: string, sessionId: string) {
    await this.membership.requireMember(campaignId, userId);
    await this.sesion(campaignId, sessionId);
    const activo = await this.prisma.encounter.findFirst({
      where: { sessionId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!activo) return null;
    return this.get(userId, campaignId, sessionId, activo.id);
  }

  /**
   * Tarea 2.5.6 — **terminar el combate.** Sin esto la tira de iniciativa no se va nunca: entrar
   * en combate es un momento (§5 del reseño), y salir también.
   *
   * No borra nada. El encuentro pasa a `ENDED` y se queda con su orden, sus asaltos y su rastro
   * —el índice único es parcial sobre `ACTIVE`, así que el siguiente combate de la misma sesión
   * no choca con él—. Es la misma decisión que archivar un personaje en vez de borrarlo (D-2.5-4).
   */
  async end(userId: string, campaignId: string, sessionId: string, encounterId: string) {
    await this.membership.requireDM(campaignId, userId);
    await this.sesion(campaignId, sessionId);

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, sessionId },
      select: { id: true, status: true, round: true },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");
    if (encounter.status !== "ACTIVE") throw new ConflictException("Este encuentro no está activo");

    return this.prisma.transaction(async (tx) => {
      const cerrado = await tx.encounter.update({
        where: { id: encounter.id },
        data: { status: "ENDED" },
      });
      // **A la mesa, no en privado.** Que el combate terminó lo tiene que saber todo el que
      // estaba en él; el suceso no nombra a ningún combatiente, así que no delata a nadie.
      await this.events.record(
        userId,
        campaignId,
        {
          sessionId,
          subjectType: "encounter",
          subjectId: encounter.id,
          visibility: "PLAYERS",
          payload: {
            type: "ENCOUNTER_ENDED",
            encounterId: encounter.id,
            rounds: encounter.round,
          },
        },
        tx,
      );
      return { id: cerrado.id, status: cerrado.status };
    });
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
        // El bando viaja con el combatiente y no necesita filtro propio: quien llega hasta aquí ya
        // pasó por `canView` sobre su personaje, y saber de qué lado está alguien a quien ya se ve
        // no revela nada que la ficha no dijera.
        side: c.side,
      }));

    // **Las posiciones visibles se renumeran densas, y esto no es cosmética.** La revisión de
    // cierre lo señaló: devolver las posiciones tal cual le daba al jugador `[0, 7]` y seis
    // huecos, y seis huecos son seis criaturas. Contar lo que falta es una forma de verlo.
    //
    // Se renumera **conservando el orden**, así que el jugador sigue sabiendo quién va antes que
    // quién, que es para lo que sirve la lista.
    const visibles = [...new Set(combatants.map((c) => c.position))].sort((a, b) => a - b);
    const densa = new Map(visibles.map((p, i) => [p, i]));

    // Y `activePosition` solo viaja si apunta a alguien que este espectador puede ver. Si el
    // turno es de un PNJ escondido, lo que se manda es `null`: «ahora no te toca a ti» es
    // verdad y no delata a nadie. Un número que apunta a un hueco sí delataría.
    const activaVisible = densa.has(encounter.activePosition)
      ? densa.get(encounter.activePosition)!
      : null;

    return {
      id: encounter.id,
      sessionId: encounter.sessionId,
      status: encounter.status,
      round: encounter.round,
      activePosition: activaVisible,
      combatants: combatants.map((c) => ({ ...c, position: densa.get(c.position)! })),
    };
  }

  /**
   * El DM corrige el número de un combatiente tras la tirada — el SRD deja los empates a su
   * criterio, como en Foundry — **y el orden se recoloca con él**.
   *
   * La primera versión cambiaba solo la columna `initiative` y dejaba `position` intacta, con un
   * comentario que además prometía que así se podía «separar a un grupo que actuaba junto». La
   * revisión de cierre lo desmontó: `advanceTurn` ordena **solo** por `position`, así que editar
   * el número no cambiaba absolutamente nada del juego. La columna era decorativa y la promesa,
   * falsa. Y sin recolocar, la única razón por la que el SRD deja editar —deshacer un empate—
   * no se cumplía.
   *
   * Que «el orden no cambia de asalto a asalto» sigue siendo cierto: lo que no cambia solo es el
   * orden **entre asaltos**. Corregir un número es un acto explícito del DM, no un recálculo
   * automático.
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

    return this.prisma.transaction(async (tx) => {
      await tx.combatant.update({
        where: { id: combatantId },
        data: {
          initiative: input.initiative,
          // **Sale de su grupo.** Un número corregido a mano es exactamente «este ya no actúa
          // con los demás»: si siguiera compartiendo clave de grupo, volvería a caer en la
          // misma posición que sus idénticos y la corrección no serviría de nada.
          groupKey: combatantId,
        },
      });
      const filas = await recolocar(tx, encounterId);
      return filas.find((f) => f.id === combatantId)!;
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

    // **Se recorren las POSICIONES, no las filas.** Con seis goblins compartiendo posición,
    // recorrer filas daría seis turnos de goblin seguidos y subiría de asalto a los ocho pasos
    // en vez de a los siete — justo lo contrario de «actúan a la vez».
    const posiciones = [...new Set(encounter.combatants.map((c) => c.position))].sort(
      (a, b) => a - b,
    );
    const actualIndex = posiciones.indexOf(encounter.activePosition);
    const indiceSiguiente = (actualIndex + 1) % posiciones.length;
    const sube = indiceSiguiente === 0;
    const toPosition = posiciones[indiceSiguiente];
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
            // **Sin posiciones, y es la MISMA fuga que esta tarea ya cerró una vez por otra
            // puerta.** `get` renumera denso justo para que un jugador no pueda contar los huecos
            // de los combatientes que no ve; este suceso es `PLAYERS` y viajaba con las
            // posiciones **crudas** dentro del `payload`, que `GameEventsService.list` devuelve
            // entero. Con un PJ visible y cuatro grupos ocultos, el registro le entregaba cinco
            // posiciones distintas: cuántos enemigos escondidos hay, y en qué hueco del orden
            // actúa cada uno. Lo midió la revisión de cierre contra Postgres real.
            //
            // Un `payload` **no se puede filtrar por espectador** —es un Json que se devuelve tal
            // cual—, así que la única renumeración correcta sería por espectador y ahí no cabe.
            // Y no hace falta: `linea-de-log.ts` ya las descartaba a propósito («el suceso trae
            // posiciones, no personajes»), así que nadie las estaba leyendo. Es exactamente lo
            // que se hizo con `combatantCount` en `ENCOUNTER_STARTED`.
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
