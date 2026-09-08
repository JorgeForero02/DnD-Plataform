import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import {
  CLAVE_AYUDA,
  SEGUNDOS_POR_ASALTO,
  esClaveReservada,
  type ApplyConditionInput,
  type SrdCondition,
  type HelpInput,
  type Visibility,
} from "@dnd/shared";
import { CONCENTRATION_KEY_PREFIX, esConcentracion } from "../concentration/concentration";
import { condicionVencida } from "./vencimiento";
import { MembershipService } from "../../campaigns/membership.service";
import { GameEventsService } from "../../game-events/game-events.service";
import { PrismaService } from "../../prisma/prisma.service";
import { StatblocksService } from "../../statblocks/statblocks.service";
import { requireOwnerOrDM, requireVisibleCharacter } from "../../common/character-viewer";

// Tarea 2A.12 — condiciones. **La clave es libre**: las quince del SRD (`SRD_CONDITIONS`,
// `@dnd/shared`) las entiende el motor de velocidad efectiva (`../speed/effective-speed.ts`);
// cualquier otra se guarda y se enseña igual, y no calcula nada.
//
// **Y desde el paso 1 (2026-09-06) este servicio SÍ distingue las dos, al escribir y al borrar.**
// Aquí ponía lo contrario —«esa distinción es asunto de quien LEE las condiciones, no de quien las
// guarda»— y era exactamente el argumento que dejó el agujero: quien lee busca `helped` **solo por
// clave**, así que si quien guarda no mira nada, escribir la clave a mano es concederse la
// mecánica. Guardar y leer no son independientes cuando lo guardado es una entrada del motor.

