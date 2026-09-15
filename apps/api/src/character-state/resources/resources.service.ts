import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { SpendResourceInput, UpsertResourceInput } from "@dnd/shared";
import type { Prisma } from "@prisma/client";
import { MembershipService } from "../../campaigns/membership.service";
import { GameEventsService } from "../../game-events/game-events.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SRD_CLASSES } from "../../rules/catalog/classes";
import type { SrdClass } from "../../rules/catalog/types";
import type { CharacterSheet } from "../../rules/catalog";
import { requireOwnerOrDM, requireVisibleCharacter } from "../../common/character-viewer";

// Tarea 2A.8 — recursos consumibles, y la siembra de los que da la clase.
//
// **Inspiración, furia, ki, dados de golpe y espacios de conjuro son el mismo mecanismo**: un
// contador con máximo que un descanso repone. `packages/shared/src/character-state.schema.ts`
// ya lo dice; este servicio es la única puerta de escritura sobre `CharacterResource`.

/**
 * **La clave de la inspiración, escrita una vez.** Es una clave de datos —viaja y se guarda—, así
 * que va en inglés como las demás (`hit-dice-d8`, `spell-slot-3`); su rótulo en español está en la
 * propia fila, que es de donde lo lee la pantalla.
 */
export const CLAVE_INSPIRACION = "inspiration";

