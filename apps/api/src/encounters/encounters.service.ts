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
  type SetSideInput,
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
 * **La única función que convierte «iniciativa + grupo» en «orden», y por eso la usan las
 * tres** —empezar un encuentro, corregir un número y aplicar la iniciativa de una petición—.
 * Copiar esta regla en más de un sitio se habría separado a la semana, y separarse aquí
 * significa que la mesa juega en un orden distinto del que enseña.
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

/**
 * Toma el candado de la fila del `Encounter` (`SELECT ... FOR UPDATE`) y devuelve su estado,
 * leído en la MISMA consulta bloqueante — nunca una lectura y luego un candado por separado, que
 * dejaría una ventana entre las dos.
 *
 * **Es la única función que ejecuta este SQL.** `recolocar` la llama siempre, primero de todo, y
 * `EncountersService.aplicarIniciativaDePeticion` la llama TAMBIÉN, directamente, porque necesita
 * el estado para decidir si toca algo (ronda de arreglo 1, I-3) antes incluso de invocar
 * `recolocar`. Repetir la misma `SELECT ... FOR UPDATE` dentro de la MISMA transacción no vuelve
 * a bloquear: Postgres ya sabe que esta transacción tiene el candado, así que la segunda llamada
 * solo confirma lo que ya era cierto.
 *
 * **Por qué existe un candado aquí y no solo el `orderBy` de antes.** La primera versión de este
 * arreglo (tarea 3) se conformó con ordenar `findMany` por `id` para que dos transacciones
 * escribieran los combatientes siempre en el mismo orden, y bastaba mientras las únicas
 * concurrentes eran tres respuestas de iniciativa entre sí. La ronda de arreglo 1 encontró el
 * caso que ese arreglo no cubría: `setInitiative` escribe la fila del combatiente que corrige
 * ANTES de llamar a `recolocar`, sin tomar ningún candado — dos `setInitiative` a la vez, o uno
 * contra una respuesta de iniciativa, se cruzaban igual y volvían al mismo «deadlock detected»
 * (40P01). Un candado sobre la fila del `Encounter`, tomado antes de tocar ningún `Combatant`,
 * serializa a cualquiera que compita por el mismo encuentro sin que cada llamador tenga que
 * acordarse de nada: solo tiene que seguir llamando a `recolocar`, como ya hacía.
 */
async function bloquearEncuentro(
  tx: Prisma.TransactionClient,
  encounterId: string,
): Promise<string | undefined> {
  const filas = await tx.$queryRaw<
    { status: string }[]
  >`SELECT status FROM "Encounter" WHERE id = ${encounterId} FOR UPDATE`;
  return filas[0]?.status;
}

/**
 * **Toma el candado del `Encounter` como PRIMERA operación**, antes de leer o tocar ningún
 * `Combatant` — ver `bloquearEncuentro`. `antesDeLeer`, si se pasa, se ejecuta DESPUÉS del
 * candado y ANTES de leer las filas: es el hueco donde un llamador escribe su propio cambio (la
 * iniciativa que acaba de tirar un jugador, el número que corrige el DM) sin arriesgarse a tocar
 * esa fila antes de tener el candado del encuentro. Si esa escritura pasara antes de llamar
 * aquí, esta misma transacción entraría a competir por el candado del encuentro mientras ya
 * sostiene el candado de una fila de `Combatant` — y otra transacción que sí tenga el candado
 * del encuentro y necesite esa misma fila (recolocar toca TODAS las del encuentro) se cruzaría
 * con ella: cada una esperando lo que la otra ya tiene. Es la forma exacta del `40P01` que esta
 * función existe para cerrar.
 */
