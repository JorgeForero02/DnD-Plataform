import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  COIN_KEYS,
  COIN_WEIGHT_OZ,
  MAX_ATTUNED_ITEMS,
  WEIGHT_OZ_PER_LB,
  type AddInventoryItemInput,
  type ChangeMoneyInput,
  type ConsumeInventoryItemInput,
  type CoinKey,
  type EquipSlot,
  type ItemEffect,
  type ItemKind,
  type ItemLocation,
  type ResolvedItem,
  type UpdateInventoryItemInput,
} from "@dnd/shared";
import { Prisma, type Character, type InventoryItem } from "@prisma/client";
import type { GameEventPayload } from "@dnd/shared";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";
import { canView } from "../common/visibility";
import {
  requireOwnerOrDM,
  requireVisibleCharacter,
  requireVisibleCharacterWithViewer,
  viewerFor,
  viewerForCharacterOwner,
} from "../common/character-viewer";
import { resolveContentRef, resolveInventoryRowItem } from "./common/resolve-item";
import { CharacterSheetService } from "../characters/character-sheet.service";

// Carril A4 — el inventario de un personaje, equipar, sintonizar y la bolsa (hueco H1).
//
// **El núcleo es "una ranura, un objeto" más "una mano a dos manos deja la otra inutilizable"**:
// eso no es aritmética de columnas, es una regla de negocio que la base solo puede garantizar a
// medias (el índice único parcial de la migración cubre la primera parte; la segunda —que una
// mano a dos manos bloquee la otra— la decide este servicio, porque no hay forma de expresarla
// como una restricción SQL sin modelar "ocupación derivada", que sería guardar lo calculado).

/** Nombres para el mensaje de error; el resto de la interfaz traduce en la pantalla. */
const NOMBRE_DE_TIPO: Record<ItemKind, string> = {
  WEAPON: "un arma",
  ARMOR: "una armadura",
  SHIELD: "un escudo",
  CONSUMABLE: "un consumible",
  GEAR: "equipo",
  OTHER: "un objeto",
};

const NOMBRE_DE_RANURA: Record<EquipSlot, string> = {
  MAIN_HAND: "la mano principal",
  OFF_HAND: "la mano izquierda",
  ARMOR: "el cuerpo",
  HEAD: "la cabeza",
  NECK: "el cuello",
  CLOAK: "la espalda",
  RING_1: "un dedo",
  RING_2: "el otro dedo",
  HANDS: "las manos",
  FEET: "los pies",
  OTHER: "otra ranura",
};

interface PlacementInput {
  location?: ItemLocation;
  slot?: EquipSlot | null;
  attuned?: boolean;
}

interface PlacementCurrent {
  location: ItemLocation;
  slot: EquipSlot | null;
  attuned: boolean;
}

interface Placement {
  location: ItemLocation;
  slot: EquipSlot | null;
  attuned: boolean;
}

/**
 * La parte pura de "qué significa esta mutación": a qué sitio va, qué ranura le queda y si sigue
 * sintonizado. **No toca la base** —no puede saber si esa ranura está libre—, así que solo
 * decide la forma final y las contradicciones que se ven sin consultar nada más (sintonizar sin
 * estar equipado, sintonizar un objeto que no lo pide, equipar algo sin ranura).
 */
/**
 * Qué ranuras admite cada clase de objeto. **Una armadura en la cabeza seguía dando su Clase de
 * Armadura**, y un segundo escudo colocado a propósito en una ranura libre apagaba la hoja
 * entera (`InvalidEquipmentError` → `sheet: null`) en mitad de una sesión. Lo encontró la
 * auditoría de mecánica de 2B.
 *
 * `OTHER` y `CONSUMABLE` no se acotan: son el cajón donde el DM mete lo que el SRD no nombra.
 */
const RANURAS_POR_TIPO: Partial<Record<ItemKind, EquipSlot[]>> = {
  WEAPON: ["MAIN_HAND", "OFF_HAND"],
  ARMOR: ["ARMOR"],
  SHIELD: ["OFF_HAND"],
};

