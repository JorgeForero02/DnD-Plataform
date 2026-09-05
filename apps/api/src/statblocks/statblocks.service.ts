import { Injectable, NotFoundException } from "@nestjs/common";
import {
  origenDeRef,
  type CreateCampaignStatblockInput,
  type ProficiencyLevel,
  type SkillKey,
  type Statblock,
  type UpdateCampaignStatblockInput,
  type Visibility,
} from "@dnd/shared";
import type { CampaignStatblock as FilaStatblock, Prisma } from "@prisma/client";
import { MembershipService } from "../campaigns/membership.service";
import { canView, type Viewer } from "../common/visibility";
import { PrismaService } from "../prisma/prisma.service";
import { SRD_STATBLOCK_POR_REF, SRD_STATBLOCKS } from "../rules/catalog/monsters-srd";

// Tarea 2D.3 — **los statblocks propios del DM**, y la puerta única que resuelve un `ref`.
//
// Dos orígenes y **una sola forma resuelta**, exactamente como 2B hizo con los objetos: el
// catálogo del SRD vive en código (quince, `monsters-srd.ts`) y los propios del DM viven en la
// base. Quien consume un statblock —el motor, la pantalla, el instanciador de 2D.4— recibe un
// `Statblock` y no le importa de dónde salió.
//
// **Y el camino general es el del DM**, no el del SRD: la mesa del autor usa sus propios
// monstruos más que los del libro. Los quince del catálogo están para que el motor tenga contra
// qué probarse y para que una campaña nueva no empiece vacía.

