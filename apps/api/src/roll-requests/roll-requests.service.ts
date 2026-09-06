import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  AnswerRollRequestInput,
  CreateRollRequestInput,
  ListRollRequestsInput,
  RollAudience,
  RollMode,
  RollResult,
} from "@dnd/shared";
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly rolls: RollsService,
    private readonly sheets: CharacterSheetService,
    private readonly encounters: EncountersService,
    private readonly events: GameEventsService,
  ) {}

  /** Pedir. **Solo el DM**: es un acto de arbitraje. */
  async create(userId: string, campaignId: string, input: CreateRollRequestInput) {
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

    return this.prisma.transaction(async (tx) => {
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
            },
          }),
        );
      }
      return creadas;
    });
  }

  /**
   * Lo que te han pedido. El DM ve las de la campaña; un jugador, las de sus personajes.
   *
   * **Pendientes por defecto**, que es lo que sondea una pantalla: pedirlo todo cada treinta
   * segundos para descartar en el cliente lo respondido es tráfico que crece con la partida.
   */
  async list(userId: string, campaignId: string, query: ListRollRequestsInput) {
    const miembro = await this.membership.requireMember(campaignId, userId);
    return this.prisma.rollRequest.findMany({
      where: {
        campaignId,
        ...(miembro.role === "DM" ? {} : { character: { ownerId: userId } }),
        ...(query.includeResolved ? {} : { resolvedAt: null }),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
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
  ): Promise<RollResult> {
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
    const cerrada = await this.prisma.rollRequest.updateMany({
      where: { id: peticion.id, resolvedAt: null },
      data: { resolvedAt: new Date(), resolvedEventId: resultado.eventId },
    });
    if (cerrada.count === 0) {
      throw new BadRequestException("Esa petición ya se respondió.");
    }

    return resultado;
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

/** `1d20` + 3 → `1d20+3`; + 0 → `1d20`. El evaluador no entiende un `+0`. */
function conSigno(dados: string, modificador: number): string {
  if (modificador === 0) return dados;
  return `${dados}${modificador > 0 ? "+" : "-"}${Math.abs(modificador)}`;
}
