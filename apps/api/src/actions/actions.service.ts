import { Injectable } from "@nestjs/common";
import type {
  AccionDisponible,
  AccionesResponse,
  Activacion,
  CharacterSheetActivity,
  CosteDeAccion,
  EconomiaDelTurno,
  GrupoDeAccion,
  MotivoNoDisponible,
  SpellbookResponse,
} from "@dnd/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { CharacterSheetService } from "../characters/character-sheet.service";
import { SpellbookService } from "../spellbook/spellbook.service";
import { InventoryService } from "../inventory/inventory.service";
import { requireOwnerOrDM, requireVisibleCharacter } from "../common/character-viewer";
import type { Attack } from "../rules/attacks";
import { actividadDeLanzamiento, SRD_SPELL_POR_KEY } from "../rules/catalog";
import { BASIC_ACTIONS, BASIC_ACTION_KEYS } from "../rules/catalog/basic-actions";

// Tarea 1 del plan 3A.3 («la barra de acciones», T21) — la lista única de `GET …/actions`. Hasta
// esta tarea la web tenía que juntar el cuadro de ataques (`CharacterSheetService.getSheet`), el
// libro de conjuros (`SpellbookService.list`), `sheet.activities` y el inventario cada uno con su
// propia idea de "disponible ahora", y la economía del turno (`Combatant`) en un quinto sitio. Este
// servicio no calcula NINGUNA mecánica nueva: solo COMPONE lo que esas cuatro puertas ya derivan,
// y decide en un solo lugar qué motivo explica cada gris.
//
// **Solo dueño o DM** (ruling del orquestador, 2026-09-18) — la barra es del jugador sobre SU
// personaje: un jugador ajeno recibe 403, no una versión redactada. Es más simple que filtrar
// motivos y recursos por visor, y no abre ninguna fuga que `canView` no abriera ya (un aliado
// visible se ve en la hoja igual, solo que sin botones que pulsar).

/** Los motivos que son AVISO y no apagan el botón (D-CF-126: hoy solo `NO_PREPARADO`). */
const AVISOS = new Set<MotivoNoDisponible>(["NO_PREPARADO"]);

function disponible(motivos: MotivoNoDisponible[]): boolean {
  return motivos.every((m) => AVISOS.has(m));
}

/** `Actividad["tipo"]` tal cual, salvo para un conjuro sin actividad de lanzamiento (`"texto"`). */
type TipoDeMecanica = "ataque" | "salvacion" | "dados" | "utilidad" | "prueba" | "texto";

function objetivosDeTipo(tipo: TipoDeMecanica): "ninguno" | "uno" | "varios" {
  switch (tipo) {
    case "ataque":
      return "uno";
    case "salvacion":
    case "dados":
      return "varios";
    default:
      return "ninguno";
  }
}

/**
 * El coste de la BARRA (`CosteDeAccion`) para una `Activacion` del catálogo. Una activación por
 * tiempo (minuto/hora — un ritual) no gasta ninguna casilla de `Combatant`: `"TIEMPO"` es la
 * señal de que la economía del turno nunca la apaga.
 */
function costeDeActivacion(activacion: Activacion): CosteDeAccion {
  if ("tiempo" in activacion) return "TIEMPO";
  switch (activacion.coste) {
    case "ACTION":
      return "ACTION";
    case "BONUS":
      return "BONUS";
    case "REACTION":
      return "REACTION";
    case "FREE":
      return "FREE";
    case "MOVEMENT":
      // Medido sobre el catálogo real (SRD 5.1 completo, tarea 0 de 3A.1 y siguientes): ninguna
      // actividad declara hoy `coste: "MOVEMENT"` como SU propia activación — el movimiento se
      // gasta en pies (`Combatant.movementUsed`), no como una activación entera. Si algún día
      // aparece una, se cuenta como `ACTION` hasta que la barra sepa pintar un coste de
      // movimiento propio: es la misma doctrina que el resto del proyecto — un dato que el
      // catálogo no trae hoy no se inventa, se declara el motivo y se decide.
      return "ACTION";
  }
}