function resolvePlacement(
  current: PlacementCurrent,
  input: PlacementInput,
  itemDef: ResolvedItem,
): Placement {
  const location = input.location ?? current.location;

  let slot: EquipSlot | null;
  if (location === "EQUIPPED") {
    slot =
      input.slot !== undefined ? input.slot : current.location === "EQUIPPED" ? current.slot : null;
    if (!slot) slot = itemDef.slot ?? null;
    if (!slot) {
      throw new BadRequestException(
        `"${itemDef.name}" no tiene una ranura de equipo: no se puede llevar puesto.`,
      );
    }
    const admitidas = RANURAS_POR_TIPO[itemDef.kind];
    if (admitidas && !admitidas.includes(slot)) {
      throw new BadRequestException(
        `"${itemDef.name}" no se puede llevar en esa ranura: ${NOMBRE_DE_TIPO[itemDef.kind]} va en ${admitidas
          .map((r) => NOMBRE_DE_RANURA[r])
          .join(" o ")}.`,
      );
    }
  } else {
    // Pasar a CARRIED o STORED libera la ranura (regla 5) — sin ranura no hay nada que ocupar.
    slot = null;
  }

  if (input.attuned === true) {
    if (location !== "EQUIPPED") {
      throw new BadRequestException("Para sintonizar un objeto, primero hay que llevarlo puesto.");
    }
    if (!itemDef.requiresAttunement) {
      throw new BadRequestException(
        `"${itemDef.name}" no es un objeto que requiera sintonización.`,
      );
    }
  }

  let attuned = input.attuned ?? current.attuned;
  // Desequipar quita la sintonización (regla 4), tanto si el `PATCH` lo pide como si es un
  // efecto colateral de mover el objeto a la mochila o al cofre.
  if (location !== "EQUIPPED") attuned = false;

  return { location, slot, attuned };
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: GameEventsService,
    // M2B-11: la CA que devuelve `update()` la calcula la hoja, no una segunda fórmula aquí.
    private readonly characterSheet: CharacterSheetService,
  ) {}

  async list(userId: string, campaignId: string, characterId: string) {
    const character = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    const viewer = await viewerFor(this.prisma, this.membership, userId, campaignId);

    const rows = await this.prisma.inventoryItem.findMany({
      where: { characterId },
      orderBy: { createdAt: "asc" },
    });

    const resolvedRows = await Promise.all(
      rows.map(async (row) => {
        if (row.srdKey) {
          return { row, resolved: await resolveInventoryRowItem(this.prisma, campaignId, row) };
        }
        const { resolved, campaignItem } = await resolveContentRef(this.prisma, campaignId, {
          source: "CAMPAIGN",
          id: row.campaignItemId as string,
        });
        return { row, resolved, campaignItem };
      }),
    );

    // Lo que no se puede ver no se envía (regla del servidor): un `CampaignItem` cuya
    // visibilidad ya no alcanza a quien pregunta —aunque el objeto siga en la mochila— no sale
    // ni en la fila, ni en el peso total, ni de ninguna otra forma.
    const visibleRows = resolvedRows.filter(({ campaignItem }) => {
      if (!campaignItem) return true;
      return canView(viewer, {
        visibility: campaignItem.visibility,
        createdById: campaignItem.createdById,
        grantedUserIds: campaignItem.grantedUserIds,
      });
    });

    const items = visibleRows.map(({ row, resolved }) => ({
      id: row.id,
      quantity: row.quantity,
      location: row.location,
      slot: row.slot,
      attuned: row.attuned,
      storedAt: row.storedAt,
      note: row.note,
      item: resolved,
    }));

    const totalWeightOz = this.carriedWeightOz(visibleRows, character);
    const purse = {
      cp: character.cp,
      sp: character.sp,
      ep: character.ep,
      gp: character.gp,
      pp: character.pp,
    };
    // Fuerza × 15 libras, en onzas para no mezclar unidades con `totalWeightOz` (SRD 5.1,
    // capacidad de carga). `null` si el personaje no tiene Fuerza asignada todavía —una hoja a
    // medio hacer no inventa una capacidad—; NO se deriva de la hoja completa (`rules/catalog`)
    // porque `str` ya es una columna cruda de `Character` y leerla no es acoplarse al motor.
    const carryCapacityOz = character.str != null ? character.str * 15 * WEIGHT_OZ_PER_LB : null;

    return { items, purse, totalWeightOz, carryCapacityOz };
  }

  private carriedWeightOz(
    rows: { row: InventoryItem; resolved: ResolvedItem }[],
    character: Character,
  ): number {
    const itemsWeight = rows.reduce(
      (sum, { row, resolved }) =>
        row.location === "STORED" ? sum : sum + resolved.weightOz * row.quantity,
      0,
    );
    const coinCount = character.cp + character.sp + character.ep + character.gp + character.pp;
    const coinsWeight = Math.round(coinCount * COIN_WEIGHT_OZ);
    return itemsWeight + coinsWeight;
  }

  async add(userId: string, campaignId: string, characterId: string, input: AddInventoryItemInput) {
    const { character, viewer: actor } = await requireVisibleCharacterWithViewer(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    await requireOwnerOrDM(this.membership, campaignId, userId, character);

    const { resolved, campaignItem } = await resolveContentRef(this.prisma, campaignId, input.ref);

    // Regla 6: un objeto DM_ONLY de la campaña no se le puede dar a un personaje cuyo dueño no
    // puede verlo. Se mira por los ojos del DUEÑO del personaje, no de quien hace el `POST`
    // —puede ser el DM entregándolo—, porque la pregunta es si ese objeto le va a aparecer en
    // su propia mochila sin que él pueda verlo.
    if (campaignItem) {
      const ownerViewer = await viewerForCharacterOwner(
        this.prisma,
        this.membership,
        campaignId,
        character,
      );
      if (
        !canView(ownerViewer, {
          visibility: campaignItem.visibility,
          createdById: campaignItem.createdById,
          grantedUserIds: campaignItem.grantedUserIds,
        })
      ) {
        throw new BadRequestException(
          `El dueño del personaje no puede ver "${resolved.name}" todavía: súbele la visibilidad al objeto antes de dárselo.`,
        );
      }
    }

    const placement = resolvePlacement(
      { location: "CARRIED", slot: null, attuned: false },
      { location: input.location, slot: input.slot, attuned: undefined },
      resolved,
    );
    if (placement.location === "EQUIPPED") {
      await this.ensureSlotAllowed(characterId, campaignId, resolved, placement.slot as EquipSlot);
    }

    const de = userId !== character.ownerId ? actor.displayName : undefined;

    try {
      return await this.prisma.transaction(async (tx) => {
        // **El mismo candado que `update`, y en el mismo orden.** Sin esto, meter un objeto
        // equipado y equipar otro a la vez tomaban los recursos en orden inverso —uno el índice
        // de la ranura y otro la fila del personaje— y Postgres cortaba con un **deadlock
        // (40P01)** que salía como 500. Lo cazó el e2e de la carrera, que llevaba fallando una
        // vez de cada cuatro: no era una prueba frágil, era este ciclo. Todos los escritores del
        // inventario ordenan ahora por la misma fila.
        await tx.$queryRaw`SELECT id FROM "Character" WHERE id = ${characterId} FOR UPDATE`;
        const fila = await tx.inventoryItem.create({
          data: {
            characterId,
            srdKey: input.ref.source === "SRD" ? input.ref.key : null,
            campaignItemId: input.ref.source === "CAMPAIGN" ? input.ref.id : null,
            quantity: input.quantity,
            location: placement.location,
            slot: placement.slot,
            attuned: false,
            storedAt: input.storedAt ?? null,
            note: input.note ?? null,
          },
        });
        // **El objeto deja rastro, igual que el dinero.** Hasta la auditoría de mecánica de 2B
        // solo la bolsa escribía en la línea de tiempo, y con una semana entre sesiones eso
        // significa que nadie puede responder «¿quién cogió la gema?».
        await this.registrarSuceso(userId, campaignId, character, tx, {
          type: "ITEM_ADDED",
          item: resolved.name,
          ref: resolved.ref,
          quantity: input.quantity,
          location: placement.location,
          ...(de ? { de } : {}),
        });
        return fila;
      });
    } catch (error) {
      throw this.translateSlotConflict(error);
    }
  }

  /**
   * **De los efectos que declara un objeto a lo que el servidor sabe colgarle a un personaje.**
   *
   * Los nueve efectos de objeto son **pasivos y permanentes** —suman a una característica, a la
   * CA, a la velocidad—, no «cura 2d4+2»: esta tarea **no inventa un efecto de curación**, que es
   * el paso 2, donde una poción será un objeto con una actividad. Lo que sí puede hacerse hoy es
   * que consumir aplique lo que el objeto **ya dice** que hace.
   *
   * La maquinaria es la de los modificadores temporales (M8), que es la única forma que hay de
   * colgarle un número a un personaje sin tocar el motor, y su vocabulario cerrado son **las seis
   * características, la CA y las cinco velocidades**. Tres de los nueve efectos caben ahí; los
   * otros seis —competencias, salvaciones, PG máximos y los dos del arma— **no se fuerzan**: se
   * devuelven aparte para que el suceso los nombre.
   *
   * **Sin duración a propósito:** un efecto de objeto no declara ninguna, y fingir una sería
   * inventarse una regla. `expiresAtClock: null` es exactamente «hasta que alguien lo quite», que
   * es lo que el DM hace cuando la ficción lo diga.
   */
  private modificadoresDeEfectos(effects: ItemEffect[]): {
    aplicables: { target: string; amount: number }[];
    noAplicables: string[];
  } {
    const aplicables: { target: string; amount: number }[] = [];
    const noAplicables: string[] = [];
    for (const efecto of effects) {
      if (efecto.kind === "ac") {
        aplicables.push({ target: "ac", amount: efecto.amount });
      } else if (efecto.kind === "abilityScore" && efecto.mode === "add") {
        aplicables.push({ target: `ability.${efecto.ability}`, amount: efecto.amount });
      } else if (efecto.kind === "speed") {
        aplicables.push({ target: `speed.${efecto.movement}`, amount: efecto.amount });
      } else {
        // `abilityScore` en modo `set` tampoco entra: un modificador temporal **suma**, y fijar
        // una puntuación es un `override` que este vocabulario no tiene.
        noAplicables.push(efecto.kind);
      }
    }
    return { aplicables, noAplicables };
  }

  /**
   * Escribe el suceso del inventario **dentro de la misma transacción que el cambio**, que es lo
   * que ya hacen los puntos de golpe: si el cambio se deshace, su rastro se va con él.
   *
   * La visibilidad es la del **personaje**: quien puede ver la ficha puede ver que su dueño se
   * puso una armadura. Lo que no se ve por otro camino tampoco se ve aquí, porque el nombre que
   * viaja es el que este servicio ya decidió mandar.
   */
  private async registrarSuceso(
    userId: string,
    campaignId: string,
    character: Character,
    tx: Prisma.TransactionClient,
    payload: GameEventPayload,
  ): Promise<void> {
    await this.events.record(
      userId,
      campaignId,
      {
        subjectType: "character",
        subjectId: character.id,
        visibility: character.visibility,
        payload,
      },
      tx,
    );
  }

  async update(
    userId: string,
    campaignId: string,
    characterId: string,
    rowId: string,
    input: UpdateInventoryItemInput,
  ) {
    const character = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    await requireOwnerOrDM(this.membership, campaignId, userId, character);

    // **Todo el cambio se decide y se escribe con la fila del personaje bloqueada.**
    //
    // Antes solo se serializaba el carril de sintonizar, y lo demás leía por fuera: la regla de
    // manos —«un arma a dos manos deja la otra inutilizable»— se comprobaba contra un estado que
    // otra petición podía cambiar antes de escribir, y dos peticiones simultáneas dejaban
    // espadón **y** escudo puestos, con la CA inflada +2 durante todo el combate. El índice
    // único parcial de la migración no puede cubrirlo: es «una ranura, un objeto», y aquí las
    // dos ranuras son distintas. Lo encontró la auditoría de mecánica de 2B, y el candado es el
    // mismo que ya usaban los puntos de golpe y la bolsa.
    return this.prisma.transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Character" WHERE id = ${characterId} FOR UPDATE`;

      const row = await tx.inventoryItem.findFirst({ where: { id: rowId, characterId } });
      if (!row) throw new NotFoundException("Ese objeto no está en el inventario.");

      // **`quantityDelta` es la misma carrera que ya resuelve `consume`, imitada aquí** (M2B-8):
      // dos `PATCH` con `quantity` absoluto leen la misma cantidad de partida y la segunda
      // escritura pisa la resta de la primera. El delta se aplica con `increment` más abajo, así
      // que la comprobación de mínimo se hace contra la fila que ESTA transacción acaba de leer
      // con el candado puesto — no puede quedar obsoleta antes de escribir.
      //
      // **Baja de 1 es un 409, y no se borra la fila**: borrar al llegar a cero es el gesto de
      // `consume` (un consumible que se acaba), no el de mover cantidades con el `PATCH` genérico.
      // **Y un delta positivo tampoco puede saltarse el tope absoluto** (`quantity` en el
      // esquema va hasta 9999): sin este chequeo, una pila ya en 9999 más un delta positivo se
      // escribiría por encima del máximo que el propio esquema le impone a `quantity`.
      if (input.quantityDelta !== undefined) {
        const restantes = row.quantity + input.quantityDelta;
        if (restantes < 1) {
          throw new ConflictException(
            `Solo quedan ${row.quantity}: un delta de ${input.quantityDelta} las dejaría en ${restantes}.`,
          );
        }
        if (restantes > 9999) {
          throw new ConflictException(
            `Como mucho puede haber 9999: un delta de ${input.quantityDelta} sobre ${row.quantity} las dejaría en ${restantes}.`,
          );
        }
      }

      const itemDef = await resolveInventoryRowItem(this.prisma, campaignId, row, tx);

      const placement = resolvePlacement(
        { location: row.location, slot: row.slot, attuned: row.attuned },
        { location: input.location, slot: input.slot, attuned: input.attuned },
        itemDef,
      );

      if (placement.location === "EQUIPPED") {
        await this.ensureSlotAllowed(
          characterId,
          campaignId,
          itemDef,
          placement.slot as EquipSlot,
          rowId,
          tx,
        );
      }
      if (placement.attuned && !row.attuned) {
        await this.ensureAttunementAllowed(characterId, campaignId, rowId, tx);
      }

      // **`acBefore` se calcula ANTES de escribir** (fix round 1, Q-2): la pantalla que abre el
      // diálogo de la bolsa desde la mesa monta el inventario sin haber cargado la hoja, así que
      // la caché de TanStack Query no tenía nada que leer y el aviso "CA 13 -> 14" desaparecía en
      // silencio ahí. Ahora las dos mitades del aviso viajan en la misma respuesta, calculadas
      // dentro de la misma transacción — la de antes contra la fila tal cual estaba, la de
      // después contra lo que `escribirColocacion` acaba de dejar.
      const acBefore = await this.characterSheet.armorClassInTransaction(userId, character, tx);

      const actualizado = await this.escribirColocacion(tx, rowId, placement, input);
      if (placement.location !== row.location || placement.attuned !== row.attuned) {
        await this.registrarSuceso(userId, campaignId, character, tx, {
          type: "ITEM_MOVED",
          item: itemDef.name,
          ref: itemDef.ref,
          from: row.location,
          to: placement.location,
          ...(placement.slot ? { slot: placement.slot } : {}),
          ...(placement.attuned !== row.attuned ? { attuned: placement.attuned } : {}),
        });
      }
      // D-CF-14, commit 4 (M2B-8). **Solo cuando la cantidad de VERDAD cambió**: un `PATCH` de
      // otro campo (ranura, sintonía, `storedAt`, `note`) no toca `quantity`, y `escribirColocacion`
      // deja la fila igual — comparar contra `row.quantity`, la que esta transacción leyó con el
      // candado puesto, es lo mismo que ya hace `ITEM_MOVED` arriba con `location`.
      if (actualizado.quantity !== row.quantity) {
        await this.registrarSuceso(userId, campaignId, character, tx, {
          type: "ITEM_QUANTITY_CHANGED",
          item: itemDef.name,
          ref: itemDef.ref,
          from: row.quantity,
          to: actualizado.quantity,
        });
      }

      const ac = await this.characterSheet.armorClassInTransaction(userId, character, tx);
      return { item: actualizado, acBefore, ac };
    });
  }

  /** La escritura, compartida por el camino normal y por el que se serializa para sintonizar. */
  private async escribirColocacion(
    client: PrismaService | Prisma.TransactionClient,
    rowId: string,
    placement: Placement,
    input: UpdateInventoryItemInput,
  ) {
    const data: Prisma.InventoryItemUpdateInput = {
      location: placement.location,
      slot: placement.slot,
      attuned: placement.attuned,
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      // **Lo que serializa las dos peticiones es el candado `FOR UPDATE` sobre el personaje**
      // (arriba, al abrir la transacción) — eso es lo único que garantiza que la fila que lee
      // esta transacción no quede obsoleta antes de escribir. `increment` es defensa en
      // profundidad, no la razón de la corrección: si ese candado alguna vez se moviera o se
      // quitara, `increment` seguiría sumando de forma atómica en la misma sentencia SQL en vez
      // de leer-y-sumar en memoria (la mutación de esta tarea es justo cambiar esto por un
      // cálculo en memoria, y con el candado puesto la carrera NO vuelve — hace falta romper
      // también el candado para reproducirla, ver el informe).
      ...(input.quantityDelta !== undefined
        ? { quantity: { increment: input.quantityDelta } }
        : {}),
      ...(input.storedAt !== undefined ? { storedAt: input.storedAt } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
    };

    try {
      return await client.inventoryItem.update({ where: { id: rowId }, data });
    } catch (error) {
      throw this.translateSlotConflict(error);
    }
  }

  /**
   * Gasta unidades de un consumible. **Al llegar a cero, la fila se va**: una fila con cero
   * unidades no es información, es ruido en la mochila.
   *
   * Va en transacción y con la fila del personaje bloqueada por el mismo motivo que la bolsa:
   * dos personas gastando de la misma pila leen lo mismo y escriben lo mismo, y se pierde un
   * gasto. Aquí sí se puede hacer bien porque el gasto es un **delta**, no un valor final.
   */
  async consume(
    userId: string,
    campaignId: string,
    characterId: string,
    rowId: string,
    input: ConsumeInventoryItemInput,
  ) {
    const character = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    await requireOwnerOrDM(this.membership, campaignId, userId, character);

    return this.prisma.transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Character" WHERE id = ${characterId} FOR UPDATE`;
      const row = await tx.inventoryItem.findFirst({ where: { id: rowId, characterId } });
      if (!row) throw new NotFoundException("Ese objeto no está en el inventario.");
      if (row.quantity < input.amount) {
        throw new BadRequestException(
          `Solo quedan ${row.quantity}: no se pueden gastar ${input.amount}.`,
        );
      }

      const itemDef = await resolveInventoryRowItem(this.prisma, campaignId, row, tx);
      const restantes = row.quantity - input.amount;

      if (restantes === 0) {
        await tx.inventoryItem.delete({ where: { id: rowId } });
      } else {
        await tx.inventoryItem.update({ where: { id: rowId }, data: { quantity: restantes } });
      }

      // **Consumir un objeto aplica los efectos que YA declara**, y hasta el 2026-09-06 no lo
      // hacía: `consume` resolvía la definición y nunca miraba `effects` —grep de `effects` en
      // este fichero daba **cero**—, así que beberse una poción solo la borraba del inventario.
      // Los efectos solo se leían al derivar la hoja, y **desde lo equipado**.
      const { aplicables, noAplicables } = this.modificadoresDeEfectos(itemDef.effects ?? []);
      for (const modificador of aplicables) {
        await tx.temporaryModifier.create({
          data: {
            characterId,
            target: modificador.target,
            amount: modificador.amount,
            // El motivo se pinta en la traza, que es lo que impide un +2 sin origen.
            reason: itemDef.name,
            expiresAtClock: null,
            grantedById: userId,
          },
        });
      }

      await this.registrarSuceso(userId, campaignId, character, tx, {
        type: "ITEM_REMOVED",
        item: itemDef.name,
        ref: itemDef.ref,
        quantity: input.amount,
        ...(aplicables.length > 0 ? { effectsApplied: aplicables.map((m) => m.target) } : {}),
        ...(noAplicables.length > 0 ? { effectsNotApplied: noAplicables } : {}),
      });

      return { remaining: restantes, deleted: restantes === 0 };
    });
  }

  async remove(userId: string, campaignId: string, characterId: string, rowId: string) {
    const character = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    await requireOwnerOrDM(this.membership, campaignId, userId, character);

    const row = await this.prisma.inventoryItem.findFirst({ where: { id: rowId, characterId } });
    if (!row) throw new NotFoundException("Ese objeto no está en el inventario.");
    const itemDef = await resolveInventoryRowItem(this.prisma, campaignId, row);

    return this.prisma.transaction(async (tx) => {
      // **`deleteMany` y no `delete`**: soltar dos veces con mala red daba un 500 de Prisma
      // (P2025) sobre una operación que sí había funcionado. Así el reintento es inofensivo.
      const { count } = await tx.inventoryItem.deleteMany({ where: { id: rowId, characterId } });
      if (count > 0) {
        await this.registrarSuceso(userId, campaignId, character, tx, {
          type: "ITEM_REMOVED",
          item: itemDef.name,
          ref: itemDef.ref,
          quantity: row.quantity,
        });
      }
      return { deleted: count > 0 };
    });
  }

  /**
   * Mueve monedas por delta (regla H6). **Todo o nada por transacción**: si un solo tipo de
   * moneda se quedaría en negativo, no se toca ninguno —"cambiar 3 po por plata" es una decisión
   * de la mesa, no algo que el servidor resuelve solo.
   */
  async changeMoney(
    userId: string,
    campaignId: string,
    characterId: string,
    input: ChangeMoneyInput,
  ) {
    const { character, viewer: actor } = await requireVisibleCharacterWithViewer(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    await requireOwnerOrDM(this.membership, campaignId, userId, character);

    const deltas: Partial<Record<CoinKey, number>> = {};
    for (const key of COIN_KEYS) {
      const delta = input[key];
      if (delta !== undefined && delta !== 0) deltas[key] = delta;
    }

    const de = userId !== character.ownerId ? actor.displayName : undefined;

    return this.prisma.transaction(async (tx) => {
      // **La fila se bloquea antes de mirar el saldo.** La primera versión comprobaba el saldo
      // sobre una lectura de fuera de la transacción y escribía con `increment`: con 30 de oro,
      // dos peticiones de −20 a la vez pasaban las dos la comprobación y la bolsa acababa en
      // −10, rompiendo el mínimo que el propio esquema declara. Es el mismo `FOR UPDATE` que
      // usan los puntos de golpe, y por el mismo motivo. Lo encontró la revisión de 2B.
      const filas = await tx.$queryRaw<
        Character[]
      >`SELECT * FROM "Character" WHERE id = ${characterId} AND "campaignId" = ${campaignId} FOR UPDATE`;
      const bloqueado = filas[0];
      if (!bloqueado) throw new NotFoundException("Character not found");

      for (const key of COIN_KEYS) {
        const delta = deltas[key];
        if (delta === undefined) continue;
        const remaining = bloqueado[key] + delta;
        if (remaining < 0) {
          throw new BadRequestException(
            `No hay suficiente ${key.toUpperCase()} en la bolsa: quedarían ${remaining}.`,
          );
        }
      }

      const data: Prisma.CharacterUpdateInput = {};
      for (const key of Object.keys(deltas) as CoinKey[]) {
        data[key] = { increment: deltas[key] };
      }
      const updated = await tx.character.update({ where: { id: characterId }, data });

      await this.events.record(
        userId,
        campaignId,
        {
          subjectType: "character",
          subjectId: characterId,
          visibility: character.visibility,
          // `MONEY_CHANGED` con sus deltas por denominación. El carril que escribió esto no podía
          // tocar `packages/shared`, así que lo dejó como una señal genérica con el detalle en
          // prosa y lo declaró; al integrar, el tipo se añadió de verdad — un movimiento de
          // dinero guardado como texto libre no se puede sumar ni filtrar después.
          payload: {
            type: "MONEY_CHANGED",
            ...deltas,
            reason: input.reason,
            ...(de ? { de } : {}),
          },
        },
        tx,
      );

      return {
        cp: updated.cp,
        sp: updated.sp,
        ep: updated.ep,
        gp: updated.gp,
        pp: updated.pp,
      };
    });
  }

  /**
   * Comprueba las reglas de manos (regla 2) y, para cualquier otra ranura, que esté libre (regla
   * 1). Se comprueba ANTES de escribir para dar un 409 con un mensaje legible; el índice único
   * parcial de la migración es la red de seguridad para la carrera entre dos peticiones
   * simultáneas, no la primera línea de defensa.
   */
  private async ensureSlotAllowed(
    characterId: string,
    campaignId: string,
    itemDef: ResolvedItem,
    slot: EquipSlot,
    excludeRowId?: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    const isTwoHanded = itemDef.weapon?.properties.includes("TWO_HANDED") ?? false;

    if (slot === "MAIN_HAND" && isTwoHanded) {
      const offHand = await this.findEquippedInSlot(characterId, "OFF_HAND", excludeRowId, client);
      if (offHand) {
        const offHandItem = await resolveInventoryRowItem(this.prisma, campaignId, offHand);
        throw new ConflictException(
          `La mano izquierda ya lleva "${offHandItem.name}"; un arma a dos manos necesita las dos manos libres.`,
        );
      }
    }

    if (slot === "OFF_HAND") {
      // **Un arma a dos manos tampoco entra por la puerta de atrás.** La comprobación de arriba
      // solo miraba la mano principal, así que equipar el espadón en la izquierda se saltaba la
      // regla entera: quedaban dos armas en el cuadro de ataques y el propio mensaje del código
      // —«necesita las dos manos libres»— dejaba de ser cierto según por dónde entrases. Lo
      // encontró la auditoría de mecánica de 2B.
      if (isTwoHanded) {
        throw new ConflictException(
          `"${itemDef.name}" es un arma a dos manos: se empuña en la mano principal, y ocupa las dos.`,
        );
      }
      const mainHand = await this.findEquippedInSlot(
        characterId,
        "MAIN_HAND",
        excludeRowId,
        client,
      );
      if (mainHand) {
        const mainHandItem = await resolveInventoryRowItem(this.prisma, campaignId, mainHand);
        if (mainHandItem.weapon?.properties.includes("TWO_HANDED")) {
          throw new ConflictException(
            `La mano principal lleva "${mainHandItem.name}", un arma a dos manos: no queda hueco para la mano izquierda.`,
          );
        }
      }
    }

    const occupant = await this.findEquippedInSlot(characterId, slot, excludeRowId, client);
    if (occupant) {
      const occupantItem = await resolveInventoryRowItem(this.prisma, campaignId, occupant);
      throw new ConflictException(`La ranura ya la ocupa "${occupantItem.name}".`);
    }
  }

  private findEquippedInSlot(
    characterId: string,
    slot: EquipSlot,
    excludeRowId?: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    return client.inventoryItem.findFirst({
      where: {
        characterId,
        slot,
        location: "EQUIPPED",
        ...(excludeRowId ? { id: { not: excludeRowId } } : {}),
      },
    });
  }

  /** Regla 3: como mucho `MAX_ATTUNED_ITEMS` (tres) objetos sintonizados por personaje. */
  private async ensureAttunementAllowed(
    characterId: string,
    campaignId: string,
    excludeRowId?: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    const attunedRows = await client.inventoryItem.findMany({
      where: {
        characterId,
        attuned: true,
        ...(excludeRowId ? { id: { not: excludeRowId } } : {}),
      },
    });
    if (attunedRows.length >= MAX_ATTUNED_ITEMS) {
      const names = await Promise.all(
        attunedRows.map((r) =>
          resolveInventoryRowItem(this.prisma, campaignId, r).then((i) => i.name),
        ),
      );
      throw new BadRequestException(
        `Ya hay ${MAX_ATTUNED_ITEMS} objetos sintonizados: ${names.join(", ")}. Hay que desintonizar uno antes de sintonizar otro.`,
      );
    }
  }

  /** P2002 solo puede venir del índice único parcial de la migración: dos "equipar" a la vez. */
  private translateSlotConflict(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return new ConflictException("Esa ranura ya está ocupada por otro objeto.");
    }
    // **Un abrazo mortal es un choque, no un fallo del servidor.** Con el candado de arriba no
    // debería ocurrir, pero si dos escrituras vuelven a cruzarse por un camino nuevo, la mesa
    // merece «alguien se te adelantó» y no un 500 que no explica nada. Postgres lo llama 40P01
    // y Prisma no lo mapea: llega como `PrismaClientUnknownRequestError`.
    if (error instanceof Error && error.message.includes("40P01")) {
      return new ConflictException(
        "Otra persona estaba cambiando el equipo de este personaje a la vez. Inténtalo otra vez.",
      );
    }
    return error;
  }
}