@Injectable()
export class StatblocksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
  ) {}

  /**
   * Lo que quien mira puede ver: los quince del SRD **más** los propios de la campaña que su
   * visibilidad le permita.
   *
   * Los del SRD no se filtran porque no son de nadie: son el libro, y el libro lo puede leer
   * cualquiera que juegue. Lo que sí se filtra son los del DM, y se filtra **aquí, en el
   * servidor** — un monstruo que el DM está preparando no viaja al cliente para que este lo
   * esconda. Es el agujero que la revisión de 2C encontró dos veces.
   */
  async list(userId: string, campaignId: string) {
    const viewer = await this.viewerFor(userId, campaignId);
    const filas = await this.prisma.campaignStatblock.findMany({
      where: { campaignId },
      orderBy: [{ cr: "asc" }, { name: "asc" }],
    });
    return {
      srd: SRD_STATBLOCKS,
      campaign: filas.filter((f) => this.puedeVer(viewer, f.visibility)).map(aStatblock),
    };
  }

  async create(userId: string, campaignId: string, input: CreateCampaignStatblockInput) {
    await this.membership.requireDM(campaignId, userId);
    const fila = await this.prisma.campaignStatblock.create({
      data: { ...aColumnasDeCreacion(input), campaignId, createdById: userId },
    });
    return aStatblock(fila);
  }

  async update(
    userId: string,
    campaignId: string,
    statblockId: string,
    input: UpdateCampaignStatblockInput,
  ) {
    await this.membership.requireDM(campaignId, userId);
    await this.exigirDeLaCampana(campaignId, statblockId);
    const fila = await this.prisma.campaignStatblock.update({
      where: { id: statblockId },
      data: aColumnas(input),
    });
    return aStatblock(fila);
  }

  async remove(userId: string, campaignId: string, statblockId: string) {
    await this.membership.requireDM(campaignId, userId);
    await this.exigirDeLaCampana(campaignId, statblockId);
    await this.prisma.campaignStatblock.delete({ where: { id: statblockId } });
    return { deleted: true };
  }

  /**
   * **La puerta única para resolver un `ref`.** La usa 2D.4 al instanciar y la usará la hoja de un
   * PNJ para derivar; nadie más vuelve a decidir qué significa `SRD:goblin`.
   *
   * Devuelve `null` cuando el `ref` no existe o **cuando quien mira no puede verlo**, y las dos
   * cosas se responden igual a propósito: distinguir «no existe» de «no puedes verlo» le dice a un
   * jugador que el DM tiene un monstruo preparado, que es exactamente lo que la visibilidad
   * `DM_ONLY` está evitando. El `viewer` es opcional porque el motor a veces resuelve para el
   * propio servidor, donde no hay nadie mirando.
   */
  async resolver(campaignId: string, ref: string, viewer?: Viewer): Promise<Statblock | null> {
    const origen = origenDeRef(ref);
    if (!origen) return null;

    if (origen.source === "SRD") return SRD_STATBLOCK_POR_REF.get(ref) ?? null;

    const fila = await this.prisma.campaignStatblock.findFirst({
      where: { id: origen.id, campaignId },
    });
    if (!fila) return null;
    if (viewer && !this.puedeVer(viewer, fila.visibility)) return null;
    return aStatblock(fila);
  }

  /**
   * Resolver **para derivar la hoja de un PNJ**, distinguiendo «no lo puedes ver» de «no existe».
   *
   * `resolver()` los confunde a propósito, y hace bien: decir «prohibido» sobre un statblock que
   * no has visto nunca ya confirma que existe. **Aquí no aplica**, y esa es toda la diferencia:
   * quien pregunta está mirando un PNJ que el DM ya le ha enseñado, así que la existencia de la
   * criatura **ya la sabe**. Lo único que hay que esconderle son los números.
   *
   * Colapsarlos aquí tampoco era una opción: la hoja habría contestado «apunta a un statblock que
   * ya no existe» sobre uno que existe perfectamente, y eso es mentirle al DM cuando de verdad
   * borre una plantilla. Un texto que discrepa del servidor es exactamente lo que este proyecto
   * tiene prohibido.
   */
  async resolverParaHoja(
    campaignId: string,
    ref: string,
    viewer: Viewer,
  ): Promise<{ statblock: Statblock } | { oculto: true } | { ausente: true }> {
    const origen = origenDeRef(ref);
    if (!origen) return { ausente: true };

    if (origen.source === "SRD") {
      // Los del libro no son de nadie: quien juega puede leerlos, y el bestiario ya se los
      // publica a la mesa entera. Esconderlos aquí no protegería nada y haría inútil revelar un
      // goblin.
      const srd = SRD_STATBLOCK_POR_REF.get(ref);
      return srd ? { statblock: srd } : { ausente: true };
    }

    const fila = await this.prisma.campaignStatblock.findFirst({
      where: { id: origen.id, campaignId },
    });
    if (!fila) return { ausente: true };
    if (!this.puedeVer(viewer, fila.visibility)) return { oculto: true };
    return { statblock: aStatblock(fila) };
  }

  /** Si quien mira puede ver los números de esta plantilla. Lo usa la hoja para redactar. */
  async puedeVerStatblock(campaignId: string, ref: string, viewer: Viewer): Promise<boolean> {
    const r = await this.resolverParaHoja(campaignId, ref, viewer);
    return "statblock" in r;
  }

  private async exigirDeLaCampana(campaignId: string, statblockId: string) {
    const fila = await this.prisma.campaignStatblock.findFirst({
      where: { id: statblockId, campaignId },
    });
    // 404 y no 403, que es lo que el resto de la fase eligió: decir «prohibido» sobre algo de otra
    // campaña ya confirma que existe.
    if (!fila) throw new NotFoundException("Ese statblock no existe en esta campaña.");
    return fila;
  }

  private puedeVer(viewer: Viewer, visibility: string): boolean {
    // Un statblock no tiene creador nominal ni concesiones: o lo ve tu nivel, o no. El DM lo ve
    // siempre, y eso ya lo decide `canView`.
    return canView(viewer, {
      visibility: visibility as Visibility,
      createdById: "",
      grantedUserIds: [],
    });
  }

  private async viewerFor(userId: string, campaignId: string): Promise<Viewer> {
    const member = await this.membership.requireMember(campaignId, userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return { userId, role: member.role, isAdmin: user?.isAdmin ?? false };
  }
}

