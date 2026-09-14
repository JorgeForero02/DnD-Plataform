import { describe, expect, it } from "vitest";
import { GAME_EVENT_TYPES, type GameEventPayload, type GameEventType } from "@dnd/shared";
import { tipoDeMensaje, type TipoDeMensaje } from "../tipo-de-mensaje";

// Qué defiende este fichero, en una frase: **que los 36 tipos de suceso del registro estén
// clasificados, cada uno en el cubo que le toca, y que el color de una voz sea siempre uno de los
// tokens declarados.**
//
// El `switch` de `tipoDeMensaje` es exhaustivo y no tiene `default`, a propósito: quitar un `case`
// da `TS2366` y el build se pone rojo. Pero **el compilador no defiende contra el arreglo fácil**
// —meter un `default: return "sistema"` «para que compile»—, que clasificaría en silencio un
// suceso nuevo en el cajón de sastre. Esta tabla es esa red: recorre `GAME_EVENT_TYPES`, que es la
// fuente única, así que un tipo nuevo sin decidir pone la prueba roja aunque el build pase.

/**
 * El cubo que le toca a cada tipo. **Se escribe a mano, y ese es el punto**: si esta tabla se
 * derivara de la función no probaría nada. Cada línea es una decisión que alguien tomó y que la
 * cabecera de `tipo-de-mensaje.ts` explica.
 */
const CUBO_ESPERADO: Record<GameEventType, TipoDeMensaje> = {
  // Sello: lo que parte el hilo en tramos y se lee sin leer la frase.
  SESSION_NOTE: "sello",
  SESSION_STARTED: "sello",
  SESSION_CLOSED: "sello",
  ENCOUNTER_STARTED: "sello",
  ENCOUNTER_ENDED: "sello",
  // Narración: el mundo hablando. Solo los tres sucesos de entidad.
  ENTITY_OPENED: "narracion",
  ENTITY_REVEALED: "narracion",
  // I19: la batuta. Es dirección, no narración de la mesa — y va `DM_ONLY`.
  DM_EXECUTED: "sistema",
  // D2: quién dirige la mesa es andamiaje de la campaña, no narración del mundo.
  MEMBER_ROLE_CHANGED: "sistema",
  ENTITY_LINKED: "narracion",
  ENTITY_RETYPED: "narracion",
  // Ola 3: comentar una ficha es el mundo hablando, con los otros sucesos de entidad.
  ENTITY_COMMENTED: "narracion",
  // Tirada: los cuatro sucesos que traen números tirados.
  ABILITY_ROLL: "tirada",
  DEATH_SAVE: "tirada",
  TABLE_ROLLED: "tirada",
  ATTACK_RESOLVED: "tirada",
  // La iniciativa que reparte el sistema (2026-09-05) también trae un número tirado.
  INITIATIVE_ROLLED_BY_SYSTEM: "tirada",
  // Personaje: lo que le pasa a alguien de la mesa.
  HP_CHANGED: "personaje",
  TEMP_HP_SET: "personaje",
  REST_DECLARED: "personaje",
  RESOURCE_SPENT: "personaje",
  RESOURCE_RESTORED: "personaje",
  RESOURCE_GIVEN: "personaje",
  // M8: le pasa al personaje y cambia sus números, como gastar un recurso.
  TEMP_MODIFIER_GRANTED: "personaje",
  TEMP_MODIFIER_EXPIRED: "personaje",
  LEVEL_CHANGED: "personaje",
  // Puerta de efectos §5 bis (D-CF-68/D-CF-69, 2026-09-13): dar XP le pasa a alguien de la mesa,
  // igual que subir de nivel.
  XP_AWARDED: "personaje",
  CONDITION_APPLIED: "personaje",
  CONDITION_REMOVED: "personaje",
  CONDITION_EXPIRED: "personaje",
  MONEY_CHANGED: "personaje",
  ITEM_ADDED: "personaje",
  ITEM_MOVED: "personaje",
  ITEM_REMOVED: "personaje",
  // D-CF-14, commit 4: ajustar una pila le pasa a alguien de la mesa, igual que moverla.
  ITEM_QUANTITY_CHANGED: "personaje",
  // D-CF-14, commit 5 (J5): morir le pasa a alguien de la mesa, igual que perder puntos de golpe.
  CHARACTER_DIED: "personaje",
  CHARACTER_ARCHIVED: "personaje",
  CHARACTER_RESTORED: "personaje",
  // Paso 2, tarea A2: gastar la economía del turno es algo que le pasa a alguien de la mesa.
  ACTION_SPENT: "personaje",
  // Sistema: andamiaje de la partida, en cursiva y apagado.
  FLAG_SET: "sistema",
  SET_CHANGED: "sistema",
  SIGNAL_RAISED: "sistema",
  MANUAL_OVERRIDE_SET: "sistema",
  CLOCK_ADVANCED: "sistema",
  TURN_ADVANCED: "sistema",
  ROUND_ADVANCED: "sistema",
  // Sentarse a la mesa es de la campana: ni mundo ni personaje.
  MEMBER_JOINED: "sistema",
  COMBATANT_SIDE_CHANGED: "sistema",
  ENCOUNTER_CANCELLED: "sello",
  ACTIVE_TURN_SHIFTED: "sistema",
  // PNJ del mundo y la mesa (E-PM, spec §3.2): revelar es el mundo hablando, ocultar es andamiaje.
  NPC_REVEALED: "narracion",
  NPC_HIDDEN: "sistema",
  // Sacar del combate (E-PM, spec §3.3): el sistema contando un reajuste de la mesa, con
  // COMBATANT_SIDE_CHANGED y ACTIVE_TURN_SHIFTED.
  COMBATANT_LEFT: "sistema",
};