async function recolocar(
  tx: Prisma.TransactionClient,
  encounterId: string,
  antesDeLeer?: () => Promise<void>,
): Promise<FilaDeCombatiente[]> {
  await bloquearEncuentro(tx, encounterId);
  if (antesDeLeer) await antesDeLeer();

  const filas = await tx.combatant.findMany({ where: { encounterId }, orderBy: { id: "asc" } });

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

  // **`for...of` con `await`, no `Promise.all`** (M-1 de la ronda de arreglo 1). El orden en el
  // que estos `UPDATE` llegan a Postgres importaba —es la mitad de lo que evita el 40P01, junto
  // al candado de arriba— y `Promise.all` solo lo respeta porque en la práctica encola las
  // promesas en el orden del array; nada del lenguaje lo garantiza. Con el bucle secuencial, el
  // orden lo impone la sintaxis, no una casualidad de implementación.
  for (const f of filas) {
    await tx.combatant.update({
      where: { id: f.id },
      data: { position: posicionDe.get(`${f.initiative}${SEPARADOR_DE_CLAVE}${f.groupKey}`)! },
    });
  }

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
   * **Como mucho un encuentro sin terminar (`ACTIVE` o `PREPARING`) por sesión, lo garantiza la
   * base** (índice único parcial, `encounter_one_active_per_session`), no este método: la
   * comprobación de abajo es solo un 409 legible antes de gastar tiradas, la garantía de verdad
   * es la de Postgres.
   */
  async start(userId: string, campaignId: string, sessionId: string, input: StartEncounterInput) {
    await this.membership.requireDM(campaignId, userId);
    await this.sesion(campaignId, sessionId);

    // `PREPARING` cuenta como «sin terminar» igual que `ACTIVE`: la tarea 1 recontó el índice
    // único parcial de la base con este mismo motivo (`encounter_one_active_per_session` cubre
    // ambos), y este guardián —que solo da un 409 legible antes de gastar tiradas— tiene que
    // ver lo mismo que ve la base o deja de servir de aviso previo.
    const yaActivo = await this.prisma.encounter.findFirst({
      where: { sessionId, status: { in: ["ACTIVE", "PREPARING"] } },
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
    //
    // La clave se calcula para **todos** los combatientes —también hace falta para el `groupKey`
    // de quien no tira aquí—, pero los grupos que se tiran solo se forman con los del DM.
    const claveDe = new Map<string, string>();
    for (const personaje of combatientes) {
      claveDe.set(personaje.id, personaje.statblockRef ?? personaje.id);
    }

    // **El criterio es si el dueño es quien empieza el combate, no si «tiene dueño».**
    // `Character.ownerId` es obligatorio, así que un goblin del DM también tiene dueño: preguntar
    // por su existencia no distingue nada. Y NO se mira `statblockRef` a propósito — un PNJ
    // jugable es una fila de `Character` como cualquier otra desde 2D, y quien lo lleva decide
    // si tira, no de dónde salieron sus números.
    //
    // **Con más de un DM en la campaña, esto compara contra quien pulsó el botón, no contra «es
    // DM»** — un PNJ de OTRO DM caería del lado de `ajenos` y recibiría una petición de
    // iniciativa que no tiene por qué. `membership.service.ts` sí sabe contar cuántos DM quedan
    // en una campaña; este método no distingue entre ellos. Queda anotado como caso conocido en
    // `docs/06-pendientes.md` — no lo arregla esta ronda.
    const suyos = combatientes.filter((c) => c.ownerId === userId);
    const ajenos = combatientes.filter((c) => c.ownerId !== userId);

    // **Se valida la hoja de los `ajenos` antes de crear nada.** No se les tira, pero si su hoja
    // no deriva —le faltan características, raza o clase— antes de esta tarea `start()` ya daba
    // un 400 al intentar tirar por ellos; sin esta validación, el 400 solo llegaría al responder
    // su petición (`RollRequestsService.modificadorDeLaHoja`), y para entonces el encuentro ya
    // existe, `PREPARING`, sin ninguna forma de resolverse: la petición nunca se cierra y el
    // combate no sale de ahí. Se reutiliza `getInitiativeModifier` —la misma fuente que usa el
    // bucle de abajo para los `suyos`— y se descarta el número: aquí solo hace falta que la hoja
    // exista, no cuánto vale.
    for (const personaje of ajenos) {
      await this.sheets.getInitiativeModifier(userId, campaignId, personaje.id);
    }

    const grupos = new Map<string, (typeof combatientes)[number][]>();
    for (const personaje of suyos) {
      const clave = claveDe.get(personaje.id)!;
      const grupo = grupos.get(clave) ?? [];
      grupo.push(personaje);
      grupos.set(clave, grupo);
    }

    // Una tirada por grupo, y solo de los del DM: a los `ajenos` no se les tira, se les pide.
    // **El azar es del servidor** (`RollsService`, el tirador inyectable de 2C); el resultado se
    // copia a todos los miembros del grupo porque compartieron la tirada.
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

    // Si queda algún `ajeno` sin tirar, el encuentro nace `PREPARING`: aún faltan iniciativas
    // por pedir y no se puede jugar el primer asalto sin ellas. Sin nadie ajeno, el DM combate
    // solo contra los suyos y arranca `ACTIVE` directamente, como hasta ahora.
    const status = ajenos.length > 0 ? "PREPARING" : "ACTIVE";

    try {
      const creado = await this.prisma.transaction(async (tx) => {
        const encounter = await tx.encounter.create({
          data: { sessionId, status, round: 1, activePosition: 0 },
        });
        // Se crean con `position: 0` y se coloca a todos de una vez con `recolocar`, que es la
        // ÚNICA función que sabe convertir «iniciativa + grupo» en «orden». Que la use tanto
        // empezar como corregir un número es lo que impide que las dos se separen.
        //
        // Los `ajenos` entran con `initiative: 0` — todavía no se les ha tirado nada, se les ha
        // pedido — y la tarea siguiente es la que escribe el número de verdad al responder.
        await Promise.all(
          ordenados.map((personaje) =>
            tx.combatant.create({
              data: {
                encounterId: encounter.id,
                characterId: personaje.id,
                initiative: puntuaciones.get(personaje.id) ?? 0,
                groupKey: claveDe.get(personaje.id)!,
                position: 0,
                // Quien no venga clasificado entra como `NEUTRAL`, que es lo que significa «no se
                // ha dicho». El servidor no rellena el hueco con una suposición.
                side: input.sides?.[personaje.id] ?? "NEUTRAL",
              },
            }),
          ),
        );
        // Una petición de tirada por cada `ajeno`, ligada a este encuentro. **La audiencia es la
        // misma que usa la tirada del servidor arriba**: la ve la mesa si el personaje la ve, y
        // por el mismo motivo — con `PUBLIC` fija, un PNJ escondido cantaba su iniciativa.
        await Promise.all(
          ajenos.map((personaje) =>
            tx.rollRequest.create({
              data: {
                campaignId,
                characterId: personaje.id,
                requestedById: userId,
                encounterId: encounter.id,
                key: "initiative",
                label: "Iniciativa",
                mode: "NORMAL",
                audience: loVeLaMesa(personaje.visibility) ? "PUBLIC" : "DM_PRIVATE",
              },
            }),
          ),
        );
        const filas = await recolocar(tx, encounter.id);
        // **Solo si nace `ACTIVE`.** Un encuentro `PREPARING` todavía no ha empezado —está
        // esperando la iniciativa de los `ajenos`—, así que escribir «empezó el combate» aquí
        // sería mentir por adelantado. Y es más que cosmético: la tarea 3 escribirá este mismo
        // suceso cuando el `PREPARING` termine de resolverse y pase a `ACTIVE`, así que
        // escribirlo también aquí lo duplicaría en la línea de tiempo del jugador.
        if (status === "ACTIVE") {
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
        }
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
   * Tarea 2.5.6 — **el encuentro sin terminar de esta sesión, o `null`.**
   *
   * Sin esto la pantalla no puede existir: `get` exige un `encounterId` que solo conoce quien
   * acaba de llamar a `start`, así que recargar la mesa —o abrirla en otro dispositivo, o entrar
   * un jugador a mitad de combate— dejaba el combate invisible aunque estuviera en curso. La base
   * ya garantiza **como mucho un encuentro sin terminar por sesión** (índice único parcial, ver
   * `start`), así que «el que está en curso» es una pregunta con una sola respuesta y no hace
   * falta ningún listado.
   *
   * **`PREPARING` cuenta, y es la ronda de arreglo 1 (2026-09-05) la que lo corrigió.** Desde la
   * tarea 2, `start()` puede devolver un encuentro `PREPARING` —esperando la iniciativa de quien
   * no es el DM—, y esta consulta seguía mirando solo `ACTIVE`: el DM lo empezaba y, al siguiente
   * sondeo, el combate desaparecía de su pantalla. Toda la capa de combate de la web cuelga de
   * aquí (`apps/web/src/features/encounters/hooks.ts`), así que el hueco no era cosmético.
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
      where: { sessionId, status: { in: ["ACTIVE", "PREPARING"] } },
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
   * —el índice único es parcial sobre un encuentro sin terminar (`ACTIVE` o `PREPARING`), así
   * que el siguiente combate de la misma sesión no choca con él—. Es la misma decisión que
   * archivar un personaje en vez de borrarlo (D-2.5-4).
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
      // **Quién tenía el turno ANTES de tocar nada**, para poder seguirlo después de recolocar
      // (ver el bloque de abajo). Se lee dentro del `antesDeLeer` de `recolocar`: el candado del
      // encuentro ya está tomado en ese punto, así que esta lectura ve el estado real y no una
      // foto de antes de la cola.
      let statusAntes: string | undefined;
      let activaAntes: number | undefined;
      let idsEnElTurno: string[] = [];

      // **La escritura va DENTRO del `antesDeLeer` de `recolocar`, no antes de llamarlo** (ronda
      // de arreglo 1, I-1): así el candado del encuentro se toma antes de tocar esta fila, y dos
      // `setInitiative` a la vez —o uno contra una respuesta de iniciativa— dejan de cruzarse.
      const filas = await recolocar(tx, encounterId, async () => {
        const encuentroActual = await tx.encounter.findUnique({ where: { id: encounterId } });
        statusAntes = encuentroActual?.status;
        activaAntes = encuentroActual?.activePosition ?? undefined;
        if (statusAntes === "ACTIVE" && activaAntes !== undefined) {
          const enElTurno = await tx.combatant.findMany({
            where: { encounterId, position: activaAntes },
          });
          idsEnElTurno = enElTurno.map((f: { id: string }) => f.id);
        }

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
      });

      // **Lo que se pierde no es el número, es a quién señala.** `recolocar` renumera denso, y el
      // número de entradas nunca DECRECE al corregir un combatiente (a lo mucho se le saca de su
      // grupo, nunca se borra a nadie) — así que `activePosition` **siempre** sigue siendo un
      // índice válido dentro del array que lee `advanceTurn`; `posiciones.indexOf(activePosition)`
      // nunca da -1 por esta vía (verificado con la ronda de arreglo de la revisión, matemática y
      // por simulación, en los dos casos: grupo y solitario). Lo que sí puede pasar es que ese
      // mismo número, tras la recolocación, apunte a un combatiente DISTINTO del que tenía el
      // turno —«robo de identidad»—, y **solo cuando el corregido estaba solo en esa posición**
      // (no compartida con idénticos) ese número puede además convertirse en el ÚLTIMO índice del
      // asalto sin serlo de verdad: ahí es donde el siguiente «Pasar turno» sube de asalto y
      // avanza el reloj de campaña seis segundos sin que nadie lo pidiera.
      //
      // **El turno se conserva por identidad, no por número.** `idsEnElTurno` es quién ocupaba
      // `activePosition` justo antes de recolocar — puede ser un grupo entero de idénticos, del
      // que como mucho UNO (`combatantId`) cambia de clave de grupo aquí. Cualquier otro miembro
      // sigue con la misma iniciativa y la misma clave que antes, así que su posición nueva es la
      // que de verdad importa: si el grupo no se partió del todo, todos sus miembros restantes
      // coinciden en ella. Si `combatantId` estaba solo en esa posición, se sigue a sí mismo.
      if (statusAntes === "ACTIVE" && activaAntes !== undefined && idsEnElTurno.length > 0) {
        const representante = idsEnElTurno.find((id) => id !== combatantId) ?? idsEnElTurno[0];
        const filaDelRepresentante = filas.find((f) => f.id === representante);

        let nuevaActiva: number;
        if (filaDelRepresentante) {
          nuevaActiva = filaDelRepresentante.position;
        } else {
          // El combatiente que tenía el turno ya no está en el encuentro (ninguna ruta de hoy lo
          // borra desde aquí, pero `recolocar` no lo garantiza para siempre): se cae a la
          // posición inmediatamente anterior de las que queden, nunca a -1.
          const posicionesRestantes = [...new Set(filas.map((f) => f.position))].sort(
            (a, b) => a - b,
          );
          const anterior = [...posicionesRestantes].reverse().find((p) => p < activaAntes!);
          nuevaActiva = anterior ?? posicionesRestantes[0] ?? 0;
        }

        if (nuevaActiva !== activaAntes) {
          await tx.encounter.update({
            where: { id: encounterId },
            data: { activePosition: nuevaActiva },
          });
        }
      }

      return filas.find((f) => f.id === combatantId)!;
    });
  }

  /**
   * El DM corrige el bando de un combatiente con el combate en marcha — un aliado que traiciona
   * al segundo asalto, o un enemigo que se rinde. **No toca el orden**: `setSide` no llama a
   * `recolocar` porque el bando no decide quién actúa cuándo, solo de qué lado está cada uno.
   */
  async setSide(
    userId: string,
    campaignId: string,
    sessionId: string,
    encounterId: string,
    combatantId: string,
    input: SetSideInput,
  ) {
    await this.membership.requireDM(campaignId, userId);
    // **Los dos escalones, como en `setInitiative` y el resto del servicio** (ronda de arreglo 1,
    // C-1): `requireDM` solo dice que quien llama es DM de ESTA campaña, no que `encounterId`
    // cuelgue de `sessionId`. Sin `sesion()` y sin `encounter: { sessionId }` en el `where`, un DM
    // podía dar el par de identificadores de una campaña ajena y la escritura se confirmaba antes
    // de que `get()` devolviera el 404 — que además nunca deshacía nada, porque este método no
    // corre en transacción.
    await this.sesion(campaignId, sessionId);
    const tocado = await this.prisma.combatant.updateMany({
      where: { id: combatantId, encounterId, encounter: { sessionId } },
      data: { side: input.side },
    });
    if (tocado.count === 0) throw new NotFoundException("Ese combatiente no está en este combate.");
    return this.get(userId, campaignId, sessionId, encounterId);
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

  /**
   * Tarea 3 — cierra la petición de iniciativa, escribe el número en el combatiente y recoloca
   * el orden. Si con ella no queda ninguna petición pendiente, **el combate empieza**.
   *
   * **Lo llama `roll-requests`, no al revés.** `recolocar` es privada de este módulo y es la
   * ÚNICA que sabe convertir «iniciativa + grupo» en «orden»; exponerla sería abrir la puerta a
   * una segunda forma de ordenar. La dirección es acíclica: `encounters` no importa
   * `roll-requests`.
   *
   * **Ronda de arreglo 1 (I-2) — cierra la petición EN ESTA MISMA transacción, no en una que ya
   * confirmó antes de llegar aquí.** Antes, `RollRequestsService.answer` cerraba la petición con
   * su propio `updateMany` y LUEGO abría esta transacción para escribir la iniciativa: si esta
   * fallaba —un deadlock, un `timeout`, una caída— la petición quedaba resuelta para siempre sin
   * que su iniciativa se escribiera nunca, y si era la última el encuentro se quedaba
   * `PREPARING` sin ninguna petición pendiente y sin ninguna puerta que lo sacara de ahí (`end()`
   * exige `ACTIVE`, el índice único parcial cuenta `PREPARING`). Cerrar aquí, con el mismo
   * guardián (`resolvedAt: null` en el `where`), hace que las dos escrituras confirmen juntas o
   * ninguna: si esta transacción se deshace, la petición sigue pendiente y el jugador puede
   * volver a intentarlo — la tirada en sí, hecha antes de llamar aquí por `RollsService.roll` en
   * su propia transacción, no se pierde ni se repite.
   *
   * **Ronda de arreglo 1 (I-3) — si el encuentro ya no está `PREPARING`, no toca nada.** Hoy es
   * inalcanzable —nada saca a un encuentro de `PREPARING` salvo esta misma función—, pero el
   * `force-start` de la tarea 4 lo abrirá: una respuesta que llegara tarde a un combate ya
   * `ACTIVE` recolocaría las posiciones en mitad de la pelea mientras `activePosition` se queda
   * donde estaba, y el puntero de turno pasaría a señalar a otro combatiente sin que nada lo
   * registre. El estado se lee con `bloquearEncuentro`, la misma consulta bloqueante que usa
   * `recolocar`, así que no hay ventana entre leer el estado y decidir.
   */
  async aplicarIniciativaDePeticion(
    encounterId: string,
    requestId: string,
    characterId: string,
    initiative: number,
    resolvedEventId: string,
  ): Promise<{ cerrada: boolean; empezo: boolean }> {
    return this.prisma.transaction(async (tx) => {
      // Mismo guardián que usaba `RollRequestsService.answer` antes de esta ronda: solo toca la
      // fila que SIGUE sin responder. Si no tocó ninguna, otra respuesta ganó la carrera.
      const cerrada = await tx.rollRequest.updateMany({
        where: { id: requestId, resolvedAt: null },
        data: { resolvedAt: new Date(), resolvedEventId },
      });
      if (cerrada.count === 0) return { cerrada: false, empezo: false };

      const estado = await bloquearEncuentro(tx, encounterId);
      if (estado !== "PREPARING") return { cerrada: true, empezo: false };

      await recolocar(tx, encounterId, async () => {
        await tx.combatant.updateMany({
          where: { encounterId, characterId },
          data: { initiative },
        });
      });

      // **Este conteo es el guardián de verdad contra el suceso duplicado, y la mutación de la
      // ronda de arreglo 1 lo confirmó** (bypasearlo puso la prueba de la carrera en rojo — tres
      // sucesos en vez de uno — mientras que mutar el `estado` de arriba o el `updateMany` de
      // abajo, por separado, no la movía). No es casualidad: con el candado del encuentro
      // tomado ANTES (`bloquearEncuentro`, dentro de `recolocar`) y Postgres en `READ
      // COMMITTED`, la transacción que gana la carrera por el candado todavía NO ve el cierre de
      // las otras peticiones —siguen sin confirmar, bloqueadas esperando el mismo candado—, así
      // que ve `pendientes > 0` y sale sin arrancar. Solo la ÚLTIMA en confirmar llega a ver las
      // demás ya cerradas y en cero.
      const pendientes = await tx.rollRequest.count({
        where: { encounterId, resolvedAt: null },
      });
      if (pendientes > 0) return { cerrada: true, empezo: false };

      // **`updateMany` con el estado en el `where`, no `update`, aunque hoy sea cinturón sobre
      // tirantes.** Con el candado del encuentro de por medio, el conteo de arriba ya basta para
      // que como mucho una transacción llegue aquí con `pendientes === 0` — esta comprobación es
      // la misma que usaba `answer` antes de esta ronda para no tirar dos veces, y se deja como
      // segunda red: si algún día el candado se debilita o se quita, esta sigue impidiendo dos
      // arranques sin depender de que la otra se acuerde de hacerlo.
      const arrancado = await tx.encounter.updateMany({
        where: { id: encounterId, status: "PREPARING" },
        data: { status: "ACTIVE" },
      });
      return { cerrada: true, empezo: arrancado.count === 1 };
    });
  }

  /**
   * Tarea 4 — el DM empieza sin esperar a quien no ha tirado. **El servidor tira por él y LO
   * DICE**: la frase importa tanto como el número, porque un jugador que vuelve tiene derecho a
   * saber que su iniciativa no la tiró él (`INITIATIVE_ROLLED_BY_SYSTEM`).
   *
   * **Anular no es responder.** La petición se cierra con `cancelledAt` puesto y
   * `resolvedEventId` nulo — nadie respondió, y confundir las dos haría que la pantalla del
   * jugador dijera que tiró él. `RollRequestsService.answer` lee `cancelledAt` para dar el 409
   * a quien llegue tarde.
   *
   * **Dos carreras posibles, y las dos tienen que acabar bien:**
   *
   * 1. Un jugador responde su propia petición **mientras** este método está en marcha, antes de
   *    que le toque el turno en el bucle. El `updateMany` de abajo lleva el mismo guardián que
   *    usa `aplicarIniciativaDePeticion` (`resolvedAt: null`): si el jugador ganó la carrera, este
   *    `count` sale en cero y el bucle no toca ni el combatiente ni el registro — la iniciativa
   *    que ya escribió el jugador no se pisa.
   * 2. Todas las peticiones se resuelven por su cuenta (el último jugador tira justo mientras el
   *    DM pulsaba el botón) y el encuentro pasa a `ACTIVE` por la vía normal. Este método no lo
   *    sabe hasta que llega a su último `updateMany` de estado, que en ese caso no toca ninguna
   *    fila (`status: "PREPARING"` ya no es cierto) — no revienta, solo no hace nada.
   *
   * **Ronda de arreglo 1 (I-3) — el estado se re-lee bajo el candado del encuentro, dentro de
   * cada iteración, exactamente como hace `aplicarIniciativaDePeticion`.** Si el encuentro deja
   * de ser `PREPARING` entre el `findFirst` de arriba y esta iteración —un `cancel` desde otra
   * pestaña que lo borró, o las peticiones restantes resolviéndose por su cuenta— esta rama
   * corta antes de recolocar posiciones o escribir un suceso sobre un encuentro que ya no está
   * en la ventana que este método existe para cerrar. En la práctica es cinturón sobre tirantes:
   * si `cerrada.count === 1` es porque nadie más cerró esta petición todavía, y eso ya implica
   * que el encuentro no pudo haber terminado de arrancar por la vía normal (le faltaba esta
   * misma petición) ni pudo haberse borrado (el borrado se lleva las peticiones por cascada, así
   * que `cerrada.count` habría sido 0). Se deja igual, con el mismo criterio que ya aplicó la
   * tarea 3 a `aplicarIniciativaDePeticion`: es la protección barata contra el día que ese
   * razonamiento deje de sostenerse.
   *
   * La escritura del combatiente va **dentro** del `antesDeLeer` de `recolocar`, nunca antes de
   * llamarla, por la misma razón que ya obligó a `setInitiative` y a `aplicarIniciativaDePeticion`
   * (ronda de arreglo 1): el candado del encuentro tiene que tomarse antes de tocar la fila del
   * `Combatant`.
   *
   * **Ronda de arreglo 1 (I-1) — si el `updateMany` final arranca el encuentro, se escribe
   * `ENCOUNTER_STARTED`, igual que los otros dos caminos a `ACTIVE`** (`start()` cuando nace
   * activo, `RollRequestsService.answer` cuando la última respuesta lo arranca). Sin esto no
   * había línea «Empieza el combate» en el registro para este camino, y tampoco aviso por el
   * canal en vivo — que se publica dentro de `GameEventsService.record`, no en ningún otro sitio.
   *
   * **Ronda de arreglo 1 (M-8) — un fallo a mitad del bucle deja el encuentro a medias, y es
   * recuperable.** Si la tirada o la transacción de una iteración lanzan (una hoja que deja de
   * derivar, un timeout de base), las peticiones ya procesadas por iteraciones anteriores quedan
   * ancladas y el encuentro sigue `PREPARING` — ni a medio arrancar ni corrupto, solo parado.
   * Volver a llamar a `forceStart` retoma desde ahí: el `findFirst` de arriba solo trae las
   * peticiones que **siguen** `resolvedAt: null`, así que las ya ancladas no se repiten y las
   * restantes se procesan igual que la primera vez.
   */
  async forceStart(userId: string, campaignId: string, sessionId: string, encounterId: string) {
    await this.membership.requireDM(campaignId, userId);
    await this.sesion(campaignId, sessionId);
    const encuentro = await this.prisma.encounter.findFirst({
      where: { id: encounterId, sessionId, status: "PREPARING" },
      include: { rollRequests: { where: { resolvedAt: null }, include: { character: true } } },
    });
    if (!encuentro) throw new NotFoundException("Ese combate no está preparándose.");

    for (const peticion of encuentro.rollRequests) {
      const modificador = await this.sheets.getInitiativeModifier(
        userId,
        campaignId,
        peticion.characterId,
      );
      const resultado = await this.rolls.roll(userId, campaignId, {
        expression: conSigno(modificador),
        label: "Iniciativa",
        characterId: peticion.characterId,
        sessionId,
        mode: "NORMAL",
        spendInspiration: false,
        audience: loVeLaMesa(peticion.character.visibility) ? "PUBLIC" : "DM_PRIVATE",
      });
      if (!resultado.revealed) {
        throw new BadRequestException("La tirada de iniciativa no se pudo leer");
      }

      await this.prisma.transaction(async (tx) => {
        // **Anular no es responder.** `resolvedEventId` se queda nulo: nadie respondió esta
        // petición, y confundirlas haría que la pantalla del jugador dijera que él tiró.
        const cerrada = await tx.rollRequest.updateMany({
          where: { id: peticion.id, resolvedAt: null },
          data: { resolvedAt: new Date(), cancelledAt: new Date() },
        });
        // Carrera 1: el jugador ya la había respondido él mismo. No se pisa su iniciativa ni se
        // escribe un suceso de sistema sobre una tirada que nunca pasó.
        if (cerrada.count === 0) return;

        // I-3: re-lectura bajo el candado del encuentro — ver el docstring de arriba.
        const estado = await bloquearEncuentro(tx, encounterId);
        if (estado !== "PREPARING") return;

        await recolocar(tx, encounterId, async () => {
          await tx.combatant.updateMany({
            where: { encounterId, characterId: peticion.characterId },
            data: { initiative: resultado.total },
          });
        });

        await this.events.record(
          userId,
          campaignId,
          {
            sessionId,
            subjectType: "encounter",
            subjectId: encounterId,
            // M-5: **NO** la visibilidad cruda del personaje — `OWNER_DM` se resuelve contra el
            // actor del suceso, que aquí es el DM, así que un PNJ `OWNER_DM` produciría un aviso
            // que su propio dueño no ve, y `SPECIFIC_PLAYERS` no lo vería nadie sin sus
            // `grantedUserIds` (que aquí no se pasan). Mismo predicado que la audiencia de la
            // tirada, dos líneas más arriba: la mesa lo ve si el personaje la ve, en privado del
            // DM si no.
            visibility: loVeLaMesa(peticion.character.visibility) ? "PLAYERS" : "DM_ONLY",
            payload: {
              type: "INITIATIVE_ROLLED_BY_SYSTEM",
              characterId: peticion.characterId,
              characterName: peticion.character.name,
              total: resultado.total,
            },
          },
          tx,
        );
      });
    }

    // Carrera 2: si todas las peticiones ya se resolvieron por su cuenta, el encuentro puede
    // haber pasado a `ACTIVE` sin este método — el `where` no encuentra nada que tocar y no pasa
    // nada.
    const arrancado = await this.prisma.encounter.updateMany({
      where: { id: encounterId, status: "PREPARING" },
      data: { status: "ACTIVE" },
    });
    // I-1: **este** es el camino que de verdad arrancó el combate — los otros dos ya escriben el
    // suyo (`start()` al nacer activo, `answer()` cuando la última respuesta normal lo arranca).
    if (arrancado.count === 1) {
      await this.events.record(userId, campaignId, {
        sessionId,
        subjectType: "encounter",
        subjectId: encounterId,
        visibility: "PLAYERS",
        payload: { type: "ENCOUNTER_STARTED", encounterId },
      });
    }
    return this.get(userId, campaignId, sessionId, encounterId);
  }

  /**
   * Tarea 4 — el DM se arrepiente antes de empezar. **Se BORRA, no se marca `ENDED`**: un
   * combate que nunca empezó no es historia, es un clic deshecho, y dejarlo llena el registro de
   * ruido (decisión del autor, 2026-09-05).
   *
   * **Ronda de arreglo 1 (I-4) — envuelto en transacción, e hijos antes que padre.** Los demás
   * caminos del módulo bloquean primero la `RollRequest` (un `updateMany` sobre su fila) y
   * después el `Encounter` (`bloquearEncuentro`, dentro de `recolocar` o llamado directo); este
   * método hacía lo contrario —borraba el `Encounter` primero y dejaba que la cascada de la base
   * se llevara las peticiones después—, y un `cancel` concurrente con una respuesta o con un
   * `force-start` competía por los candados en el orden opuesto: la misma familia de
   * interbloqueo (`40P01`) que cerró la ronda de arreglo de la tarea 3. Ahora se borran las
   * `RollRequest` primero, a mano, y el `Encounter` después; si el `Encounter` no calificaba
   * (`status` ya no es `PREPARING`, o no existe), el `ConflictException` se lanza **dentro** de
   * la transacción — Prisma deshace el borrado de las peticiones con ella, así que un intento
   * fallido no deja nada a medias.
   *
   * **M-7 — no escribe ningún suceso, y es a propósito.** El encuentro deja de existir: un
   * suceso con `subjectType: "encounter"` sobre un sujeto borrado sería exactamente la historia
   * que la decisión del autor dice que no se guarda. El coste de esto —al jugador con una
   * petición de iniciativa pendiente se le borra de la bandeja sin explicación— queda anotado en
   * `docs/06-pendientes.md`: si algún día hay que avisarle, el sujeto tendría que ser la
   * **sesión**, porque el encuentro ya no está para serlo.
   */
  async cancel(userId: string, campaignId: string, sessionId: string, encounterId: string) {
    await this.membership.requireDM(campaignId, userId);
    await this.sesion(campaignId, sessionId);
    await this.prisma.transaction(async (tx) => {
      await tx.rollRequest.deleteMany({ where: { encounterId } });
      const borrado = await tx.encounter.deleteMany({
        where: { id: encounterId, sessionId, status: "PREPARING" },
      });
      if (borrado.count === 0) {
        throw new ConflictException("Ese combate ya empezó: no se puede cancelar, se termina.");
      }
    });
  }
}