/**
 * De fila a `Statblock`. **El `ref` lo pone el servidor**, siempre: `CAMPAIGN:<id>` no es algo que
 * el cliente pueda elegir, porque elegirlo sería poder apuntar al statblock de otra campaña.
 *
 * **Devuelve `visibility` además de la forma común** (C6-2): las del SRD no tienen nivel —las ve
 * todo el mundo— y las del DM sí, y el editor lo necesita para no tener que omitir el campo al
 * guardar. Por eso el tipo de salida es `Statblock` **más** ese campo, y no un `Statblock` a secas.
 */
export function aStatblock(fila: FilaStatblock): Statblock & { visibility: Visibility } {
  return {
    ref: `CAMPAIGN:${fila.id}`,
    source: "CAMPAIGN",
    // **Quién la ve viaja con ella** (ficha C6-2, 2026-09-05). No estaba, aunque el servicio SÍ
    // filtra por este campo, y la consecuencia era de las que no se ven: el editor de criaturas no
    // podía enseñar el nivel al editarlas, así que **omitía el campo en el `PUT`** para no pisar
    // una criatura que el DM ya había enseñado a la mesa. Funcionaba, y era un rodeo.
    //
    // No filtra nada nuevo: aquí solo llegan las que `puedeVer` ya dejó pasar, y saber el nivel de
    // algo que ya estás viendo no revela nada — es el mismo criterio que el bando de un combatiente.
    visibility: fila.visibility as Visibility,
    name: fila.name,
    size: fila.size,
    type: fila.type,
    ...(fila.subtype ? { subtype: fila.subtype } : {}),
    ...(fila.alignment ? { alignment: fila.alignment } : {}),
    ac: fila.ac,
    ...(fila.acNote ? { acNote: fila.acNote } : {}),
    hitDiceCount: fila.hitDiceCount,
    ...(fila.hitDieSizeOverride ? { hitDieSizeOverride: fila.hitDieSizeOverride } : {}),
    abilities: {
      str: fila.str,
      dex: fila.dex,
      con: fila.con,
      int: fila.int,
      wis: fila.wis,
      cha: fila.cha,
    },
    saveProficiencies: fila.saveProficiencies as Statblock["saveProficiencies"],
    skillProficiencies: (fila.skillProficiencies ?? {}) as Partial<
      Record<SkillKey, ProficiencyLevel>
    >,
    damageResistances: fila.damageResistances,
    damageImmunities: fila.damageImmunities,
    damageVulnerabilities: fila.damageVulnerabilities,
    damageModifiers: (fila.damageModifiers ?? []) as Statblock["damageModifiers"],
    conditionImmunities: fila.conditionImmunities,
    ...(fila.darkvisionFeet ? { darkvisionFeet: fila.darkvisionFeet } : {}),
    otherSenses: fila.otherSenses,
    speeds: (fila.speeds ?? {}) as Statblock["speeds"],
    ...(fila.languages ? { languages: fila.languages } : {}),
    cr: fila.cr,
    traits: (fila.traits ?? []) as Statblock["traits"],
    actions: (fila.actions ?? []) as Statblock["actions"],
    reactions: (fila.reactions ?? []) as Statblock["reactions"],
    legendaryActions: (fila.legendaryActions ?? []) as Statblock["legendaryActions"],
  };
}

/**
 * De entrada validada a columnas, al crear. **Escrita entera y sin `as`**: si mañana el esquema
 * compartido gana un campo, esto deja de compilar, que es exactamente lo que tiene que pasar. Un
 * `as Prisma.…CreateInput` sobre el resultado de `aColumnas` habría compilado y habría guardado
 * un statblock sin el campo nuevo.
 */