/**
 * `tipoDeMensaje` solo mira `p.type`, así que para clasificar basta el discriminante. Se pasa así
 * a propósito: construir a mano los 36 payloads completos ataría la prueba a la forma de cada
 * esquema, y lo que se comprueba aquí es la **tabla**, no la validación.
 */
function soloElTipo(type: GameEventType): GameEventPayload {
  return { type } as unknown as GameEventPayload;
}

describe("de un suceso del registro a un tipo de mensaje", () => {
  // La red contra el `default` «para que compile»: se recorre la fuente única de tipos, no una
  // lista copiada aquí. Un tipo nuevo en `GAME_EVENT_TYPES` sin decisión pone esto rojo.
  it("clasifica los 49 tipos de suceso, sin dejarse ninguno", () => {
    // 40 desde el 2026-09-06: `ENTITY_RETYPED` (I16), `RESOURCE_GIVEN` (I8), `DM_EXECUTED` (I19) y
    // `MEMBER_ROLE_CHANGED` (D2), 42 con los dos de los modificadores temporales (M8), 43 con
    // `INITIATIVE_ROLLED_BY_SYSTEM` (2026-09-05: la iniciativa y el bando) y **45 con los dos del
    // paso 1, tarea 16** —`COMBATANT_SIDE_CHANGED` y `ACTIVE_TURN_SHIFTED`—, que son los dos
    // reajustes que cambiaban la mesa sin escribir nada, y **46 con `ENCOUNTER_CANCELLED`**
    // (tarea 19, D-A-3): cancelar un combate avisa a quien esperaba.
    // El número está escrito a propósito — si
    // alguien añade un tipo y no lo clasifica, esta cuenta lo dice antes que el `switch`.
    // **47 con `ACTION_SPENT`** (paso 2, tarea A2): gastar la economía del turno, **48 con
    // `ITEM_QUANTITY_CHANGED`** (D-CF-14, commit 4, M2B-8): el `PATCH` de cantidad de una pila
    // ya puesta, **49 con `CHARACTER_DIED`** (D-CF-14, commit 5, J5): la muerte deja de
    // derivarse en silencio, **50 con `XP_AWARDED`** (puerta de efectos §5 bis, D-CF-68/69,
    // 2026-09-13): dar XP es un hecho propio de la crónica, **52 con `NPC_REVEALED` y
    // `NPC_HIDDEN`** (PNJ del mundo y la mesa, 2026-09-14): revelar y ocultar una criatura, y
    // **53 con `COMBATANT_LEFT`** (spec §3.3): sacar del combate.
    expect(GAME_EVENT_TYPES).toHaveLength(53);
    const sinCubo = GAME_EVENT_TYPES.filter((type) => CUBO_ESPERADO[type] === undefined);
    expect(sinCubo).toEqual([]);
  });

  // Y en el cubo que le toca: que estén todos clasificados no vale de nada si el reparto es otro.
  it.each(GAME_EVENT_TYPES)("clasifica %s en su cubo", (type) => {
    expect(tipoDeMensaje(soloElTipo(type))).toBe(CUBO_ESPERADO[type]);
  });

  // Que ninguno caiga fuera de los cinco tipos de la maqueta: cinco formas de mensaje y no seis.
  it("no devuelve nunca un tipo que el hilo no sepa pintar", () => {
    const conocidos: TipoDeMensaje[] = ["sello", "narracion", "personaje", "tirada", "sistema"];
    for (const type of GAME_EVENT_TYPES) {
      expect(conocidos).toContain(tipoDeMensaje(soloElTipo(type)));
    }
  });

  // Los cinco cubos se usan: si alguno se quedara vacío, sobraría una rama del pintado del hilo.
  it("usa los cinco cubos", () => {
    const usados = new Set(GAME_EVENT_TYPES.map((type) => tipoDeMensaje(soloElTipo(type))));
    expect([...usados].sort()).toEqual(["narracion", "personaje", "sello", "sistema", "tirada"]);
  });
});

// **El color de una voz ya no se prueba aquí.** Se fue con `colorDeVoz` al plan 05: lo decide
// `apps/web/src/dominio/voces.ts`, sobre el PERSONAJE y ocho colores, y se prueba en
// `apps/web/src/dominio/__tests__/voces.test.ts` junto con el retrato del elenco —que es la mitad
// que faltaba, y la razón de que la función se moviera fuera del hilo.