@Injectable()
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: GameEventsService,
  ) {}

  async list(userId: string, campaignId: string, characterId: string) {
    await requireVisibleCharacter(this.prisma, this.membership, userId, campaignId, characterId);
    return this.prisma.characterResource.findMany({
      where: { characterId },
      orderBy: { key: "asc" },
    });
  }

  /**
   * Crea o ajusta un recurso. **`grantedBy` manda**: decide quién puede tocar la fila el valor
   * que YA tiene esa fila —o, si es la primera vez que se ve esa clave, el que trae esta misma
   * petición—. Un dueño no puede aflojar después, desde su propio PUT, un `DM_ONLY` que el DM
   * ya puso: por eso se mira `existing.grantedBy` primero, y solo se cae al del cuerpo cuando
   * no hay fila todavía.
   */
  async upsert(
    userId: string,
    campaignId: string,
    characterId: string,
    input: UpsertResourceInput,
  ) {
    const character = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    const isDM = await requireOwnerOrDM(this.membership, campaignId, userId, character);

    const existing = await this.prisma.characterResource.findUnique({
      where: { characterId_key: { characterId, key: input.key } },
    });
    const grantor = existing?.grantedBy ?? input.grantedBy;
    if (grantor === "DM_ONLY" && !isDM) {
      throw new ForbiddenException("Este recurso solo lo sube el DM.");
    }

    return this.prisma.characterResource.upsert({
      where: { characterId_key: { characterId, key: input.key } },
      create: {
        characterId,
        key: input.key,
        label: input.label,
        current: input.current,
        max: input.max ?? null,
        resetOn: input.resetOn,
        grantedBy: input.grantedBy,
      },
      update: {
        label: input.label,
        current: input.current,
        max: input.max ?? null,
        resetOn: input.resetOn,
        grantedBy: input.grantedBy,
      },
    });
  }

  /** Gastar es un delta negativo; reponer, uno positivo. El recorte es el mismo en los dos. */
  spend(
    userId: string,
    campaignId: string,
    characterId: string,
    key: string,
    input: SpendResourceInput,
  ) {
    return this.adjust(
      userId,
      campaignId,
      characterId,
      key,
      -input.amount,
      input.reason,
      "RESOURCE_SPENT",
    );
  }

  restore(
    userId: string,
    campaignId: string,
    characterId: string,
    key: string,
    input: SpendResourceInput,
  ) {
    return this.adjust(
      userId,
      campaignId,
      characterId,
      key,
      input.amount,
      input.reason,
      "RESOURCE_RESTORED",
    );
  }

  private async adjust(
    userId: string,
    campaignId: string,
    characterId: string,
    key: string,
    delta: number,
    reason: string | undefined,
    type: "RESOURCE_SPENT" | "RESOURCE_RESTORED",
  ) {
    const character = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    // **GASTAR no pasa por el candado de `grantedBy`**: usar lo que ya tienes no es concederte
    // más, y ese candado protege quién puede SUBIR el recurso, no quién puede usarlo.
    const isDM = await requireOwnerOrDM(this.membership, campaignId, userId, character);

    const resource = await this.prisma.characterResource.findUnique({
      where: { characterId_key: { characterId, key } },
    });
    if (!resource) throw new NotFoundException("Resource not found");

    // **REPONER sí, y hasta hoy no lo hacía** (encontrado al sembrar la inspiración, plan 08).
    //
    // El candado vivía solo en `upsert`, con el argumento de que gastar y reponer «solo mueven el
    // contador». Para la furia o los espacios de conjuro —`OWNER`— da igual. Para un recurso
    // `DM_ONLY` **no**: reponer es exactamente conceder. Con la inspiración sembrada, un jugador
    // se habría dado inspiración a sí mismo pulsando «+» en su propia hoja, y la regla del SRD
    // —la concede el DM por interpretar bien— habría sido un adorno.
    //
    // El `+` de un recurso `OWNER` sigue siendo del dueño: aquí solo se cierra el caso que el
    // propio enum ya declaraba («la inspiracion la da el DM», `schema.prisma`).
    if (delta > 0 && resource.grantedBy === "DM_ONLY" && !isDM) {
      throw new ForbiddenException("Este recurso solo lo repone el DM.");
    }

    // **Gastar lo que no tienes es un 409, no un silencio** (plan 08, ficha I8).
    //
    // Hasta hoy el recorte de abajo se tragaba el exceso: pedir un espacio de conjuro con cero
    // devolvía **200 y `current: 0`**, o sea la misma respuesta que gastarlo de verdad. Quien
    // llamaba no podía distinguir «lo has usado» de «no tenías», y en la mesa eso es un conjuro
    // lanzado gratis. La regla la pedía I8 para la inspiración —«gastar sin tenerla es un 409, no
    // un silencio que parece que funcionó»— y **se aplica a todos los recursos**, porque un
    // espacio de conjuro fantasma es exactamente el mismo defecto: hacer una excepción para una
    // clave sería lo raro.
    //
    // Reponer NO cambia: quedarse en el máximo sí es el resultado correcto de reponer de más.
    if (delta < 0 && resource.current < -delta) {
      throw new ConflictException({
        code: "RESOURCE_EMPTY",
        message: `No le queda ${resource.label.toLowerCase()} que gastar.`,
      });
    }

    // **Delta, recortado entre 0 y `max`.** Sin tope conocido (`max` nulo), solo se recorta
    // por abajo: un recurso sin máximo declarado no tiene techo que respetar.
    const tentativo = resource.current + delta;
    const tope = resource.max ?? Number.POSITIVE_INFINITY;
    const remaining = Math.min(Math.max(tentativo, 0), tope);

    return this.prisma.transaction(async (tx) => {
      const updated = await tx.characterResource.update({
        where: { id: resource.id },
        data: { current: remaining },
      });
      await this.events.record(
        userId,
        campaignId,
        {
          subjectType: "character",
          subjectId: characterId,
          visibility: character.visibility,
          payload: {
            type,
            key: resource.key,
            label: resource.label,
            amount: Math.abs(delta),
            remaining,
            reason,
          },
        },
        tx,
      );
      return updated;
    });
  }

  /**
   * **Regalar un recurso a otro personaje de la mesa** (plan 08, ficha I8).
   *
   * El SRD lo dice de la inspiración: *«you can give it to another player»*, y por eso existe este
   * método y no dos peticiones. **Las dos filas se mueven en la misma transacción**: con un gasto
   * y una reposición sueltos, un fallo en medio dejaría la inspiración en los dos personajes o en
   * ninguno, y ninguna de las dos cosas se puede arreglar mirando la pantalla.
   *
   * **Quién puede:** el dueño de quien lo da, o el DM. Se comprueba con `requireOwnerOrDM` sobre
   * **el que lo entrega**, que es de quien sale el recurso; recibirlo no necesita permiso porque
   * no le quita nada a nadie.
   *
   * **Un solo suceso**, `RESOURCE_GIVEN`, y no un `RESOURCE_SPENT` más un `RESOURCE_RESTORED`: la
   * mesa vería dos líneas sueltas sin saber que son el mismo gesto ni de quién a quién fue.
   */
  async give(
    userId: string,
    campaignId: string,
    fromCharacterId: string,
    key: string,
    input: { toCharacterId: string; amount: number; reason?: string },
  ) {
    if (input.toCharacterId === fromCharacterId) {
      throw new BadRequestException("No se puede regalar a sí mismo.");
    }
    const from = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      fromCharacterId,
    );
    await requireOwnerOrDM(this.membership, campaignId, userId, from);

    // **El destinatario se busca acotado por la campaña**, no por su id a secas: sin el
    // `campaignId` se podría pasar inspiración a un personaje de otra mesa, y un 404 aquí es lo
    // correcto —no se filtra que ese personaje exista en algún sitio.
    const to = await this.prisma.character.findFirst({
      where: { id: input.toCharacterId, campaignId },
      select: { id: true, name: true, visibility: true },
    });
    if (!to) throw new NotFoundException("Character not found");

    const origen = await this.prisma.characterResource.findUnique({
      where: { characterId_key: { characterId: fromCharacterId, key } },
    });
    if (!origen) throw new NotFoundException("Resource not found");
    if (origen.current < input.amount) {
      throw new ConflictException({
        code: "RESOURCE_EMPTY",
        message: `No le queda ${origen.label.toLowerCase()} que regalar.`,
      });
    }

    const destino = await this.prisma.characterResource.findUnique({
      where: { characterId_key: { characterId: input.toCharacterId, key } },
    });
    // **El tope del destinatario manda.** Regalar inspiración a quien ya la tiene no la acumula:
    // el SRD es explícito en que se tiene o no se tiene. Lo que sobra **no se devuelve** —se
    // regaló—, y el suceso lo dice con la cantidad pedida.
    const tope = destino?.max ?? origen.max ?? Number.POSITIVE_INFINITY;
    const recibido = Math.min((destino?.current ?? 0) + input.amount, tope);
    const restante = origen.current - input.amount;

    return this.prisma.transaction(async (tx) => {
      const actualizado = await tx.characterResource.update({
        where: { id: origen.id },
        data: { current: restante },
      });
      await tx.characterResource.upsert({
        where: { characterId_key: { characterId: input.toCharacterId, key } },
        create: {
          characterId: input.toCharacterId,
          key,
          label: origen.label,
          current: recibido,
          max: origen.max,
          resetOn: origen.resetOn,
          grantedBy: origen.grantedBy,
        },
        update: { current: recibido },
      });
      await this.events.record(
        userId,
        campaignId,
        {
          subjectType: "character",
          subjectId: fromCharacterId,
          visibility: from.visibility,
          payload: {
            type: "RESOURCE_GIVEN",
            key: origen.key,
            label: origen.label,
            amount: input.amount,
            fromName: from.name,
            toName: to.name,
            remaining: restante,
            reason: input.reason,
          },
        },
        tx,
      );
      return actualizado;
    });
  }

  /**
   * **La fila de la inspiración, creada al nacer el personaje** (plan 08, ficha I8).
   *
   * **No la siembra `seedResourcesFor`, y eso es la decisión**: ahí van los recursos que implica
   * *la clase* —dados de golpe, espacios de conjuro—, y por eso ese método se llama al terminar la
   * ficha, cuando ya hay clase y nivel. **La inspiración no viene de la clase**: la da el DM, a
   * cualquiera, y un personaje recién creado sin clase tiene que poder recibirla. Sembrarla allí
   * la dejaba fuera justo para quien todavía no ha elegido nada.
   *
   * A cero, para que la hoja tenga algo que enseñar: sin fila, «no la tienes» y «este personaje no
   * sabe qué es la inspiración» se verían igual, y el DM no tendría nada que pulsar.
   *
   * **`max: 1` es la regla del SRD escrita donde se cumple** —la tienes o no la tienes—, y es la
   * razón entera de que **no haga falta un booleano en `Character`**: esta tabla ya es un contador
   * con máximo, y `schema.prisma` la nombra desde 2A.8 como «recursos consumibles: inspiracion,
   * furia, ki…». Una columna nueva habría sido una segunda verdad sobre el mismo hecho.
   *
   * `DM_ONLY` cierra quién puede subirla; gastarla y regalarla son del dueño.
   */
  async seedInspirationFor(characterId: string, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).characterResource.upsert({
      where: { characterId_key: { characterId, key: CLAVE_INSPIRACION } },
      create: {
        characterId,
        key: CLAVE_INSPIRACION,
        label: "Inspiración",
        current: 0,
        max: 1,
        // NONE: no la repone ningún descanso. La da el DM por interpretar bien, y dormir no se
        // gana nada.
        resetOn: "NONE",
        grantedBy: "DM_ONLY",
      },
      // **Lo que ya tenga NO se toca.**
      update: {},
    });
  }

  /**
   * Los recursos que la clase implica: dados de golpe y espacios de conjuro. Se llama al crear
   * o subir de nivel un personaje —eso vive en `characters/`, fuera de esta frontera— para que
   * ese llamador no reimplemente la tabla de espacios ni la del dado de golpe.
   *
   * **`level` aparte de `sheet`**: `CharacterSheet` (`../../rules/catalog`) no lleva el nivel
   * del personaje —lo consume ya resuelto en `spellSlots`—, y el máximo de dados de golpe SÍ es
   * el nivel en bruto. Pedirlo aparte es más honesto que adivinarlo de la hoja.
   *
   * **Paso 2, tarea A11 — también siembra las actividades concedidas (`sheet.activities`).**
   * Hasta esta tarea nadie sembraba `rage`: `resolve.ts` (A9/A10) ya sabía DECIR que un bárbaro
   * de nivel 3 tiene la Furia con 3 usos, pero nada escribía la fila de `CharacterResource` que
   * `ActivitiesService.usar` necesita para gastarla — un jugador pulsaba «Furia» y recibía «no
   * te quedan usos» de un recurso que nunca existió. `sheet.activities` llega **ya filtrada**
   * por nivel y por subclase elegida (`resolve.ts`, `concederActividadDe`): esta función no
   * repite ningún filtro, siembra lo que la hoja ya decidió que el personaje tiene.
   *
   * `Pick` se amplía con `"activities"` y no cambia la firma para quien ya llama con una
   * `CharacterSheet` completa (`characters/character-sheet.service.ts`,
   * `level-up/level-up.service.ts`): los dos ya pasan la hoja entera, así que ningún llamador
   * existente necesita tocarse.
   */
  async seedResourcesFor(
    characterId: string,
    sheet: Pick<CharacterSheet, "classKey" | "spellSlots" | "spellSlotResetOn" | "activities">,
    level: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    const clase = SRD_CLASSES.find((c) => c.key === sheet.classKey);
    // 8 de respaldo si la clave no resuelve: nunca deja al personaje sin dados de golpe.
    const hitDieSize = clase?.hitDie ?? 8;
    const hitDiceKey = `hit-dice-d${hitDieSize}`;

    await client.characterResource.upsert({
      where: { characterId_key: { characterId, key: hitDiceKey } },
      create: {
        characterId,
        key: hitDiceKey,
        label: `Dados de golpe (d${hitDieSize})`,
        current: level,
        max: level,
        // NONE, no LONG_REST: su reposición no es "a máximo" como cualquier otro consumible,
        // es "la mitad, redondeando hacia arriba, mínimo uno" — una regla que solo el
        // descanso largo sabe aplicar (`RestService`), y por eso el reseteo genérico la deja
        // en paz.
        resetOn: "NONE",
        grantedBy: "OWNER",
      },
      // Al subir de nivel el tope sube con él; lo ya gastado no se toca.
      update: { max: level },
    });

    for (const slot of sheet.spellSlots) {
      const key = `spell-slot-${slot.spellLevel}`;
      await client.characterResource.upsert({
        where: { characterId_key: { characterId, key } },
        create: {
          characterId,
          key,
          label: `Espacios de conjuro de nivel ${slot.spellLevel}`,
          current: slot.slots,
          max: slot.slots,
          // El brujo repone en descanso CORTO; el resto, en el largo. `spellSlotResetOn` ya
          // trae esa distinción resuelta desde `rules/catalog/spell-slots.ts`.
          resetOn: sheet.spellSlotResetOn,
          grantedBy: "OWNER",
        },
        update: { max: slot.slots, resetOn: sheet.spellSlotResetOn },
      });
    }

    // Paso 2, tarea A11 — las actividades que el catálogo concede con sus propios usos (hoy,
    // solo la Furia). Nada que gastar sin esta fila: ver el comentario grande de arriba.
    for (const actividad of sheet.activities) {
      if (!actividad.usos) continue;

      // **`max: null` es "sin tope" (nivel 20 de la Furia), y aquí es donde ese vocabulario
      // choca con una columna `Int` que no admite ausencia.** `current` sigue siendo un número
      // real: se siembra con `MARCADOR_DE_USOS_SIN_TOPE`, declarado y explicado más abajo — no
      // es una cifra del SRD, es un límite práctico hasta que exista un camino de gasto que
      // trate `max === null` como "nunca compares con `current`" (hoy no lo hay:
      // `ActivitiesService.consumir` y `RestService` comparan `current` sin mirar `max`, y el
      // segundo ni siquiera repone un recurso con `max: null` en un descanso — ver
      // `docs/06-pendientes.md`, ficha añadida en esta misma tarea). Fuera de la frontera de
      // A11: los dos ficheros que lo arreglarían de verdad no están en su encargo.
      const current = actividad.usos.max ?? MARCADOR_DE_USOS_SIN_TOPE;

      await client.characterResource.upsert({
        where: { characterId_key: { characterId, key: actividad.key } },
        create: {
          characterId,
          key: actividad.key,
          label: etiquetaDeActividad(clase, actividad.key),
          current,
          max: actividad.usos.max,
          resetOn: actividad.usos.resetOn,
          grantedBy: "OWNER",
        },
        // **Solo el tope se actualiza al subir de nivel; lo ya gastado no se toca** — la misma
        // regla que ya aplican los dados de golpe y los espacios de conjuro, arriba. Un bárbaro
        // que ya gastó su Furia esta sesión no la recupera de regalo al subir de nivel 8 a 9.
        //
        // **Excepción declarada (importante I4, ronda de arreglo 1): al entrar en `max: null`,
        // `current` también se sube al marcador.** Sin esto, un bárbaro que sube de nivel 19 a
        // 20 con, digamos, un uso gastado de tres se queda en `current: 2`, `max: null` — y
        // ningún descanso vuelve a tocar esa fila (`RestService` no repone un `max: null`, la
        // otra mitad de esta misma deuda). «Sin tope» se quedaría, en la práctica, en «dos usos
        // para siempre»: exactamente lo que este marcador existe para evitar. Es la única
        // excepción a «lo ya gastado no se toca», y solo aplica en el instante en que `max` pasa
        // a ser `null` — el resto de las subidas de nivel (2 a 3, 8 a 9…) no la disparan porque
        // el `max` de antes ya no era `null` para empezar.
        update:
          actividad.usos.max === null
            ? { max: null, current: MARCADOR_DE_USOS_SIN_TOPE }
            : { max: actividad.usos.max },
      });
    }
  }
}