function aColumnasDeCreacion(
  input: CreateCampaignStatblockInput,
): Omit<Prisma.CampaignStatblockUncheckedCreateInput, "campaignId" | "createdById"> {
  return {
    name: input.name,
    size: input.size,
    type: input.type,
    subtype: input.subtype ?? null,
    alignment: input.alignment ?? null,
    ac: input.ac,
    acNote: input.acNote ?? null,
    hitDiceCount: input.hitDiceCount,
    hitDieSizeOverride: input.hitDieSizeOverride ?? null,
    str: input.abilities.str,
    dex: input.abilities.dex,
    con: input.abilities.con,
    int: input.abilities.int,
    wis: input.abilities.wis,
    cha: input.abilities.cha,
    saveProficiencies: input.saveProficiencies,
    skillProficiencies: input.skillProficiencies as Prisma.InputJsonValue,
    damageResistances: input.damageResistances,
    damageImmunities: input.damageImmunities,
    damageVulnerabilities: input.damageVulnerabilities,
    damageModifiers: input.damageModifiers as Prisma.InputJsonValue,
    conditionImmunities: input.conditionImmunities,
    darkvisionFeet: input.darkvisionFeet ?? null,
    otherSenses: input.otherSenses,
    speeds: input.speeds as Prisma.InputJsonValue,
    languages: input.languages ?? null,
    cr: input.cr,
    traits: input.traits as Prisma.InputJsonValue,
    actions: input.actions as Prisma.InputJsonValue,
    reactions: input.reactions as Prisma.InputJsonValue,
    legendaryActions: input.legendaryActions as Prisma.InputJsonValue,
    visibility: input.visibility,
  };
}

/**
 * De entrada validada a columnas, al editar. Solo escribe lo que viene, para que un `update` con
 * un solo campo no borre los otros veinte.
 */
function aColumnas(
  input: UpdateCampaignStatblockInput,
): Prisma.CampaignStatblockUncheckedUpdateInput {
  const d: Prisma.CampaignStatblockUncheckedUpdateInput = {};
  if (input.name !== undefined) d.name = input.name;
  if (input.size !== undefined) d.size = input.size;
  if (input.type !== undefined) d.type = input.type;
  if (input.subtype !== undefined) d.subtype = input.subtype ?? null;
  if (input.alignment !== undefined) d.alignment = input.alignment ?? null;
  if (input.ac !== undefined) d.ac = input.ac;
  if (input.acNote !== undefined) d.acNote = input.acNote ?? null;
  if (input.hitDiceCount !== undefined) d.hitDiceCount = input.hitDiceCount;
  if (input.hitDieSizeOverride !== undefined)
    d.hitDieSizeOverride = input.hitDieSizeOverride ?? null;
  if (input.abilities !== undefined) {
    d.str = input.abilities.str;
    d.dex = input.abilities.dex;
    d.con = input.abilities.con;
    d.int = input.abilities.int;
    d.wis = input.abilities.wis;
    d.cha = input.abilities.cha;
  }
  if (input.saveProficiencies !== undefined) d.saveProficiencies = input.saveProficiencies;
  if (input.skillProficiencies !== undefined)
    d.skillProficiencies = input.skillProficiencies as Prisma.InputJsonValue;
  if (input.damageResistances !== undefined) d.damageResistances = input.damageResistances;
  if (input.damageImmunities !== undefined) d.damageImmunities = input.damageImmunities;
  if (input.damageVulnerabilities !== undefined)
    d.damageVulnerabilities = input.damageVulnerabilities;
  if (input.damageModifiers !== undefined)
    d.damageModifiers = input.damageModifiers as Prisma.InputJsonValue;
  if (input.conditionImmunities !== undefined) d.conditionImmunities = input.conditionImmunities;
  if (input.darkvisionFeet !== undefined) d.darkvisionFeet = input.darkvisionFeet ?? null;
  if (input.otherSenses !== undefined) d.otherSenses = input.otherSenses;
  if (input.speeds !== undefined) d.speeds = input.speeds as Prisma.InputJsonValue;
  if (input.languages !== undefined) d.languages = input.languages ?? null;
  if (input.cr !== undefined) d.cr = input.cr;
  if (input.traits !== undefined) d.traits = input.traits as Prisma.InputJsonValue;
  if (input.actions !== undefined) d.actions = input.actions as Prisma.InputJsonValue;
  if (input.reactions !== undefined) d.reactions = input.reactions as Prisma.InputJsonValue;
  if (input.legendaryActions !== undefined)
    d.legendaryActions = input.legendaryActions as Prisma.InputJsonValue;
  if (input.visibility !== undefined) d.visibility = input.visibility;
  return d;
}