@Injectable()
export class ConditionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: GameEventsService,
    /**
     * **Obligatorio, y aquí ponía que era opcional «porque varios e2e montan
     * `CharacterStateModule` solo».** Era falso: hay uno, y lo monta junto a `AppModule`. Lo que
     * sí hacía el `@Optional()` era que un fallo futuro de cableado **apagara la comprobación de
     * inmunidad en silencio** — una regla que falla abierta. `character-state.module.ts` importa
     * `StatblocksModule`, así que el proveedor está siempre.
     */
    private readonly statblocks: StatblocksService,
  ) {}

  /**
   * A qué condiciones es inmune este personaje, **según el statblock del que salió**.
   *
   * Devuelve `[]` cuando no hay statblock, que es el caso de **todo personaje jugador**
   * (`characters.service.ts` filtra `statblockRef: null` a propósito). Es el mismo camino que ya
   * usa `changeHp` para los modificadores de daño: `character.statblockRef` + la puerta única
   * `StatblocksService.resolver`.
   */
  private async inmunidadesDe(
    character: {
      statblockRef: string | null;
    },
    campaignId: string,
    /** El cliente de la transacción de quien llama, si hay una — ver `apply` y la ficha P2-0. */
    tx?: Prisma.TransactionClient,
  ): Promise<readonly SrdCondition[]> {
    if (!character.statblockRef) return [];
    const statblock = await this.statblocks.resolver(
      campaignId,
      character.statblockRef,
      undefined,
      tx,
    );
    return statblock?.conditionImmunities ?? [];
  }

  /**
   * Las condiciones del personaje, **cada una diciendo si ya venció** (2C.4).
   *
   * `expired` se calcula contra el reloj de la campaña y **no se guarda**: guardarlo sería una
   * segunda verdad que puede discrepar de la primera, y obligaría a un barrido periódico que, si
   * no corre, dejaría una condición frenando a alguien después de su hora.
   *
   * **Y la vencida sigue en la lista.** Es la decisión D-2C-2 del autor: vence sola, pero no
   * desaparece — queda marcada, y el DM la retira o la renueva. Si se borrara, el jugador vería
   * cambiar sus números sin saber por qué.
   */
  async list(userId: string, campaignId: string, characterId: string) {
    await requireVisibleCharacter(this.prisma, this.membership, userId, campaignId, characterId);
    const [filas, campana] = await Promise.all([
      this.prisma.characterCondition.findMany({
        where: { characterId },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } }),
    ]);
    return filas.map((fila) => ({
      ...fila,
      expired: condicionVencida(fila, campana.clockSeconds),
    }));
  }

  /**
   * Aplicar: DM o dueño, **con una excepción que no es de propiedad sino de clave** — una condición
   * que el servidor interpreta (las quince del SRD, y `helped`) no se escribe por aquí salvo que
   * quien llame sea el DM, y `helped` no se escribe por aquí nunca. Ver `esClaveReservada`.
   *
   * Aplicar dos veces la misma clave la reemplaza, no la duplica.
   *
   * **`tx` opcional, aditivo (tarea A7, vuelta de arreglo 1).** Usar una actividad aplica su
   * efecto y sus `effects[]` en la misma transacción — «gasté el recurso y la condición no se
   * aplicó» es exactamente el estado a medias que ese encargo existe para impedir. Mismo patrón
   * que `CharacterSheetService.changeHp` y `RollRequestsService.create`: el cuerpo que escribe se
   * extrae a un método privado que recibe el cliente; **sin `tx` no cambia nada**.
   *
   * Las comprobaciones de arriba (visibilidad, dueño-o-DM, clave reservada, inmunidad) siguen
   * contra `this.prisma`/`this.membership`/`this.statblocks` **incluso con `tx`** — a diferencia
   * de `changeHp` y `create`, que sí se movieron al cliente de la transacción en la vuelta de
   * arreglo 1 (I2). **Y desde la ficha P2-0 (2026-09-07) aquí sí se hace**: con `tx`, tanto
   * `requireVisibleCharacter` como `inmunidadesDe` van contra ese cliente. Lo que faltaba era que
   * `StatblocksService.resolver` aceptara un cliente por fuera, y ahora lo acepta —el mismo
   * parámetro opcional que el resto de esta tanda—. Las tres consultas que siguen yendo
   * por el pool son las de `MembershipService`, que no tiene esa puerta — el resto del hueco, con
   * su medición escrita en el cuerpo de la ficha P2-0 (`docs/06-pendientes.md`).
   *
   * **`concedidoPorActividad`, aditivo, ronda de arreglo 1 de A11 (crítico 2).** `raging` se
   * volvió clave reservada (`esClaveReservada`, `@dnd/shared`) para cerrar el agujero por el que
   * cualquier jugador podía escribírsela a sí mismo sin gastar nada — pero `ActivitiesService.usar`
   * llama a este mismo método para aplicar `effects[]` **como el jugador que usó la actividad**,
   * no como el DM, y una Furia que solo el DM pudiera activar no sería la Furia.
   *
   * **Por qué HTTP nunca puede activarlo, y la razón FUERTE, no la débil (ronda de arreglo 2).**
   * `ConditionsController` no lo pasa nunca al llamar a `apply` — eso ya bastaría por sí solo, y
   * es la razón real: el cuerpo de la petición entra como CUARTO argumento posicional y
   * `opciones` es el SEXTO, así que ningún controlador que arme esta llamada con el cuerpo puede
   * alcanzarlo sin escribir el código para hacerlo. Que `opciones.concedidoPorActividad` **tampoco**
   * esté en `applyConditionSchema` es una segunda cerradura, no la primera: un `z.object` de Zod 3
   * descarta claves desconocidas por defecto, pero esa protección desaparece el día que alguien le
   * ponga `.passthrough()` a ese esquema por otro motivo. La razón posicional no depende de eso.
   *
   * **Quien SÍ lo abre tiene que acotarlo él mismo.** Este método no decide a quién se le puede
   * conceder algo "porque una actividad lo pide" — eso lo decide `ActivitiesService.usar`, que
   * solo lo pasa `true` cuando `destino.id === actor.id` (ver su propio comentario y su prueba:
   * "hacia un objetivo que NO es quien usa la actividad viaja con `concedidoPorActividad: false`,
   * aunque sea la MISMA jugadora"). Sin ese acotamiento en el llamador, un usuario con dos
   * personajes podría usar una actividad con `effects` y `objetivos` para ponerle una condición
   * reservada a su OTRO personaje sin que decida el DM — el mismo diputado confundido de siempre,
   * solo que a través de esta puerta en vez de otra.
   */
  async apply(
    userId: string,
    campaignId: string,
    characterId: string,
    input: ApplyConditionInput,
    tx?: Prisma.TransactionClient,
    opciones?: { concedidoPorActividad?: boolean },
  ) {
    const character = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
      tx,
    );
    const esDM = await requireOwnerOrDM(
      this.membership,
      campaignId,
      userId,
      character,
      "Solo el DM o el dueño puede aplicar una condición.",
    );

    // **La marca de Ayudar la pone `help()`, y nadie más.** Por esta ruta no entra ni el DM:
    // `ayudaViva` la busca **solo por clave** (`character-sheet.service.ts`), sin mirar quién la
    // puso ni si hubo ayudante, así que escribirla a mano es concederse ventaja saltándose los
    // tres controles de la acción.
    if (input.key === CLAVE_AYUDA) {
      throw new ForbiddenException(
        "La ventaja de Ayudar la concede la acción Ayudar, no esta ruta.",
      );
    }
    // **Una condición del SRD la pone el DM.** Un jugador puede anotarse lo que quiera sobre sí
    // mismo —una nota no calcula nada—, pero no darse un estado que el motor lee para decidir
    // tiradas y velocidad. El coste conocido de la regla, y se acepta a propósito: tumbarse solo
    // pasa a pedírselo al DM, porque `prone` es una de las quince.
    if (esClaveReservada(input.key) && !esDM && !opciones?.concedidoPorActividad) {
      throw new ForbiddenException("Esa condición la aplica el DM.");
    }

    // **Una inmunidad que nadie consulta es prosa.** El statblock del que sale un PNJ ya declara a
    // qué es inmune, y hasta hoy nadie leía el campo: se podía envenenar a un esqueleto con su
    // inmunidad escrita al lado. Es un 400 **con su motivo**, no un silencio ni una fila guardada.
    // **Un jugador nunca llega hasta aquí con una inmunidad, y no es casualidad que importe.**
    // Las quince inmunidades posibles son exactamente las claves reservadas, así que el 403 de
    // arriba lo para antes: el 400 que dice «X es inmune» —que revela algo de un statblock que
    // puede ser `DM_ONLY`— solo lo puede ver el DM, que ya podía leerlo. Si algún día una
    // inmunidad dejara de ser clave reservada, este orden habría que rehacerlo, y hay un e2e que
    // se pondría rojo.
    const inmunidades = await this.inmunidadesDe(character, campaignId, tx);
    if ((inmunidades as readonly string[]).includes(input.key)) {
      throw new BadRequestException(`${character.name} es inmune a esa condición.`);
    }

    const ejecutar = (cliente: Prisma.TransactionClient) =>
      this.aplicarEnTransaccion(cliente, userId, campaignId, characterId, character, input);
    return tx ? ejecutar(tx) : this.prisma.transaction(ejecutar);
  }

  /** El cuerpo de `apply` que escribe, sin abrir su propia transacción — ver el comentario de arriba. */
  private async aplicarEnTransaccion(
    tx: Prisma.TransactionClient,
    userId: string,
    campaignId: string,
    characterId: string,
    character: { visibility: Visibility },
    input: ApplyConditionInput,
  ) {
    // **El vencimiento se guarda absoluto, no como una duración.** Guardar «dura una hora»
    // obligaría a saber desde cuándo, y ese «desde cuándo» es otra columna que puede
    // discrepar; con el instante en que vence, la pregunta «¿sigue viva?» es una resta contra
    // el reloj y no hay dos datos que mantener de acuerdo. Se calcula **al aplicarla**, con el
    // reloj de ese momento: renovar una condición es volver a aplicarla, que es lo que hace un
    // DM en la mesa.
    const campana = await tx.campaign.findUniqueOrThrow({ where: { id: campaignId } });
    const expiresAtClock =
      input.durationSeconds === undefined ? null : campana.clockSeconds + input.durationSeconds;

    // **SRD 5.1, «Concentration»:** *«Casting another spell that requires concentration. You lose
    // concentration on a spell if you cast another spell that requires concentration. You can't
    // concentrate on two spells at once.»*
    //
    // El `upsert` de abajo es **por clave exacta** y cada conjuro genera la suya
    // (`CONCENTRATION_KEY_PREFIX`), así que dos conjuros distintos eran dos filas y convivían.
    // Encima, `estaConcentrado` devuelve un **booleano**, de modo que con dos vivas `changeHp`
    // pedía **una sola** salvación: retirando la anterior aquí, ese segundo defecto desaparece
    // solo — que es la señal de que el arreglo va en el sitio bueno.
    //
    // **Se retira al ESCRIBIR y no al leer** porque perder una concentración es un suceso de la
    // mesa: alguien tiene que enterarse de que la Bendición se cayó. Un filtro al leer lo
    // habría hecho desaparecer en silencio.
    if (esConcentracion(input.key)) {
      // **Solo las que siguen vivas.** Una concentración ya vencida se queda en la hoja
      // marcada a propósito (D-2C-2); retirarla aquí anunciaría una pérdida que ya ocurrió y
      // que el jugador ya vio.
      const previas = (
        await tx.characterCondition.findMany({
          where: {
            characterId,
            key: { startsWith: CONCENTRATION_KEY_PREFIX, not: input.key },
          },
        })
      ).filter((c) => esConcentracion(c.key) && !condicionVencida(c, campana.clockSeconds));
      for (const previa of previas) {
        await tx.characterCondition.delete({ where: { id: previa.id } });
        // El mismo suceso que emite retirar una condición a mano, no uno nuevo: la línea de
        // tiempo ya sabe leerlo y la pantalla ya sabe pintarlo.
        await this.events.record(
          userId,
          campaignId,
          {
            subjectType: "character",
            subjectId: characterId,
            visibility: character.visibility,
            payload: { type: "CONDITION_REMOVED", key: previa.key },
          },
          tx,
        );
      }
    }

    const condition = await tx.characterCondition.upsert({
      where: { characterId_key: { characterId, key: input.key } },
      create: {
        characterId,
        key: input.key,
        level: input.level ?? null,
        note: input.note ?? null,
        appliedById: userId,
        expiresAtClock,
      },
      update: {
        level: input.level ?? null,
        note: input.note ?? null,
        appliedById: userId,
        // **Se escribe siempre, también cuando es `null`.** Volver a aplicar una condición sin
        // duración tiene que dejarla indefinida: si el `null` no se escribiera, heredaría en
        // silencio la caducidad de la vez anterior y se apagaría sola sin que nadie lo pidiera.
        expiresAtClock,
      },
    });
    await this.events.record(
      userId,
      campaignId,
      {
        subjectType: "character",
        subjectId: characterId,
        visibility: character.visibility,
        payload: {
          type: "CONDITION_APPLIED",
          key: input.key,
          level: input.level,
          reason: input.note,
        },
      },
      tx,
    );
    return condition;
  }

  /**
   * **Ayudar a alguien de la mesa** (plan 08, ficha I8).
   *
   * SRD 5.1: *«you can aid a friendly creature in attacking a creature within 5 feet of you… the
   * first attack roll is made with advantage»*. Tres límites, y aquí está qué se hace con cada uno:
   *
   * 1. **Una sola tirada.** Se cumple: la marca la consume el primer ataque
   *    (`CharacterSheetService`), aunque el ayudado tenga varios.
   * 2. **El enemigo a cinco pies de quien ayuda.** **No se comprueba**, y no se finge: son
   *    distancias, y este producto no tiene tablero. La pantalla dice *«la cercanía la juzgas
   *    tú»*, que es el mismo criterio que ya usa el proyecto para lo que el servidor no sabe.
   * 3. **Caduca al principio de tu siguiente turno.** Se cumple, y sin inventar un reloj: un
   *    asalto **son seis segundos del reloj de campaña** (`SEGUNDOS_POR_ASALTO`, decisión D-2C-1),
   *    así que «mi siguiente turno» es exactamente un asalto más tarde. Se guarda como
   *    `expiresAtClock` absoluto, igual que cualquier otra condición con duración.
   *
   * **Quién puede:** el dueño del personaje que ayuda, o el DM. Ayudar es una acción **suya**, así
   * que el permiso se comprueba sobre el ayudante; recibir ayuda no necesita permiso porque no le
   * quita nada a nadie —y exigirlo impediría ayudar al personaje de otro, que es el caso entero.
   *
   * **El ayudado tiene que estar en la misma campaña**, y si no, 404: un 403 confirmaría que ese
   * personaje existe en algún sitio.
   */
  async help(userId: string, campaignId: string, helperCharacterId: string, input: HelpInput) {
    if (input.targetCharacterId === helperCharacterId) {
      throw new BadRequestException("Ayudarse a sí mismo no es la acción Ayudar.");
    }
    const ayudante = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      helperCharacterId,
    );
    await requireOwnerOrDM(
      this.membership,
      campaignId,
      userId,
      ayudante,
      "Solo el DM o el dueño puede usar la acción Ayudar de ese personaje.",
    );

    const ayudado = await this.prisma.character.findFirst({
      where: { id: input.targetCharacterId, campaignId },
      select: { id: true, name: true, visibility: true },
    });
    if (!ayudado) throw new NotFoundException("Character not found");

    return this.prisma.transaction(async (tx) => {
      const campana = await tx.campaign.findUniqueOrThrow({ where: { id: campaignId } });

      // **Si hay combate, la marca se corta en el turno del ayudante y no en el reloj.**
      //
      // SRD 5.1, «Help»: la ventaja dura hasta *«the start of your next turn»* — el turno de quien
      // ayuda. El reloj de campaña solo sube al **cerrar** un asalto, así que `reloj + 6s` vencía
      // al **empezar** el asalto siguiente, antes del turno de nadie: quien actuaba antes que su
      // ayudante llegaba a su turno con la ventaja ya vencida, y eso pasaba en la mitad de los
      // órdenes de iniciativa.
      //
      // **Fuera de combate no hay borde que cruzar**, así que ahí se conserva el vencimiento por
      // reloj de siempre: sin encuentro activo, un borde dejaría la marca viva para siempre.
      const enCombate = await tx.combatant.findFirst({
        where: { characterId: helperCharacterId, encounter: { status: "ACTIVE" } },
        // `actionUsed` y `encounterId` los pide el gasto de más abajo; el borde solo necesitaba
        // saber que existe.
        select: { id: true, actionUsed: true, encounterId: true },
      });
      const borde = enCombate
        ? { expiryEdge: "sourceStart", sourceCharacterId: helperCharacterId }
        : { expiryEdge: null, sourceCharacterId: null };

      const condition = await tx.characterCondition.upsert({
        where: { characterId_key: { characterId: ayudado.id, key: CLAVE_AYUDA } },
        create: {
          characterId: ayudado.id,
          key: CLAVE_AYUDA,
          level: null,
          // **El nombre de quien ayuda va en la nota**, que es lo que la pantalla lee para decir
          // «Ventaja: te ayuda Mira». `appliedById` es el USUARIO, no el personaje, y un jugador
          // puede llevar dos: sin esto no se sabría cuál de los dos ayudó.
          note: `Te ayuda ${ayudante.name}`,
          appliedById: userId,
          // El vencimiento por reloj se escribe **igual**: con borde no lo mira nadie, y es el
          // que vale fuera de combate. Con él, una marca de un combate que se acabó tampoco se
          // queda viva para siempre.
          expiresAtClock: campana.clockSeconds + SEGUNDOS_POR_ASALTO,
          ...borde,
        },
        update: {
          note: `Te ayuda ${ayudante.name}`,
          appliedById: userId,
          ...borde,
          // Ayudar otra vez **renueva**: es lo que hace un jugador en la mesa, y dejar la caducidad
          // vieja habría hecho que la segunda ayuda naciera medio muerta.
          expiresAtClock: campana.clockSeconds + SEGUNDOS_POR_ASALTO,
        },
      });
      // **Ayudar cuesta la acción de quien ayuda** (ficha P1, puerta A — 2026-09-07).
      //
      // Sin esto, un jugador con dos personajes se daba `helped` de uno al otro sin límite: `help`
      // exige dueño-o-DM **del ayudante**, del ayudado solo que esté en la campaña, y crear
      // personajes no tiene tope. **Prohibirlo estaba descartado con motivo** —el SRD permite que
      // dos criaturas se ayuden, y que las lleve la misma persona no las convierte en una—; lo que
      // el SRD sí cobra es que Ayudar es una **acción**, y con eso la puerta se cierra sola.
      //
      // **Se hereda la doctrina del paso 2 y no se inventa otra**: `EncountersService.gastar`
      // (`encounters.service.ts:1277`) marca `excedido` y **no lanza nunca**. Gastar cuenta y
      // avisa, no impide — así que aquí tampoco se rechaza nada: se gasta y se dice.
      //
      // Se escribe **en esta misma transacción** en vez de llamar a `gastar`: aquel pide
      // `sessionId` y `encounterId` que esta ruta no recibe, y abriría una segunda transacción
      // sobre la fila que ya tenemos aquí. El criterio es el mismo; el camino, el más corto.
      //
      // **Fuera de combate no gasta nada y no falla**, y es un supuesto declarado del autor
      // (2026-09-07): la economía vive en `Combatant`, o sea dentro de un encuentro. Sin turnos no
      // hay economía que cobrar, y la puerta se cierra donde importa, que es la pelea.
      if (enCombate) {
        const excedido = enCombate.actionUsed;
        await tx.combatant.update({ where: { id: enCombate.id }, data: { actionUsed: true } });
        await this.events.record(
          userId,
          campaignId,
          {
            subjectType: "character",
            subjectId: helperCharacterId,
            // La del AYUDANTE aquí: este suceso habla de quien gasta, no de quien recibe.
            visibility: ayudante.visibility,
            payload: {
              type: "ACTION_SPENT",
              encounterId: enCombate.encounterId,
              combatantId: enCombate.id,
              coste: "ACTION",
              excedido,
            },
          },
          tx,
        );
      }

      await this.events.record(
        userId,
        campaignId,
        {
          subjectType: "character",
          subjectId: ayudado.id,
          // **La visibilidad es la del AYUDADO**, que es de quien habla el suceso. Con la del
          // ayudante, ayudar a un personaje `DM_ONLY` lo habría anunciado a la mesa entera.
          visibility: ayudado.visibility,
          payload: {
            type: "CONDITION_APPLIED",
            key: CLAVE_AYUDA,
            reason: `Te ayuda ${ayudante.name}`,
          },
        },
        tx,
      );
      return condition;
    });
  }

  async remove(userId: string, campaignId: string, characterId: string, key: string) {
    const character = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    const esDM = await requireOwnerOrDM(
      this.membership,
      campaignId,
      userId,
      character,
      "Solo el DM o el dueño puede quitar una condición.",
    );

    const existing = await this.prisma.characterCondition.findUnique({
      where: { characterId_key: { characterId, key } },
    });
    if (!existing) throw new NotFoundException("Condition not found");

    // **Poner y quitar son la misma concesión, y cerrar solo una no cierra nada.** Si el jugador
    // no puede envenenarse pero sí puede quitarse el veneno que le acaba de poner el DM, la
    // desventaja dura lo que tarde en pulsar. La regla es la misma de `apply`: una clave que el
    // servidor interpreta la maneja el DM; una nota propia sigue siendo del dueño.
    //
    // **Excepción, ronda de arreglo 2 — SRD 5.1, «Rage»: *"You can also end your rage on your
    // turn as a bonus action."*** Las reglas de D&D son verdad absoluta en este proyecto: un
    // jugador SÍ puede apagar su propia Furia, y `raging` se volvió clave reservada en la ronda
    // de arreglo 1 sin dejarle esa puerta — la re-revisión lo cazó. `appliedById` ya contesta
    // "quién la puso" sin inventar una lista nueva: si fue el propio dueño (`existing.appliedById
    // === userId`) quien la escribió —por su propia actividad, `concedidoPorActividad` en
    // `apply()`—, puede quitársela él mismo. **El reverso sigue intacto**: un `poisoned` que puso
    // el DM tiene `appliedById` del DM, así que esta misma comprobación sigue exigiendo DM para
    // quitarlo — `existing.appliedById !== userId` para el dueño de la ficha envenenada.
    const puedeQuitarlaElMismo = existing.appliedById === userId;
    if (esClaveReservada(key) && !esDM && !puedeQuitarlaElMismo) {
      throw new ForbiddenException("Esa condición la quita el DM.");
    }

    return this.prisma.transaction(async (tx) => {
      await tx.characterCondition.delete({ where: { id: existing.id } });
      await this.events.record(
        userId,
        campaignId,
        {
          subjectType: "character",
          subjectId: characterId,
          visibility: character.visibility,
          payload: { type: "CONDITION_REMOVED", key },
        },
        tx,
      );
      return { deleted: true };
    });
  }
}