/**
 * **No es un número del SRD.** El SRD dice "Unlimited" (nivel 20 de la Furia), no un entero, y
 * la columna `current` de `CharacterResource` es un `Int` de Postgres que no admite «sin tope» —
 * a diferencia de `max`, que sí lo dice con `null`. Un millón de usos es, en la práctica, «no se
 * te van a acabar en una sesión», sin fingir ser una medida de reglas (el mismo motivo por el que
 * este proyecto no copia el `999` de Foundry para "infinito" — ver `classes.ts`, la nota grande
 * sobre `RASGO_FURIA`).
 *
 * **Y desde la ficha A11-usos-sin-tope (2026-09-07), los dos que decían no mirarlo lo miran**:
 * `ActivitiesService.consumir` ya no compara ni descuenta cuando `max === null`, y `RestService`
 * repone esa fila hasta este marcador en vez de saltársela. Lo que sigue haciendo falta —y por lo
 * que este número **no** sobra— es `ResourcesService.adjust`, la puerta del `+`/`−` a mano: ahí
 * `current` sigue siendo un entero que se mueve, y sin un valor de partida grande el `−` de un
 * recurso sin tope lo dejaría en cero. Sigue siendo una cota práctica, no una regla de juego.
 */
export const MARCADOR_DE_USOS_SIN_TOPE = 1_000_000;

/**
 * El texto que ve el jugador para un recurso concedido por un rasgo: **el nombre del rasgo en
 * `classes.ts`** (ola de arreglos de 3A.1, I11). Hasta esta ola era una tabla con una sola
 * entrada (`rage: "Furia"`) y el catálogo generado ya concedía una docena de rasgos más — los
 * recursos nuevos se etiquetaban con su clave («second-wind», «ki»), que es exactamente «un
 * valor de enumeración llegando a la pantalla». El nombre se busca en la clase y en sus
 * subclases; una clave sin rasgo (dato caduco) enseña su clave, como antes, sin reventar.
 */
function etiquetaDeActividad(clase: SrdClass | undefined, key: string): string {
  if (!clase) return key;
  const rasgos = [...clase.features, ...clase.subclasses.flatMap((s) => s.features)];
  return rasgos.find((f) => f.key === key)?.name ?? key;
}