@Injectable()
export class ActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly characterSheet: CharacterSheetService,
    private readonly spellbook: SpellbookService,
    private readonly inventory: InventoryService,
  ) {}

  async list(userId: string, campaignId: string, characterId: string): Promise<AccionesResponse> {
    const character = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    await requireOwnerOrDM(
      this.membership,
      campaignId,
      userId,
      character,
      "Solo el dueño del personaje o el DM puede ver su barra de acciones.",
    );

    const [hoja, libro, inventario, combatiente] = await Promise.all([
      this.characterSheet.getSheet(userId, campaignId, characterId),
      this.spellbook.list(userId, campaignId, characterId),
      this.inventory.list(userId, campaignId, characterId),
      this.prisma.combatant.findFirst({
        where: { characterId, encounter: { status: "ACTIVE", session: { campaignId } } },
        select: {
          actionUsed: true,
          bonusUsed: true,
          reactionUsed: true,
          movementUsed: true,
          position: true,
          encounter: { select: { activePosition: true } },
        },
      }),
    ]);

    const enCombate = combatiente !== null;
    const esMiTurno = combatiente
      ? combatiente.position === combatiente.encounter.activePosition
      : null;
    const economia: EconomiaDelTurno | null = combatiente
      ? {
          actionUsed: combatiente.actionUsed,
          bonusUsed: combatiente.bonusUsed,
          reactionUsed: combatiente.reactionUsed,
          movementUsed: combatiente.movementUsed,
        }
      : null;

    const grupos: Record<GrupoDeAccion, AccionDisponible[]> = {
      ATAQUES: this.ataques(hoja.attacks as Attack[], enCombate, esMiTurno, economia),
      CONJUROS: this.conjuros(libro, enCombate, esMiTurno, economia),
      APTITUDES: await this.aptitudes(
        characterId,
        hoja.sheet?.activities ?? [],
        enCombate,
        esMiTurno,
        economia,
      ),
      OBJETOS: this.objetos(inventario.items, enCombate, esMiTurno, economia),
      BASICAS: this.basicas(enCombate, esMiTurno, economia),
    };

    return {
      characterId,
      enCombate,
      esMiTurno,
      economia,
      // `effectiveSpeeds` (2.5.5) ya aplica condiciones y sobrecarga — la misma velocidad que
      // pinta la hoja, no una segunda lectura de `sheet.speeds` sin esas rebajas.
      velocidadPies: hoja.effectiveSpeeds?.walk?.total ?? null,
      grupos,
    };
  }

  /**
   * Lo que la economía del turno apaga o avisa para un coste dado. `[]` fuera de combate — la
   * doctrina D-N-2: `FUERA_DE_COMBATE` no es un motivo que se emita aquí, es lo que ya dice
   * `enCombate: false` en la respuesta; las acciones se pueden usar igual fuera de la mesa de
   * combate.
   */
  private motivosPorEconomia(
    coste: CosteDeAccion,
    enCombate: boolean,
    esMiTurno: boolean | null,
    economia: EconomiaDelTurno | null,
  ): MotivoNoDisponible[] {
    if (!enCombate || !economia) return [];
    const motivos: MotivoNoDisponible[] = [];
    // Solo acción y adicional dependen de QUE sea tu turno — una reacción, por diseño del SRD, se
    // usa fuera de tu turno (`shield` es la reacción de otro al ataque que te hacen a TI).
    if ((coste === "ACTION" || coste === "BONUS") && esMiTurno === false) {
      motivos.push("NO_ES_TU_TURNO");
    }
    if (coste === "ACTION" && economia.actionUsed) motivos.push("ACCION_GASTADA");
    if (coste === "BONUS" && economia.bonusUsed) motivos.push("ADICIONAL_GASTADA");
    if (coste === "REACTION" && economia.reactionUsed) motivos.push("REACCION_GASTADA");
    return motivos;
  }

  // --- ATAQUES --------------------------------------------------------------------------------

  private ataques(
    attacks: Attack[],
    enCombate: boolean,
    esMiTurno: boolean | null,
    economia: EconomiaDelTurno | null,
  ): AccionDisponible[] {
    return attacks.map((attack) => {
      const motivos = this.motivosPorEconomia("ACTION", enCombate, esMiTurno, economia);
      return {
        key: `attack:${attack.key}`,
        grupo: "ATAQUES",
        name: attack.name,
        coste: "ACTION",
        // Ruling del orquestador: el vocabulario de daño viaja en inglés de claves
        // (`attack.damage.type`) — la web lo traduce, la misma puerta que ya usa el resto de la
        // pantalla (`dominio/dano.ts`). `NO_EQUIPADA` no aplica: `buildResponse` solo trae armas
        // EQUIPADAS al cuadro de ataques.
        mecanica: {
          tipo: "ataque",
          dados: attack.damage.expression,
          tipoDeDano: attack.damage.type,
        },
        objetivos: "uno",
        disponible: disponible(motivos),
        motivos,
      };
    });
  }

  // --- CONJUROS --------------------------------------------------------------------------------

  private conjuros(
    libro: SpellbookResponse,
    enCombate: boolean,
    esMiTurno: boolean | null,
    economia: EconomiaDelTurno | null,
  ): AccionDisponible[] {
    const salida: AccionDisponible[] = [];
    for (const entrada of libro.entradas) {
      // Todas las `lanzable` (trucos y preparados/conocidos) + las `EN_EL_LIBRO` — D-CF-126: se
      // lanzan igual, con `NO_PREPARADO` como aviso. Un conjuro ni preparado ni en el libro (sin
      // marcar en absoluto) no sale: no es de la lista de este personaje hoy.
      if (!entrada.lanzable && entrada.estado !== "EN_EL_LIBRO") continue;

      const spellObj = SRD_SPELL_POR_KEY.get(entrada.key);
      const actividadDeLanzar = spellObj ? actividadDeLanzamiento(spellObj) : undefined;
      const coste = actividadDeLanzar ? costeDeActivacion(actividadDeLanzar.activation) : "ACTION";

      const motivos = this.motivosPorEconomia(coste, enCombate, esMiTurno, economia);
      if (entrada.estado === "EN_EL_LIBRO") motivos.push("NO_PREPARADO");

      let recurso: AccionDisponible["recurso"];
      if (entrada.level > 0) {
        const encontrado = this.recursoDeEspacio(entrada.level, libro.espacios);
        recurso = encontrado.recurso;
        if (encontrado.sinEspacio) motivos.push("SIN_ESPACIO");
      }

      salida.push({
        key: `spell:${entrada.key}`,
        grupo: "CONJUROS",
        name: entrada.nameEs,
        coste,
        spellLevel: entrada.level,
        ...(recurso ? { recurso } : {}),
        mecanica: { tipo: entrada.mecanica },
        objetivos: entrada.objetivos,
        escalaPorEspacio: entrada.escalaPorEspacio,
        disponible: disponible(motivos),
        motivos,
      });
    }
    return salida;
  }

  /**
   * El espacio que paga un conjuro de este nivel: el suyo si tiene, o el MENOR superior con
   * espacio (se puede lanzar más alto — SRD 5.1, *Casting a Spell at a Higher Level*). Sin
   * ninguno de los dos, `sinEspacio: true` (`SIN_ESPACIO`) y el `recurso` sigue apuntando al
   * propio nivel en 0, para que la pantalla pinte «0/4» y no un hueco.
   */
  private recursoDeEspacio(
    nivel: number,
    espacios: SpellbookResponse["espacios"],
  ): { recurso?: AccionDisponible["recurso"]; sinEspacio: boolean } {
    const propio = espacios.find((e) => e.nivel === nivel);
    if (propio && propio.actual > 0) {
      return {
        recurso: { tipo: "ESPACIO", actual: propio.actual, max: propio.max, nivel: propio.nivel },
        sinEspacio: false,
      };
    }
    const superior = espacios
      .filter((e) => e.nivel > nivel && e.actual > 0)
      .sort((a, b) => a.nivel - b.nivel)[0];
    if (superior) {
      return {
        recurso: {
          tipo: "ESPACIO",
          actual: superior.actual,
          max: superior.max,
          nivel: superior.nivel,
        },
        sinEspacio: false,
      };
    }
    return {
      recurso: propio
        ? { tipo: "ESPACIO", actual: propio.actual, max: propio.max, nivel: propio.nivel }
        : undefined,
      sinEspacio: true,
    };
  }

  // --- APTITUDES -------------------------------------------------------------------------------

  private async aptitudes(
    characterId: string,
    activities: CharacterSheetActivity[],
    enCombate: boolean,
    esMiTurno: boolean | null,
    economia: EconomiaDelTurno | null,
  ): Promise<AccionDisponible[]> {
    if (activities.length === 0) return [];

    // La clave del `CharacterResource` de una actividad con usos ES `activity.key` (la Furia
    // consume "rage" y su recurso sembrado también se llama "rage" — `classes.ts`, `RASGO_FURIA`):
    // una sola consulta por TODAS las actividades, no una por actividad.
    const claves = activities.filter((a) => a.usos).map((a) => a.key);
    const recursos =
      claves.length > 0
        ? await this.prisma.characterResource.findMany({
            where: { characterId, key: { in: claves } },
          })
        : [];
    const porClave = new Map(recursos.map((r) => [r.key, r]));

    return activities.map((activity) => {
      const coste = costeDeActivacion(activity.activation);
      const motivos = this.motivosPorEconomia(coste, enCombate, esMiTurno, economia);

      let recurso: AccionDisponible["recurso"];
      if (activity.usos) {
        const fila = porClave.get(activity.key);
        const actual = fila?.current ?? 0;
        recurso = { tipo: "USO", actual, max: activity.usos.max };
        // `max === null` es "sin tope" (la Furia desde nivel 20): nunca se apaga por usos.
        if (activity.usos.max !== null && actual === 0) motivos.push("SIN_USOS");
      }

      return {
        key: `feature:${activity.key}`,
        grupo: "APTITUDES",
        name: activity.name,
        coste,
        ...(recurso ? { recurso } : {}),
        mecanica: { tipo: activity.tipo },
        objetivos: objetivosDeTipo(activity.tipo),
        disponible: disponible(motivos),
        motivos,
      };
    });
  }

  // --- OBJETOS ---------------------------------------------------------------------------------

  private objetos(
    items: Awaited<ReturnType<InventoryService["list"]>>["items"],
    enCombate: boolean,
    esMiTurno: boolean | null,
    economia: EconomiaDelTurno | null,
  ): AccionDisponible[] {
    const salida: AccionDisponible[] = [];
    for (const fila of items) {
      // Solo consumibles a mano (llevados o equipados): uno guardado en el cofre de la posada no
      // se puede usar en la mesa. Y `×0` no sale — es la misma línea que el resto del inventario:
      // una fila a cero es ruido, no una acción con la que nadie puede hacer nada.
      if (fila.item.kind !== "CONSUMABLE") continue;
      if (fila.location === "STORED") continue;
      if (fila.quantity <= 0) continue;

      const motivos = this.motivosPorEconomia("ACTION", enCombate, esMiTurno, economia);
      salida.push({
        key: `item:${fila.id}`,
        grupo: "OBJETOS",
        name: fila.item.name,
        coste: "ACTION",
        recurso: { tipo: "CANTIDAD", actual: fila.quantity, max: null },
        objetivos: "uno",
        disponible: disponible(motivos),
        motivos,
      });
    }
    return salida;
  }

  // --- BASICAS ---------------------------------------------------------------------------------

  /** Las ocho, SIEMPRE (D-CF-49) — con o sin combate, con o sin nada más que ofrecer. */
  private basicas(
    enCombate: boolean,
    esMiTurno: boolean | null,
    economia: EconomiaDelTurno | null,
  ): AccionDisponible[] {
    return BASIC_ACTION_KEYS.map((clave) => {
      const motivos = this.motivosPorEconomia("ACTION", enCombate, esMiTurno, economia);
      return {
        key: `basic:${clave}`,
        grupo: "BASICAS",
        name: BASIC_ACTIONS[clave].name,
        coste: "ACTION",
        // Ninguna de las ocho tiene mecánica automatizada propia — es la mesa arbitrando con el
        // texto del SRD (ver `basic-actions.ts`), y por eso todas son `"texto"`, Ayudar incluida:
        // esto es la ETIQUETA de la fila, no el camino de `usar()` (que a Ayudar sí la rechaza).
        mecanica: { tipo: "texto" },
        objetivos: "ninguno",
        disponible: disponible(motivos),
        motivos,
      };
    });
  }
}
