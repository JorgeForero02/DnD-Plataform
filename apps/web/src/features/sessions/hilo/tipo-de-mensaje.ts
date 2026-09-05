import type { GameEventPayload } from "@dnd/shared";

// **De un suceso del registro a uno de los cinco tipos de mensaje de la maqueta**
// (`prototipo/src/features/HiloDeSesion.tsx`): narración, personaje, tirada, sello y sistema.
//
// La maqueta lleva el tipo escrito a mano en sus datos de ejemplo (`MensajeHilo.tipo`). Aquí no
// hay tal campo y **no se inventa**: el tipo se deduce del `type` del suceso, que es el único
// dato real que dice qué pasó. Este fichero es esa tabla, y nada más — la frase la sigue
// escribiendo `linea-de-log.ts`, que es su dueño único.
//
// **El `switch` no tiene `default`, a propósito**, por la misma razón que el de `linea-de-log.ts`
// (ficha L1): sobre una unión discriminada eso lo hace exhaustivo, así que el día que el carril
// del motor añada un tipo de suceso **el build se pone rojo aquí** en vez de caer en silencio en
// un cajón de sastre. Un tipo nuevo sin clasificar es una decisión que alguien tiene que tomar,
// no un valor por defecto.

export type TipoDeMensaje = "sello" | "narracion" | "personaje" | "tirada" | "sistema";

/**
 * Qué forma tiene este suceso en el hilo.
 *
 * **Sello** — lo que parte el hilo en tramos y se lee de un vistazo sin leer la frase: la
 * anotación que alguien selló a mano, y los cuatro hitos que abren y cierran algo (la sesión, el
 * combate). En la maqueta el sello de ejemplo es literalmente la cabecera de una sesión
 * («Sesión 14 · El Puerto Viejo, almacén cuatro»), así que estos cuatro caen ahí por parecido de
 * función, no por analogía.
 *
 * **Narración** — el mundo hablando. Solo los sucesos de entidad: revelar, abrir, comentar y enlazar
 * una ficha son lo único del registro que cuenta algo del mundo y no de una persona.
 *
 * **Tirada** — los cuatro sucesos que traen números tirados. Se pintan incrustados, con «De dónde
 * sale».
 *
 * **Personaje** — lo que le pasa a alguien de la mesa: puntos de golpe, condiciones, recursos,
 * objetos, dinero, nivel. Llevan la voz de quien actuó, con su color.
 *
 * **Sistema** — el resto, y **ahí caen los que no encajan en ninguno de los cuatro**: las marcas,
 * los conjuntos y las señales del motor de reglas, la anulación manual del DM, el reloj y el paso
 * de turno y asalto. Son andamiaje de la partida, no la partida; van en cursiva y apagados.
 */
export function tipoDeMensaje(p: GameEventPayload): TipoDeMensaje {
  switch (p.type) {
    case "SESSION_NOTE":
    case "SESSION_STARTED":
    case "SESSION_CLOSED":
    case "ENCOUNTER_STARTED":
    case "ENCOUNTER_ENDED":
      return "sello";

    // Comentar una ficha (Ola 3) entra aqui y no con los de persona: es el mundo hablando,
    // igual que abrirla, revelarla o enlazarla, aunque lo escriba alguien de la mesa.
    case "ENTITY_OPENED":
    case "ENTITY_REVEALED":
    case "ENTITY_LINKED":
    case "ENTITY_COMMENTED":
    case "ENTITY_RETYPED":
      // Reclasificar (I16) es del MUNDO, no andamiaje: la ficha cambia de naturaleza y eso es un
      // hecho que la mesa puede querer leer y deshacer. Va con abrir, revelar y enlazar.
      return "narracion";

    // Sentarse a la mesa es de la campana, no del mundo ni de un personaje: andamiaje.
    case "MEMBER_JOINED":
      return "sistema";

    case "ABILITY_ROLL":
    case "DEATH_SAVE":
    case "TABLE_ROLLED":
    case "ATTACK_RESOLVED":
      return "tirada";

    case "HP_CHANGED":
    case "TEMP_HP_SET":
    case "REST_DECLARED":
    case "RESOURCE_SPENT":
    case "RESOURCE_RESTORED":
    case "LEVEL_CHANGED":
    case "CONDITION_APPLIED":
    case "CONDITION_REMOVED":
    case "CONDITION_EXPIRED":
    case "MONEY_CHANGED":
    case "ITEM_ADDED":
    case "ITEM_MOVED":
    case "ITEM_REMOVED":
    case "CHARACTER_ARCHIVED":
    case "CHARACTER_RESTORED":
      return "personaje";

    case "FLAG_SET":
    case "SET_CHANGED":
    case "SIGNAL_RAISED":
    case "MANUAL_OVERRIDE_SET":
    case "CLOCK_ADVANCED":
    case "TURN_ADVANCED":
    case "ROUND_ADVANCED":
      return "sistema";
  }
}

/**
 * La paleta de voces. **Cuatro tokens, los mismos cuatro que la maqueta**
 * (`colorVoz` en `prototipo/src/features/HiloDeSesion.tsx`): tinta, cobre, señal y peligro.
 *
 * Nunca hexadecimales: `docs/04-convenciones.md` prohíbe el color literal, y estos cuatro
 * resuelven contra las variables de `ui/tokens.css`, así que siguen al tema y a las tres pieles.
 */
const VOCES = ["text-text", "text-copper-text", "text-accent-text", "text-danger-text"] as const;

/**
 * El color de una voz, **derivado del identificador**.
 *
 * **La decisión, y por qué se toma aquí.** La maqueta le da a cada personaje un color escrito a
 * mano en sus datos. El modelo real no tiene campo de color en ningún esquema, y este carril no
 * puede añadir uno —eso es servidor y datos compartidos—. Así que el color se deriva de forma
 * determinista del identificador de quien habla: el mismo identificador da siempre el mismo
 * color, en cualquier navegador y en cualquier recarga, sin guardar nada.
 *
 * **De quién es el identificador: del actor** (`actorUserId`), no del sujeto. Es lo que hace que
 * el nombre que se pinta y el color que lo pinta sean de la misma persona; el nombre del
 * personaje no viaja en el payload de estos sucesos, solo su identificador, así que colorear por
 * el sujeto pintaría el nombre de una persona con el color de otra. El día que un personaje tenga
 * su propio color declarado, esta función se cambia por ese campo y nada más.
 *
 * **No es una escala de significado.** Cuatro voces se repiten en una mesa de seis, y eso es
 * aceptable porque el color aquí no distingue nada que importe: el nombre está escrito al lado.
 * Es la misma limitación que la maqueta.
 */
export function colorDeVoz(id: string): string {
  let acumulado = 0;
  for (let i = 0; i < id.length; i += 1) {
    acumulado = (acumulado * 31 + id.charCodeAt(i)) >>> 0;
  }
  return VOCES[acumulado % VOCES.length];
}
