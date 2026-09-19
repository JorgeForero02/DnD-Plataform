import type { AbilityKey } from "./rules/trace.schema";
import type { DamageType } from "./item.schema";
import type { EconomiaDelTurno } from "./action-economy.schema";

// Tarea 1 del plan 3A.3 («la barra de acciones», T21) — una sola lista de lo que un personaje
// puede hacer AHORA, con el motivo si no puede. Hasta esta tarea la pantalla tenía que juntar
// `attacks` de la hoja, `entradas` del libro de conjuros, `sheet.activities` y el inventario por
// su cuenta, cada uno con su propia idea de "disponible" — y la economía del turno (`Combatant`)
// en un cuarto sitio. Esta es la única forma que la web necesita para pintar la barra: el servidor
// decide qué grupo es cada cosa y por qué está en gris.
//
// **No es un esquema de entrada.** Nadie manda esto en un `body`: es lo que devuelve
// `GET …/actions`, compuesto por `ActionsService` a partir de piezas que YA existen (el cuadro de
// ataques, el libro de conjuros, `sheet.activities`, el inventario, `Combatant`). Por eso son
// tipos TS, no un `z.object` — el mismo criterio que `SpellbookResponse` en `spellbook.schema.ts`.

/** Los cinco cajones de la barra. Ninguna acción vive en dos a la vez. */
export type GrupoDeAccion = "ATAQUES" | "CONJUROS" | "APTITUDES" | "OBJETOS" | "BASICAS";

/**
 * Lo que cuesta activar la acción, en el vocabulario de la BARRA — no el mismo que `Coste`
 * (`action-economy.schema.ts`), que solo tiene cuatro miembros con economía de turno de verdad.
 * `TIEMPO` cubre lo que la activación mide en minutos u horas (un ritual, un descanso): no gasta
 * ninguna de las cuatro casillas de `Combatant`, así que la economía del turno nunca lo apaga.
 */
export type CosteDeAccion = "ACTION" | "BONUS" | "REACTION" | "FREE" | "TIEMPO";

/** Por qué una acción sale en gris, o por qué sale con un aviso aunque se pueda usar igual. */
export type MotivoNoDisponible =
  | "SIN_ESPACIO"
  | "SIN_USOS"
  | "NO_PREPARADO"
  | "ACCION_GASTADA"
  | "ADICIONAL_GASTADA"
  | "REACCION_GASTADA"
  | "NO_ES_TU_TURNO"
  | "SIN_CANTIDAD"
  | "NO_EQUIPADA"
  | "FUERA_DE_COMBATE";

/** Una fila de la barra: la acción, su coste, y por qué está o no disponible ahora. */
export interface AccionDisponible {
  /**
   * Clave que la pantalla manda a la puerta que toque: `attack:<attackKey>`, `spell:<key>`,
   * `feature:<key>`, `item:<rowId>`, `basic:<dodge|help|hide|disengage|dash|ready|search|use-object>`.
   */
  key: string;
  grupo: GrupoDeAccion;
  /** Ya en español — la barra nunca traduce un valor de enumeración en el navegador. */
  name: string;
  coste: CosteDeAccion;
  /** Conjuros: nivel 0..9; el resto sin. */
  spellLevel?: number;
  /** Lo que se gasta: «espacio de nivel 2 · 1/2», «uso 2/3», «×3». */
  recurso?: {
    tipo: "ESPACIO" | "USO" | "CANTIDAD";
    actual: number;
    max: number | null;
    nivel?: number;
  };
  /**
   * Resumen mecánico corto para la fila: `1d8+3 cortante`, `8d6 fuego · salvación DES`,
   * `1d20+5 vs CA`. El vocabulario de daño (`tipoDeDano`) viaja en INGLÉS de claves — la web lo
   * traduce con `dominio/dano.ts`, la misma puerta que ya usa el resto de la pantalla.
   */
  mecanica?: {
    tipo: "ataque" | "salvacion" | "dados" | "utilidad" | "prueba" | "texto";
    dados?: string;
    tipoDeDano?: DamageType;
    ability?: AbilityKey;
  };
  objetivos: "ninguno" | "uno" | "varios";
  escalaPorEspacio?: boolean;
  disponible: boolean;
  /** Vacío si `disponible`. Puede haber varios motivos a la vez (sin espacio Y acción gastada). */
  motivos: MotivoNoDisponible[];
}

/** `GET …/campaigns/:campaignId/characters/:characterId/actions` — la barra entera. */
export interface AccionesResponse {
  characterId: string;
  enCombate: boolean;
  /** `null` fuera de combate: la pregunta no significa nada sin un turno que sea de alguien. */
  esMiTurno: boolean | null;
  economia: EconomiaDelTurno | null;
  velocidadPies: number | null;
  grupos: Record<GrupoDeAccion, AccionDisponible[]>;
}
