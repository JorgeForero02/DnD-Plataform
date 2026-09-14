import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type {
  AnswerRollRequestInput,
  CreateRollRequestInput,
  EffectApplied,
  EffectWarning,
  ListRollRequestsInput,
  PendingSaveEffect,
  RollAudience,
  RollMode,
  RollResult,
} from "@dnd/shared";
import { pendingSaveEffectSchema } from "@dnd/shared";
import { MembershipService } from "../campaigns/membership.service";
import { CharacterSheetService } from "../characters/character-sheet.service";
import { EncountersService } from "../encounters/encounters.service";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";
import { RollsService } from "../rolls/rolls.service";

// Tarea 2C.5 — **el DM pide una tirada; al jugador le aparece; el DM ve el resultado.**
//
// ## Quién ve qué, y por qué aquí no manda `canView`
//
// Una petición de tirada **no es un objeto del mundo con visibilidad**: es un recado dirigido a
// alguien. El DM ve todas las de su campaña —las hizo él— y un jugador ve las de **sus**
// personajes. Eso no es una excepción a la matriz de visibilidad: es que este recurso no tiene
// nivel de visibilidad que interpretar, igual que una notificación no lo tiene. Lo que sí sigue
// mandando `canView` es **la tirada que sale de aquí**, que se escribe por `RollsService` como
// cualquier otra.
//
// ## La respuesta la da quien tira, no quien pide
//
// El DM puede pedir, y punto. Responderla exige ser **el dueño del personaje o el DM**, que es la
// misma regla que ya gobierna tirar por un personaje. Un jugador no puede responder la petición de
// otro: sería tirar en su nombre.

@Injectable()
export class RollRequestsService {
  private readonly logger = new Logger(RollRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly rolls: RollsService,
    private readonly sheets: CharacterSheetService,
    private readonly encounters: EncountersService,
    private readonly events: GameEventsService,
  ) {}

  /**
   * Pedir. **Solo el DM**: es un acto de arbitraje.
   *
   * **`tx` opcional, aditivo (tarea A7, paso 2).** Una actividad de salvación crea la petición de
   * tirada en la MISMA transacción que gasta su recurso — `PrismaService.transaction` no anida, y
   * abrir una segunda transacción aquí dentro de la de la actividad rompería la garantía de «a
   * medias no se queda». Mismo patrón que `CharacterSheetService.changeHp` y precedente en
   * `DmTablesService.tirarSobre`: el cuerpo va en un método privado que recibe el cliente, y
   * **sin `tx` el comportamiento no cambia**, sigue abriendo su propia transacción.
   *
   * **Vuelta de arreglo 1 (I2), mismo arreglo que en `changeHp`:** con `tx`, `requireDM` y la
   * comprobación de que los personajes son de esta campaña se hacen contra ESE cliente — no
   * contra `this.prisma`, que pediría una segunda conexión del pool mientras la de quien llama
   * sigue abierta.
   */
  async create(
    userId: string,
    campaignId: string,
    input: CreateRollRequestInput,
    tx?: Prisma.TransactionClient,
  ) {
    if (tx) {
      await this.autorizarYComprobarPersonajesConCliente(tx, userId, campaignId, input);
      return this.crearEnTransaccion(tx, userId, campaignId, input);
    }

    await this.membership.requireDM(campaignId, userId);

    // Todos los personajes tienen que ser de esta campaña. **Se comprueba en una consulta y no en
    // un bucle**: con el bucle, pedir a doce personajes de los que uno es de otra campaña dejaría
    // once peticiones escritas y un error, que es el peor de los dos mundos.
    // `archivedAt: null` desde 2.5.8: a un personaje archivado no se le pide una tirada. Lo
    // señaló la revisión de cierre — los desplegables de la web ya estaban limpios porque salen
    // del listado, pero la API los aceptaba igual, y una API que acepta lo que la pantalla no
    // ofrece es una puerta trasera esperando a que alguien la empuje.
    const personajes = await this.prisma.character.findMany({
      where: { id: { in: input.characterIds }, campaignId, archivedAt: null },
      select: { id: true },
    });
    if (personajes.length !== input.characterIds.length) {
      throw new NotFoundException("Alguno de esos personajes no está en esta campaña.");
    }

    return this.prisma.transaction((cliente) =>
      this.crearEnTransaccion(cliente, userId, campaignId, input),
    );
  }

