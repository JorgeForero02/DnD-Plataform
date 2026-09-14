import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  SEGUNDOS_POR_ASALTO,
  tableRulesSchema,
  xpPorVd,
  type CombatantSide,
  type EconomiaDelTurno,
  type GastarInput,
  type SetInitiativeInput,
  type SetSideInput,
  type StartEncounterInput,
  type XpPropuesto,
} from "@dnd/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { CharacterSheetService } from "../characters/character-sheet.service";
import { RollsService } from "../rolls/rolls.service";
import { GameClockService } from "../game-clock/game-clock.service";
import { StatblocksService } from "../statblocks/statblocks.service";
import { canView, loVeLaMesa } from "../common/visibility";
import { viewerFor } from "../common/character-viewer";

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
    private readonly statblocks: StatblocksService,
  ) {}

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
    // **Y «suyo» es «su dueño es un DM de esta campaña», no «su dueño es quien pulsó el botón»**
    // (ficha P2 «con más de un DM», cerrada el 2026-09-10). Con dos DM —posible desde el plan
    // 11— el PNJ del otro caía en `ajenos` y recibía una petición de iniciativa que no tiene por
    // qué: el otro DM no es un jugador esperando su turno, es el otro árbitro de la mesa. Quien
    // empieza sigue siendo quien tira; solo cambia por quién.
    const dms = new Set(
      (
        await this.prisma.campaignMember.findMany({
          where: { campaignId, role: "DM" },
          select: { userId: true },
        })
      ).map((m) => m.userId),
    );
    const suyos = combatientes.filter((c) => dms.has(c.ownerId));
    const ajenos = combatientes.filter((c) => !dms.has(c.ownerId));

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
      // **Se devuelve por `get()`, como la mayoría de sus hermanos.** Lo hacen `current()`,
      // `setSide()` y `forceStart()` — comprobado con `grep -n "return this.get("` sobre este
      // fichero, y **no de memoria**: la primera versión de este comentario decía «`current()`,
      // `advanceTurn()` y `forceStart()`» y era **falso**, porque `advanceTurn` devuelve
      // `{ ...actualizado, roundAdvanced }`. El comentario carga con el argumento entero del
      // cambio, así que equivocarse en un nombre lo invalidaba entero.
      //
      // **Y quedan dos fuera del patrón, que no son de esta tarea**: `advanceTurn()` y
      // `setInitiative()` siguen devolviendo filas crudas tipadas como `Encounter` en el cliente.
      // Es la misma deuda que esta ficha cerró aquí, y tiene la suya en `docs/06-pendientes.md`. Devolvía las filas crudas de `Combatant`, sin
      // `derrotado` y sin `finalPropuesto`, mientras el cliente lo tipa como `Encounter` — o sea
      // que no validaba contra `encounterSchema` desde que el combate propone su final.
      //
      // **Y no pierde nada al pasar por el filtro de `get()`, comprobado y no supuesto:** este
      // método empieza por `requireDM`, y `canView` devuelve `true` para el DM en su segunda
      // línea (`common/visibility.ts:24`). El espectador de esta llamada es siempre quien lo ve
      // todo, así que ni se recorta un combatiente ni se renumera nada que no estuviera ya denso.
      //
      // La primera vez esto se revirtió porque tumbaba cuatro pruebas de este servicio. **El
      // defecto estaba en ellas**: afirmaban sobre el valor devuelto por comodidad, no porque el
      // valor devuelto fuera lo que probaban. Reapuntadas a lo que `start()` **escribe**, siguen
      // siendo pruebas de comportamiento y ya no dependen de por dónde vuelva la respuesta.
      return this.get(userId, campaignId, sessionId, creado.encounter.id);
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

    // Puerta de efectos §5 bis (D-CF-68, spec §5b.3). **Se PROPONE, no se aplica**: SRD 5.1,
    // Monsters · Experience Points: «Typically, XP is awarded for defeating the monster, although
    // the GM may also award XP for neutralizing the threat posed by the monster in some other
    // manner.» Un reparto automático contradiría ese «typically» — el DM confirma (o edita) en
    // «Dar XP». Se lee ANTES de la transacción: no cambia nada, así que no hace falta bloquear.
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { tableRules: true },
    });
    const regla = tableRulesSchema.parse(campaign?.tableRules ?? {});
    let xpPropuesto: XpPropuesto | undefined;
    if (regla.progresion === "XP") {
      const combatientes = await this.prisma.combatant.findMany({
        where: { encounterId: encounter.id },
        include: {
          character: { select: { id: true, name: true, statblockRef: true, archivedAt: true } },
        },
      });
      const desglose: XpPropuesto["desglose"] = [];
      for (const c of combatientes.filter((c) => c.side === "ENEMY" && c.character.statblockRef)) {
        const sb = await this.statblocks.resolver(campaignId, c.character.statblockRef!);
        if (sb) {
          desglose.push({
            characterId: c.character.id,
            name: c.character.name,
            cr: sb.cr,
            xp: xpPorVd(sb.cr),
          });
        }
      }
      // D-CF-69: solo `ALLY` sin `statblockRef` puede recibir XP — un PNJ jugable no tiene nivel
      // al que avanzar, y `NEUTRAL` nunca fue del bando que ganó el combate.
      const destinatarios = combatientes
        .filter((c) => c.side === "ALLY" && !c.character.statblockRef && !c.character.archivedAt)
        .map((c) => ({ characterId: c.character.id, name: c.character.name }));
      const total = desglose.reduce((s, d) => s + d.xp, 0);
      xpPropuesto =
        total > 0 && destinatarios.length > 0
          ? { total, porCabeza: Math.floor(total / destinatarios.length), destinatarios, desglose }
          : undefined;
    }

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
      // `end()` ya exige DM (arriba), así que la propuesta —que nombra al enemigo y su VD— solo
      // la ve él: no viaja por el suceso de la mesa, solo por esta respuesta HTTP.
      return {
        id: cerrado.id,
        status: cerrado.status,
        ...(xpPropuesto ? { xpPropuesto } : {}),
      };
    });
  }

  async get(userId: string, campaignId: string, sessionId: string, encounterId: string) {
    await this.membership.requireMember(campaignId, userId);
    await this.sesion(campaignId, sessionId);
    const viewer = await viewerFor(this.prisma, this.membership, userId, campaignId);

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
        // **La economía del turno, desde la ronda de arreglo 1 de A3/A11.** Las cuatro columnas
        // ya existían en la fila (tarea A2) y `gastar()` ya las devolvía en su propia respuesta;
        // lo que faltaba era que ESTA respuesta —la que la tira de iniciativa sondea de verdad—
        // las llevara también. Sin esto, un gasto que llegaba por una puerta distinta de
        // `PATCH .../spend` (`ActivitiesService.usar`, tarea A11) nunca se reflejaba aquí, y el
        // cliente tenía que inventarse un estado propio que se desincronizaba en cuanto alguien
        // gastaba por la otra puerta. Misma visibilidad que el resto de la fila: no hace falta un
        // filtro nuevo, `canView` ya decidió si este combatiente se ve.
        actionUsed: c.actionUsed,
        bonusUsed: c.bonusUsed,
        reactionUsed: c.reactionUsed,
        movementUsed: c.movementUsed,
        // **Cayó.** `currentHp` es nulable y `null` significa «a tope» (así lo escribe
        // `rest.service.ts:117` al descansar), así que la comparación es contra 0 y no una
        // falsedad: `null` no es cero. No se llama `muerto` porque no lo está — ver el contrato.
        derrotado: c.character.currentHp === 0,
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

    // **La propuesta de terminar, y se calcula sobre TODOS los combatientes, no sobre los
    // visibles.** Sobre los visibles, un jugador que no ve al último goblin escondido recibiría
    // «ya no queda ninguno en pie» — que es exactamente la fuga que el filtro de arriba existe
    // para impedir. Por eso se mira `encounter.combatants` y no `combatants`, y por eso el
    // resultado **solo se le entrega al DM**: es su gesto y es su información.
    //
    // Que haya al menos un `ENEMY` es parte de la condición: un encuentro de exploración sin
    // enemigos no debe ofrecerse a cerrarse por vacuidad —«todos los enemigos han caído» es
    // trivialmente cierto sobre una lista vacía, y sería un aviso falso en cada encuentro social.
    const enemigos = encounter.combatants.filter((c) => c.side === "ENEMY");
    const esDm = viewer.role === "DM";
    const finalPropuesto =
      esDm && enemigos.length > 0 && enemigos.every((c) => c.character.currentHp === 0);

    return {
      id: encounter.id,
      sessionId: encounter.sessionId,
      status: encounter.status,
      round: encounter.round,
      activePosition: activaVisible,
      combatants: combatants.map((c) => ({ ...c, position: densa.get(c.position)! })),
      finalPropuesto,
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

    await this.prisma.transaction(async (tx) => {
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
          const actualizado = await tx.encounter.update({
            where: { id: encounterId },
            data: { activePosition: nuevaActiva },
          });
          // **Y se dice** (paso 1, tarea 16). Este reajuste cambia de combatiente el turno activo
          // sin que nadie pase turno, y hasta hoy no escribía nada: una segunda pestaña seguía
          // señalando a quien ya no le toca hasta que refrescara. Va en la misma transacción que
          // la escritura: si el reajuste se deshace, el aviso se va con él.
          await this.events.record(
            userId,
            campaignId,
            {
              sessionId,
              subjectType: "encounter",
              subjectId: encounterId,
              visibility: "PLAYERS",
              // **Sin posiciones ni nombres**, por lo mismo que `TURN_ADVANCED`: el suceso es
              // `PLAYERS` y la ficha del encuentro renumera denso justo para que nadie cuente los
              // huecos de los combatientes que no ve.
              payload: {
                type: "ACTIVE_TURN_SHIFTED",
                encounterId,
                round: actualizado.round,
              },
            },
            tx,
          );
        }
      }

      // **El encuentro entero, no la fila que se tocó** (ficha P3, 2026-09-08): el cliente lo
      // tipa como `Encounter` y devolvía un solo `Combatant`. **Sin `roundAdvanced`**: corregir
      // una iniciativa no cambia de asalto, y añadirlo por simetría con `advanceTurn()` afirmaría
      // algo que aquí no ocurre. Y `get()` va **fuera** de la transacción, por lo mismo que en
      // `advanceTurn()`: leer por el pool con una transacción abierta pide una segunda conexión.
      // La transacción ya no devuelve la fila a nadie: la respuesta se compone fuera.
      return filas.find((f) => f.id === combatantId)!;
    });

    return this.get(userId, campaignId, sessionId, encounterId);
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
    // **Se lee el bando de antes dentro de la misma transacción que lo cambia** (paso 1, tarea
    // 16): el suceso dice **de qué lado a cuál**, y leerlo fuera dejaría un hueco en el que otro
    // DM lo cambiara y el registro contara una corrección que no ocurrió.
    await this.prisma.transaction(async (tx) => {
      const antes = await tx.combatant.findFirst({
        where: { id: combatantId, encounterId, encounter: { sessionId } },
        select: { side: true },
      });
      if (!antes) throw new NotFoundException("Ese combatiente no está en este combate.");

      await tx.combatant.update({ where: { id: combatantId }, data: { side: input.side } });

      // **Y ahora deja rastro.** `setSide` no escribía ningún suceso, así que una segunda pestaña
      // no se enteraba de la corrección hasta refrescar: el canal en vivo se alimenta de sucesos.
      if (antes.side !== input.side) {
        await this.events.record(
          userId,
          campaignId,
          {
            sessionId,
            subjectType: "encounter",
            subjectId: encounterId,
            visibility: "PLAYERS",
            payload: {
              type: "COMBATANT_SIDE_CHANGED",
              encounterId,
              from: antes.side,
              to: input.side,
            },
          },
          tx,
        );
      }
    });
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

    await this.prisma.transaction(async (tx) => {
      // Ya no se recoge el resultado: la respuesta se compone fuera con `get()`, y quedarse la
      // fila aquí solo invitaría a devolverla otra vez.
      await tx.encounter.update({
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

      // **Aquí se cruza el borde de turno** (paso 1, tarea 4). Quien empieza turno corta las
      // condiciones que esperaban justamente eso —hoy, la marca de la acción Ayudar, que el SRD
      // mantiene hasta *«the start of your next turn»* de quien ayudó—.
      //
      // No se borran: se les pone `expiresAtClock` al reloj de este instante y se les quita el
      // borde, así que a partir de aquí «¿está vencida?» vuelve a ser la resta de siempre y la
      // condición **sigue en la hoja, marcada** (D-2C-2). Va dentro de esta transacción: si el
      // turno no avanza, la ventaja no se pierde.
      const empiezanTurno = encounter.combatants
        .filter((c) => c.position === toPosition)
        .map((c) => c.characterId);
      if (empiezanTurno.length > 0) {
        const reloj = await tx.campaign.findUniqueOrThrow({
          where: { id: campaignId },
          select: { clockSeconds: true },
        });
        await tx.characterCondition.updateMany({
          where: { expiryEdge: "sourceStart", sourceCharacterId: { in: empiezanTurno } },
          data: { expiryEdge: null, sourceCharacterId: null, expiresAtClock: reloj.clockSeconds },
        });
      }

      // **Paso 2, tarea A1 — la economía del turno se repone al EMPEZAR, no al terminar.** SRD
      // 5.1, «Reactions»: *«you regain your reaction at the start of your turn»*. Por eso esto
      // toca a quien entra en `toPosition` y no a quien sale de `encounter.activePosition`: entre
      // el final de un turno y el principio del siguiente nadie tiene reacción, y es justo lo que
      // hace que solo se pueda reaccionar una vez por asalto. Se repone por `position`, no por
      // fila, porque varios combatientes —seis goblins idénticos— comparten posición y actúan a
      // la vez.
      await tx.combatant.updateMany({
        where: { encounterId: encounter.id, position: toPosition },
        data: { actionUsed: false, bonusUsed: false, reactionUsed: false, movementUsed: 0 },
      });

      // **El encuentro entero por `get()`, y `roundAdvanced` AL LADO** (ficha P3, 2026-09-08).
      //
      // Devolvía `{ ...actualizado, roundAdvanced }`: la fila cruda, sin `combatants` y sin
      // `finalPropuesto`, mientras el cliente lo tipa como `Encounter`. Ahora sigue el patrón de
      // `start()`, `current()`, `setSide()` y `forceStart()`.
      //
      // **Por qué al lado y no dentro ni derivado**, y lo decidió una medición: `roundAdvanced` no
      // lo consume **ninguna** pantalla. Derivarlo obligaría a quien llama a recordar el asalto
      // anterior para compararlo, o sea inventar trabajo para nadie; borrarlo tiraría un dato real
      // que el servidor ya sabe y que cuatro pruebas fijan. Va fuera del objeto que valida contra
      // `encounterSchema` porque **no es parte del encuentro**: es qué pasó en esta llamada.
      //
      // **La transacción devuelve solo el dato; `get()` se llama FUERA de ella.** Leer con
      // `this.prisma` dentro de una transacción abierta pide una segunda conexión del pool
      // mientras la primera sigue tomada, que es exactamente el defecto que este proyecto ya
      // arregló tres veces (`3524ef7`, `85d0882`, `6b16804`). `setSide()` lo hace así.
      // La transacción no devuelve nada: `sube` se calculó antes de abrirla y sigue en alcance.
    });

    return { ...(await this.get(userId, campaignId, sessionId, encounterId)), roundAdvanced: sube };
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

      // **Y ahora avisa** (D-A-3, decisión del autor del 2026-09-06, que corrige E-IB-18).
      //
      // Aquí no se escribía nada a propósito —«no es historia, es un clic deshecho»— y el coste
      // quedó anotado: a quien tenía una petición de iniciativa pendiente **le desaparecía la
      // entrada de la bandeja sin explicación**. El motivo del cambio es el jugador, no el
      // historial.
      //
      // **El sujeto es la SESIÓN y no el encuentro**, que ya no existe para serlo, y el suceso no
      // lleva `encounterId`: sería una referencia a una fila borrada. Va **dentro de la misma
      // transacción** que el borrado: si el borrado se deshace, el aviso no puede quedarse.
      await this.events.record(
        userId,
        campaignId,
        {
          sessionId,
          subjectType: "session",
          subjectId: sessionId,
          visibility: "PLAYERS",
          payload: { type: "ENCOUNTER_CANCELLED" },
        },
        tx,
      );
    });
  }

  /**
   * Paso 2, tarea A2 — gasta un trozo de la economía del turno (`action-economy.schema.ts`).
   *
   * **«El sistema propone; tú decides».** Si ya estaba gastado —o el movimiento se pasa de su
   * velocidad— `excedido` sale en `true`, pero la escritura se hace igual: hay decenas de rasgos
   * que regalan una acción extra y ninguno estará modelado el primer día. Bloquear sería el
   * servidor arbitrando la mesa, la misma decisión que ya se tomó con el bando y con el fin del
   * combate.
   *
   * **Lo que sí es del servidor es quién escribe.** Dueño del personaje o DM — el mismo criterio
   * que `CharactersService.requireEditable` usa para editar una ficha, repetido aquí sin
   * importarlo porque ese servicio no está en la frontera de este encargo—: un jugador no gasta
   * por el combatiente de otro, y eso sí es un 403.
   *
   * **Salvo que ese combatiente no debiera ni saber que existe.** Un PNJ `DM_ONLY` que `get()` ya
   * le escondía (filtrando por `canView`, su dueño único de «quién ve qué») no puede convertirse
   * en 403 aquí: `docs/04-convenciones.md` es literal —*«un 403 sobre algo que no deberías saber
   * que existe es una filtración: va 404»*—, y la excepción de esa regla («quien pregunta ya sabe
   * que existe») no se aplica cuando el listado se lo oculta. Por eso el guardián se parte en dos
   * comprobaciones distintas, no una: primero si LO VE, y solo si lo ve, si puede ESCRIBIR.
   *
   * `input.cantidad` solo importa con `MOVEMENT`, en pies. **La velocidad sale de la hoja
   * derivada** (`CharacterSheetService.getSheet`, con su propia traza de condiciones) y no se
   * recalcula aquí — sería una segunda fórmula separándose de la primera la próxima vez que una
   * condición cambie la velocidad. **Sin velocidad de caminar en la hoja no es «velocidad cero»,
   * es «no lo sé»** — un statblock a medio construir no tiene por qué declarar `walk`, y tratar
   * ese hueco como cero convertiría cualquier movimiento en un aviso falso.
   *
   * El estado se relee **dentro** de la transacción, justo antes de escribir: es el gasto que de
   * verdad se está aplicando, no una foto de antes de la cola. El suceso se escribe en la MISMA
   * transacción que la fila, igual que el resto del módulo.
   */
  async gastar(
    userId: string,
    campaignId: string,
    sessionId: string,
    encounterId: string,
    combatantId: string,
    input: GastarInput,
  ): Promise<{ economia: EconomiaDelTurno; excedido: boolean }> {
    await this.membership.requireMember(campaignId, userId);
    await this.sesion(campaignId, sessionId);

    const combatiente = await this.prisma.combatant.findFirst({
      where: { id: combatantId, encounterId, encounter: { sessionId } },
      include: { character: true },
    });
    if (!combatiente) throw new NotFoundException("Combatant not found");

    // **Primero si lo VE, con `canView` — el mismo filtro que `get()` aplica sobre este mismo
    // `character`.** Un combatiente que la ficha del encuentro ya esconde no puede delatarse por
    // la puerta trasera de un 403: si no lo ve, la respuesta es la misma que un id inventado.
    const viewer = await viewerFor(this.prisma, this.membership, userId, campaignId);
    if (
      !canView(viewer, {
        visibility: combatiente.character.visibility,
        createdById: combatiente.character.ownerId,
        grantedUserIds: [],
      })
    ) {
      throw new NotFoundException("Combatant not found");
    }

    // **Y solo si lo ve, si puede ESCRIBIR.** Dueño o DM, nunca un jugador ajeno — esto sí es un
    // 403: el combatiente es visible, lo que falta es permiso para gastar por él.
    const miembro = await this.membership.getMembership(campaignId, userId);
    if (miembro?.role !== "DM" && combatiente.character.ownerId !== userId) {
      throw new ForbiddenException("Solo el dueño del personaje o el DM pueden gastar por él");
    }

    // Solo MOVEMENT necesita saber cuánta velocidad hay — el resto de costes no la usan para
    // nada, y pedirla siempre sería una consulta de más en el camino caliente del combate.
    // `undefined` cuando la hoja no declara `walk`: no hay velocidad que comparar, así que nunca
    // se puede decir que se pasó de ella.
    let velocidad: number | undefined;
    if (input.coste === "MOVEMENT") {
      const hoja = await this.sheets.getSheet(userId, campaignId, combatiente.characterId);
      velocidad = hoja.effectiveSpeeds.walk?.total;
    }

    return this.prisma.transaction(async (tx) => {
      const actual = await tx.combatant.findFirst({ where: { id: combatantId } });
      if (!actual) throw new NotFoundException("Combatant not found");

      let excedido: boolean;
      let data: Record<string, boolean | number>;
      switch (input.coste) {
        case "ACTION":
          excedido = actual.actionUsed;
          data = { actionUsed: true };
          break;
        case "BONUS":
          excedido = actual.bonusUsed;
          data = { bonusUsed: true };
          break;
        case "REACTION":
          excedido = actual.reactionUsed;
          data = { reactionUsed: true };
          break;
        case "MOVEMENT": {
          const nuevo = actual.movementUsed + (input.cantidad ?? 0);
          excedido = velocidad === undefined ? false : nuevo > velocidad;
          data = { movementUsed: nuevo };
          break;
        }
        case "FREE":
          // No consume nada y nunca excede: es la interacción libre. Se registra igual, para
          // que la mesa la vea — por eso sigue hasta `events.record` sin tocar ninguna columna.
          excedido = false;
          data = {};
          break;
      }

      const actualizado =
        Object.keys(data).length > 0
          ? await tx.combatant.update({ where: { id: combatantId }, data })
          : actual;

      await this.events.record(
        userId,
        campaignId,
        {
          sessionId,
          subjectType: "character",
          subjectId: combatiente.characterId,
          // **La visibilidad del PERSONAJE, no `PLAYERS` fija** — mismo motivo que
          // `ATTACK_RESOLVED`: un PNJ escondido no puede anunciarle a la mesa que gastó su turno
          // solo por haber gastado algo.
          visibility: combatiente.character.visibility,
          payload: {
            type: "ACTION_SPENT",
            encounterId,
            combatantId,
            coste: input.coste,
            ...(input.coste === "MOVEMENT" ? { cantidad: input.cantidad } : {}),
            excedido,
          },
        },
        tx,
      );

      return {
        economia: {
          actionUsed: actualizado.actionUsed,
          bonusUsed: actualizado.bonusUsed,
          reactionUsed: actualizado.reactionUsed,
          movementUsed: actualizado.movementUsed,
        },
        excedido,
      };
    });
  }
}
