import { describe, expect, it } from "vitest";
import { GAME_EVENT_TYPES, type GameEventPayload, type GameEventType } from "@dnd/shared";
import { colorDeVoz, tipoDeMensaje, type TipoDeMensaje } from "../tipo-de-mensaje";

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
  ENTITY_LINKED: "narracion",
  ENTITY_RETYPED: "narracion",
  // Ola 3: comentar una ficha es el mundo hablando, con los otros sucesos de entidad.
  ENTITY_COMMENTED: "narracion",
  // Tirada: los cuatro sucesos que traen números tirados.
  ABILITY_ROLL: "tirada",
  DEATH_SAVE: "tirada",
  TABLE_ROLLED: "tirada",
  ATTACK_RESOLVED: "tirada",
  // Personaje: lo que le pasa a alguien de la mesa.
  HP_CHANGED: "personaje",
  TEMP_HP_SET: "personaje",
  REST_DECLARED: "personaje",
  RESOURCE_SPENT: "personaje",
  RESOURCE_RESTORED: "personaje",
  LEVEL_CHANGED: "personaje",
  CONDITION_APPLIED: "personaje",
  CONDITION_REMOVED: "personaje",
  CONDITION_EXPIRED: "personaje",
  MONEY_CHANGED: "personaje",
  ITEM_ADDED: "personaje",
  ITEM_MOVED: "personaje",
  ITEM_REMOVED: "personaje",
  CHARACTER_ARCHIVED: "personaje",
  CHARACTER_RESTORED: "personaje",
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
  it("clasifica los 37 tipos de suceso, sin dejarse ninguno", () => {
    // 37 desde el 2026-09-06: `ENTITY_RETYPED` (I16). El número está escrito a propósito — si
    // alguien añade un tipo y no lo clasifica, esta cuenta lo dice antes que el `switch`.
    expect(GAME_EVENT_TYPES).toHaveLength(37);
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

describe("el color de una voz", () => {
  // Los cuatro tokens declarados, tal y como `ui/tokens.css` los resuelve. **Ningún color
  // literal**: si alguien mete un hexadecimal o una clase de fuera de esta lista, esto se rompe.
  const VOCES_DECLARADAS = [
    "text-text",
    "text-copper-text",
    "text-accent-text",
    "text-danger-text",
  ];

  // La promesa que sustituye al campo de color que el modelo no tiene: el mismo identificador da
  // siempre el mismo color, en cualquier recarga y en cualquier navegador.
  it("es determinista: el mismo identificador da el mismo token dos veces", () => {
    for (const id of ["u-elara", "u-dm", "", "ç", "usuario con espacios", "cmXyZ0123456789"]) {
      expect(colorDeVoz(id)).toBe(colorDeVoz(id));
    }
  });

  // La regla de «ningún color literal» de `docs/04-convenciones.md`, blindada: nunca sale nada
  // que no esté en la paleta.
  it("siempre devuelve uno de los cuatro tokens declarados", () => {
    for (let i = 0; i < 500; i += 1) {
      expect(VOCES_DECLARADAS).toContain(colorDeVoz(`u-${i}`));
    }
    expect(VOCES_DECLARADAS).toContain(colorDeVoz(""));
  });

  // Comportamiento actual y declarado: cuatro voces se reparten la mesa. No se comprueba que no
  // colisionen —colisionan, y está escrito en el fichero—; se comprueba que la paleta se usa
  // entera, porque un hash que devolviera siempre el mismo token pasaría la prueba de arriba.
  it("reparte sobre los cuatro tokens y no se queda en uno solo", () => {
    const vistos = new Set<string>();
    for (let i = 0; i < 200; i += 1) vistos.add(colorDeVoz(`u-${i}`));
    expect(vistos.size).toBe(VOCES_DECLARADAS.length);
  });
});