  /**
   * La misma autorización y comprobación de personajes que el camino de siempre, pero contra el
   * cliente que se le pasa — mismos mensajes, misma excepción.
   */
  private async autorizarYComprobarPersonajesConCliente(
    cliente: Prisma.TransactionClient,
    userId: string,
    campaignId: string,
    input: CreateRollRequestInput,
  ): Promise<void> {
    const miembro = await cliente.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
    });
    if (!miembro) throw new ForbiddenException("Not a member of this campaign");
    if (miembro.role !== "DM") throw new ForbiddenException("DM role required");

    const personajes = await cliente.character.findMany({
      where: { id: { in: input.characterIds }, campaignId, archivedAt: null },
      select: { id: true },
    });
    if (personajes.length !== input.characterIds.length) {
      throw new NotFoundException("Alguno de esos personajes no está en esta campaña.");
    }
  }

  /** El cuerpo de `create`, sin abrir su propia transacción — ver el comentario de arriba. */
  private async crearEnTransaccion(
    tx: Prisma.TransactionClient,
    userId: string,
    campaignId: string,
    input: CreateRollRequestInput & { pendingEffect?: PendingSaveEffect },
  ) {
    const creadas = [];
    for (const characterId of input.characterIds) {
      creadas.push(
        await tx.rollRequest.create({
          data: {
            campaignId,
            characterId,
            requestedById: userId,
            key: input.key,
            label: input.label,
            dc: input.dc ?? null,
            mode: input.mode,
            audience: input.audience,
            // Puerta de efectos §4.2: solo `createFromEffect` puede llenar esto — `create()`,
            // la puerta pública del DM, nunca pasa `pendingEffect` porque su tipo (`CreateRollRequestInput`
            // pelado) no lo declara.
            pendingEffect: (input.pendingEffect ?? undefined) as Prisma.InputJsonValue | undefined,
          },
        }),
      );
    }
    return creadas;
  }

  /**
   * Spec puerta de efectos §3.2: `crearEnTransaccion` con la comprobación de personajes pero sin
   * `requireDM`. Los `characterIds` ya pasaron `canView` en `ActivitiesService.usar`; aquí solo se
   * repite lo barato: en la campaña y no archivados. **Exige `tx` y no tiene ruta.**
   */
  async createFromEffect(
    tx: Prisma.TransactionClient,
    actorUserId: string,
    campaignId: string,
    input: CreateRollRequestInput & { pendingEffect?: PendingSaveEffect },
  ) {
    const personajes = await tx.character.findMany({
      where: { id: { in: input.characterIds }, campaignId, archivedAt: null },
      select: { id: true },
    });
    if (personajes.length !== input.characterIds.length) {
      throw new NotFoundException("Alguno de esos personajes no está en esta campaña.");
    }
    return this.crearEnTransaccion(tx, actorUserId, campaignId, input);
  }

  /**
   * Lo que te han pedido. El DM ve las de la campaña; un jugador, las de sus personajes.
   *
   * **Pendientes por defecto**, que es lo que sondea una pantalla: pedirlo todo cada treinta
   * segundos para descartar en el cliente lo respondido es tráfico que crece con la partida.
   *
   * **Ronda de arreglo 1 (tarea 9) — cada fila pendiente trae ya su `modifier`.** El panel del
   * jugador tiene que enseñar con qué va a tirar **antes** de tirar, y ese número no se puede
   * inventar en el navegador: es una regla del juego (subir de nivel, ponerse una armadura, una
   * condición) y las reglas viven en el servidor. Se calcula con `modificadorDeLaHoja`, **la misma
   * función privada que ya usa `answer()` de más abajo** para tirar de verdad — no una segunda
   * fórmula que se pudiera desincronizar de la primera.
   *
   * **Solo para las pendientes**: una petición ya respondida no tiene «antes de tirar» que
   * enseñar, y recalcular su hoja de hoy diría un número que no es el que salió entonces.
   *
   * **Y nunca revienta el listado.** Una hoja que no deriva —faltan características, raza o
   * clase— es un 400 al responder (`modificadorDeLaHoja` lo dice con esas palabras), pero el
   * listado no es responder: si una fila no se puede calcular, esa fila manda `null` y las demás
   * siguen. Quien no debería ver esa petición no la ve ni con modificador ni sin él: `findMany` ya
   * filtró por dueño o por DM antes de llegar aquí, así que `modificadorDeLaHoja` se llama con el
   * mismo `userId` que pidió el listado y no puede leer una hoja ajena.
   */
  async list(userId: string, campaignId: string, query: ListRollRequestsInput) {
    const miembro = await this.membership.requireMember(campaignId, userId);
    const filas = await this.prisma.rollRequest.findMany({
      where: {
        campaignId,
        ...(miembro.role === "DM" ? {} : { character: { ownerId: userId } }),
        ...(query.includeResolved ? {} : { resolvedAt: null }),
        // **El corte de cincuenta es el que hacía mentir a la sala de espera.** Sin este filtro,
        // una campaña con más de cincuenta pendientes de otro tipo empuja fuera de la página las
        // de iniciativa del combate recién abierto, y `TiraDeIniciativa` lee «todos han tirado»
        // sin que nadie haya tirado. Se filtra; **no se sube el tope**, que solo movería el
        // problema más lejos.
        ...(query.encounterId ? { encounterId: query.encounterId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return Promise.all(
      filas.map(async (fila) => ({
        ...fila,
        modifier:
          fila.resolvedAt === null
            ? await this.modificadorSeguro(userId, campaignId, fila.characterId, fila.key)
            : null,
      })),
    );
  }

  /**
   * `modificadorDeLaHoja`, pero para un listado: una hoja que no deriva no puede tirar abajo toda
   * la lista de peticiones. `NotFoundException` entra en el mismo `catch` que `BadRequestException`
   * porque la ausencia de visibilidad (`CharacterSheetService.getSheet` → `canSee`) es, para este
   * propósito, la misma respuesta que «no se pudo calcular»: sin número, no un 404 a media lista.
   */
  private async modificadorSeguro(
    userId: string,
    campaignId: string,
    characterId: string,
    key: string,
  ): Promise<number | null> {
    try {
      return await this.modificadorDeLaHoja(userId, campaignId, characterId, key);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) return null;
      throw error;
    }
  }

  /**
   * Responderla: se tira **ahora**, con la hoja de ahora.
   *
   * Aquí es donde se ve por qué la petición guarda una clave y no una expresión: el modificador se
   * lee de la hoja **en el momento de tirar**, así que subir de nivel o ponerse una armadura entre
   * que el DM pide y el jugador tira da el número correcto, no el que era verdad hace diez minutos.
   */
  async answer(
    userId: string,
    campaignId: string,
    requestId: string,
    input: AnswerRollRequestInput,
  ): Promise<RollResult & { effectApplied?: EffectApplied; effectWarning?: EffectWarning }> {
    const miembro = await this.membership.requireMember(campaignId, userId);
    const peticion = await this.prisma.rollRequest.findFirst({
      where: { id: requestId, campaignId },
      include: { character: { select: { id: true, ownerId: true } } },
    });
    // **404 y no 403 si no es tuya**, que es lo mismo que decidió `DmTablesService.roll` para el
    // mismo dilema: un 403 confirma que esa petición existe en esta campaña, y el listado ya se
    // encarga de que un jugador no vea las ajenas. Dos módulos de la misma fase resolviéndolo al
    // revés era la incoherencia que señaló la revisión.
    if (!peticion || (peticion.character.ownerId !== userId && miembro.role !== "DM")) {
      throw new NotFoundException("Esa petición no existe en esta campaña.");
    }
    // **Antes que el `resolvedAt` genérico, y a propósito.** Una petición forzada
    // (`EncountersService.forceStart`, tarea 4) también queda con `resolvedAt` puesto —así deja
    // de contar como pendiente—, así que si este `if` fuera el único, el jugador que llega tarde
    // vería el mismo «ya se respondió» que cualquier petición normal cerrada. `cancelledAt` es lo
    // que distingue «tiraste tú» de «tiró el sistema porque el DM no esperó», y esa distinción es
    // la que le importa a la pantalla del jugador.
    if (peticion.cancelledAt) {
      throw new ConflictException("El combate ya empezó y tu iniciativa la tiró el sistema.");
    }
    if (peticion.resolvedAt) {
      throw new BadRequestException("Esa petición ya se respondió.");
    }

    // **El efecto pendiente se lee ANTES de tirar** (ola de arreglos 1, revisión de API). Una fila
    // con un `pendingEffect` que no pasa el esquema —una migración a medias, una escritura a
    // mano— no puede costarle al jugador un d20 real: se rechaza aquí, con la petición todavía
    // abierta y sin ninguna tirada escrita, en vez de reventar con un 500 después de tirar.
    const efecto = this.efectoPendienteDe(peticion.id, peticion.pendingEffect);

    const modificador = await this.modificadorDeLaHoja(
      userId,
      campaignId,
      peticion.characterId,
      peticion.key,
    );

    // **M-6 (ronda de arreglo 1 de la tarea 4) — re-lectura justo antes de tirar, para estrechar
    // la ventana entre el `if` de arriba y la tirada real.** No la cierra del todo: mantener esta
    // fila bloqueada mientras se llama a `RollsService.roll` —un servicio ajeno, con su propia
    // transacción— sería peor que la ventana que deja. Si el jugador la pierde de todos modos —el
    // DM fuerza el encuentro entre esta línea y la siguiente—, la tirada de abajo **ocurre de
    // verdad**: gasta su d20 igual que cualquier otra, y sencillamente no se aplica. Quien decide
    // qué fue de ella es el `if (!cerrada)` de más abajo, no esta comprobación.
    const releida = await this.prisma.rollRequest.findUnique({
      where: { id: peticion.id },
      select: { resolvedAt: true, cancelledAt: true },
    });
    if (releida?.cancelledAt) {
      throw new ConflictException("El combate ya empezó y tu iniciativa la tiró el sistema.");
    }
    if (releida?.resolvedAt) {
      throw new BadRequestException("Esa petición ya se respondió.");
    }

    const resultado = await this.rolls.roll(userId, campaignId, {
      expression: conSigno("1d20", modificador),
      label: peticion.label,
      characterId: peticion.characterId,
      mode: peticion.mode as RollMode,
      // Lo decide quien responde, no quien pidió: es SU inspiración. El esquema de la tirada
      // rechaza la combinación con desventaja, así que aquí no hay nada más que comprobar.
      spendInspiration: input.spendInspiration,
      audience: peticion.audience as RollAudience,
      ...(peticion.dc === null ? {} : { dc: peticion.dc }),
    });

    // **Camino de iniciativa: cerrar la petición y escribir el número confirman JUNTOS.** Ronda
    // de arreglo 1 (I-2): antes, el `updateMany` de más abajo cerraba la petición en SU PROPIA
    // transacción y luego se abría otra para escribir la iniciativa en `EncountersService`; un
    // fallo entre las dos (deadlock, timeout, caída) dejaba la petición resuelta para siempre
    // sin iniciativa escrita, y si era la última el encuentro se quedaba `PREPARING` sin ninguna
    // petición pendiente y sin ninguna puerta que lo sacara de ahí. Ahora las dos escrituras
    // viven en la transacción de `aplicarIniciativaDePeticion`: confirman juntas o ninguna.
    if (peticion.encounterId) {
      // **Invariante, no error de usuario recuperable** (M-2 de la ronda de arreglo 1). La
      // iniciativa nunca se pide a ciegas (`start()` solo usa `PUBLIC` o `DM_PRIVATE`), así que
      // esta rama es hoy inalcanzable: si `revealed` fuera `false` aquí, algo rompió esa
      // garantía en otra parte del código, no algo que el jugador hizo mal. Se deja el guardián
      // porque el tipo de `resultado` es una unión discriminada y el compilador no lo sabe —sin
      // él, `resultado.total` no existe en la rama `revealed: false`— y porque, con la petición
      // cerrándose dentro de la misma transacción que la iniciativa (I-2), este chequeo ya no
      // puede dejar la petición resuelta sin su número escrito: si lanza, nada de lo de abajo
      // ha corrido todavía.
      if (!resultado.revealed) {
        throw new BadRequestException("La tirada de iniciativa no se pudo leer");
      }
      const { cerrada, empezo } = await this.encounters.aplicarIniciativaDePeticion(
        peticion.encounterId,
        peticion.id,
        peticion.characterId,
        resultado.total,
        resultado.eventId,
      );
      if (!cerrada) {
        // **I-2 (ronda de arreglo 1 de la tarea 4) — un `cerrada: false` de aquí puede significar
        // dos cosas MUY distintas, y hasta esta ronda las dos daban el mismo 400.** Si perdió la
        // carrera contra otra respuesta normal, «ya se respondió» es la verdad. Pero si la perdió
        // contra `EncountersService.forceStart` —que cierra esta misma petición con
        // `cancelledAt`, no con una respuesta, mientras la tirada de arriba ya estaba en marcha—
        // el jugador SÍ tiró (acaba de gastar un d20 real) y lo que pasó no es que «ya
        // respondiera»: el sistema decidió sin él mientras tiraba. Se relee la fila para
        // distinguir las dos, en vez de fiarse del `cerrada: false` a secas.
        const actual = await this.prisma.rollRequest.findUnique({
          where: { id: peticion.id },
          select: { cancelledAt: true },
        });
        if (actual?.cancelledAt) {
          throw new ConflictException("El combate ya empezó y tu iniciativa la tiró el sistema.");
        }
        throw new BadRequestException("Esa petición ya se respondió.");
      }
      if (empezo) {
        // **`RollRequest` NO tiene `sessionId`** — la sesión sale del encuentro, que es quien la
        // tiene.
        const encuentro = await this.prisma.encounter.findUnique({
          where: { id: peticion.encounterId },
          select: { sessionId: true },
        });
        await this.events.record(userId, campaignId, {
          sessionId: encuentro!.sessionId,
          subjectType: "encounter",
          subjectId: peticion.encounterId,
          visibility: "PLAYERS",
          payload: { type: "ENCOUNTER_STARTED", encounterId: peticion.encounterId },
        });
      }
      return resultado;
    }

    // **Se marca respondida después de tirar, no antes.** Si se marcara antes y la tirada fallara
    // —una expresión imposible, la base caída—, la petición quedaría cerrada sin tirada: el
    // jugador vería desaparecer el botón sin que hubiera pasado nada.
    //
    // **Y se cierra con la condición dentro del `where`**, no con el `if` de arriba: entre aquella
    // lectura y esta escritura cabe otra petición entera —un doble clic, o dos pestañas—, y las dos
    // pasaban la comprobación y tiraban. La regla del proyecto dice que lo que la base puede
    // garantizar lo garantiza la base: aquí la garantía es que el `updateMany` solo toca la fila
    // que **sigue** sin responder, y si no tocó ninguna es que ganó la otra.
    //
    // **Puerta de efectos §4.3 (tarea 2) — cerrar la petición y aplicar su efecto pendiente
    // confirman JUNTOS.** Mismo patrón que el camino de iniciativa de más arriba (I-2): si el
    // `updateMany` y el `changeHpFromEffect` vivieran en transacciones separadas, un fallo entre
    // las dos dejaría la petición cerrada sin que el daño se hubiera repartido, o al revés.
    //
    // SRD 5.1, *Saving Throws*: «A saving throw is successful if the total equals or exceeds the
    // DC». *Fireball*: «half as much damage on a successful one». *Rounding Down*: la mitad se
    // redondea hacia abajo. El daño ya se tiró UNA vez en `usar` (*Damage Rolls*: «roll the
    // damage once for all of them») y viaja en `pendingEffect`; aquí solo se decide si se aplica
    // entero, mitad o nada.
    //
    // **Y si falla SOLO el efecto, la petición se cierra igual** (ola de arreglos 1, Important 3
    // de la revisión de API). La tirada ya está escrita —`rolls.roll` va en su propia
    // transacción, arriba— y es un d20 real que el jugador gastó. Si el `changeHpFromEffect` de
    // abajo lanzara y con él se deshiciera el cierre, la petición seguiría abierta con su botón
    // puesto, el jugador reintentaría y tiraría OTRO d20 mientras el hilo enseña el primero: la
    // misma tirada dos veces, que es lo que este servicio existe para impedir. El modo de fallo
    // menos malo es el contrario: la petición queda respondida con su tirada, los PG no se
    // tocan, y la respuesta lleva `effectWarning` para que la pantalla diga que el daño hay que
    // aplicarlo a mano. Un cierre que se pierde en la carrera (`count === 0`) sigue siendo un 400
    // sin efecto, como antes: ahí no hay nada que rescatar, ganó la otra respuesta.
    let effectApplied: EffectApplied | undefined;
    let effectWarning: EffectWarning | undefined;
    try {
      effectApplied = await this.prisma.transaction(async (tx) => {
        const cerrada = await tx.rollRequest.updateMany({
          where: { id: peticion.id, resolvedAt: null },
          data: { resolvedAt: new Date(), resolvedEventId: resultado.eventId },
        });
        if (cerrada.count === 0) {
          throw new BadRequestException("Esa petición ya se respondió.");
        }
        if (!efecto) return undefined;
        try {
          return await this.aplicarEfecto(tx, campaignId, peticion, efecto, resultado.eventId);
        } catch (causa) {
          throw new EfectoNoAplicado(causa);
        }
      });
    } catch (e) {
      if (!(e instanceof EfectoNoAplicado)) throw e;
      // La transacción de arriba se deshizo ENTERA, cierre incluido: se vuelve a cerrar, sola,
      // con la misma condición en el `where`. Si esta segunda escritura tampoco toca ninguna fila
      // es que otra respuesta la cerró entre tanto; en ese caso su tirada es la que vale y la
      // nuestra queda escrita como una tirada más del personaje, que es lo que ya pasaba.
      this.logger.warn(
        `La petición ${peticion.id} se respondió (tirada ${resultado.eventId}) pero su efecto no se pudo aplicar: ${describir(e.causa)}`,
      );
      await this.prisma.rollRequest.updateMany({
        where: { id: peticion.id, resolvedAt: null },
        data: { resolvedAt: new Date(), resolvedEventId: resultado.eventId },
      });
      effectWarning = {
        code: "EFECTO_NO_APLICADO",
        message:
          "La tirada quedó registrada, pero el daño o la curación no se pudo aplicar. El DM tiene que aplicarlo a mano desde la ficha.",
      };
    }

    return {
      ...resultado,
      ...(effectApplied ? { effectApplied } : {}),
      ...(effectWarning ? { effectWarning } : {}),
    };
  }

  /**
   * El `pendingEffect` de una fila, validado, o `null` si no lo hay. Una fila que no pasa el
   * esquema es un 409 legible —el dato está roto, no la petición del cliente— y no un 500.
   */
  private efectoPendienteDe(requestId: string, crudo: unknown): PendingSaveEffect | null {
    if (!crudo) return null;
    const leido = pendingSaveEffectSchema.safeParse(crudo);
    if (!leido.success) {
      throw new ConflictException(
        `La petición ${requestId} lleva un efecto pendiente que no se puede leer; el DM tiene que aplicarlo a mano.`,
      );
    }
    return leido.data;
  }

  /**
   * Lo que la spec §4.3 llama «lo que pasa al responder», sin el cierre de la petición: decide
   * entero / mitad / nada con la tirada ya escrita y llama a la segunda puerta. **Dentro del `tx`
   * de quien llama**, siempre.
   */
  private async aplicarEfecto(
    tx: Prisma.TransactionClient,
    campaignId: string,
    peticion: { id: string; characterId: string; requestedById: string; dc: number | null },
    efecto: PendingSaveEffect,
    rollEventId: string,
  ): Promise<EffectApplied> {
    // **Invariante, no caso de usuario**: `usar()` siempre pide con `dc` cuando cuelga un efecto
    // (`ActivitiesService`). Sin CD no hay forma de decidir si salvó, y callarse cerrando la
    // petición habría hecho desaparecer el daño en silencio — se lanza, como el guardián de
    // iniciativa de arriba, y el `catch` de `answer` lo convierte en un `effectWarning`.
    if (peticion.dc === null) {
      throw new BadRequestException(
        `La petición ${peticion.id} lleva un efecto pendiente pero no tiene CD: no se puede decidir la salvación.`,
      );
    }
    // E-PE-6: el total se lee del suceso escrito, no de `resultado` — `RollResult` puede venir
    // `revealed: false` (una petición `BLIND`), y ahí `resultado.total` no existe.
    const evento = await tx.gameEvent.findUnique({
      where: { id: rollEventId },
      select: { payload: true },
    });
    const total = (evento?.payload as { total?: number } | null)?.total;
    if (typeof total !== "number") {
      throw new BadRequestException("La tirada de la salvación no se pudo leer.");
    }
    const salvo = total >= peticion.dc;
    const cantidad = salvo
      ? efecto.siSalva === "mitad"
        ? Math.floor(efecto.amount / 2)
        : 0
      : efecto.amount;
    // `cantidad === 0 ? 0 : …` y no `efecto.signo * cantidad` a secas: con `signo: -1` y
    // `cantidad: 0` la multiplicación da `-0`, que es un cero de verdad para el juego pero NO
    // para `toEqual` — el `-0` de JavaScript no es `0` bajo `Object.is`, y devolverlo habría
    // hecho mentir a `effectApplied.delta` sobre un caso donde no pasó nada.
    const delta = cantidad === 0 ? 0 : efecto.signo * cantidad;
    if (cantidad > 0) {
      await this.sheets.changeHpFromEffect(
        tx,
        peticion.requestedById,
        campaignId,
        peticion.characterId,
        {
          delta,
          reason: `Actividad: ${efecto.actividadKey}${salvo ? " (salvó, mitad)" : " (falló)"}`,
          ...(efecto.signo < 0 && efecto.tipoDeDano ? { damageType: efecto.tipoDeDano } : {}),
          rollEventId,
        },
      );
    }
    return { delta, saved: salvo };
  }

  /**
   * El modificador que la hoja da hoy para esa clave.
   *
   * **Pedir un valor que la hoja no deriva es un 400**, no una tirada de `1d20+0`: un cero
   * silencioso es un número que la mesa se cree.
   */
  private async modificadorDeLaHoja(
    userId: string,
    campaignId: string,
    characterId: string,
    key: string,
  ): Promise<number> {
    const hoja = await this.sheets.getSheet(userId, campaignId, characterId);
    if (!hoja.sheet) {
      throw new BadRequestException(
        "Esa hoja todavía no se puede derivar: le faltan características, raza o clase.",
      );
    }
    const valor = hoja.sheet.derived[key];
    if (!valor) {
      throw new BadRequestException(`La hoja de ese personaje no tiene «${key}».`);
    }
    return valor.total;
  }
}

/**
 * Señal interna de `answer`: el cierre de la petición fue bien y lo que falló fue SOLO el efecto
 * (la segunda puerta, la lectura del suceso, la CD ausente). Sirve para que el `catch` de fuera
 * distinga «hay que volver a cerrar y avisar» de «la carrera la ganó otro» sin mirar mensajes.
 */
class EfectoNoAplicado extends Error {
  constructor(readonly causa: unknown) {
    super("El efecto pendiente no se pudo aplicar.");
  }
}

function describir(causa: unknown): string {
  return causa instanceof Error ? `${causa.constructor.name}: ${causa.message}` : String(causa);
}

/** `1d20` + 3 → `1d20+3`; + 0 → `1d20`. El evaluador no entiende un `+0`. */
function conSigno(dados: string, modificador: number): string {
  if (modificador === 0) return dados;
  return `${dados}${modificador > 0 ? "+" : "-"}${Math.abs(modificador)}`;
}
