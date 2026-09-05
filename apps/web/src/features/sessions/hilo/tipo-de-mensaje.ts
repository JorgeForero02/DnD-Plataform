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

    // Sentarse a la mesa es de la campana, no del mundo ni de un personaje: andamiaje. Y la
    // batuta (I19) es **direccion del DM**, no algo que la mesa vea pasar: su suceso va `DM_ONLY`,
    // asi que solo lo lee el, y lo que la mesa ve son los EFECTOS con su propia visibilidad.
    //
    // (El comentario va aqui arriba y no entre los dos `case`: entre etiquetas rompe
    // `no-fallthrough`, y ya nos mordio una vez el 2026-09-06.)
    case "MEMBER_JOINED":
    case "MEMBER_ROLE_CHANGED":
    case "DM_EXECUTED":
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
    case "RESOURCE_GIVEN":
    case "TEMP_MODIFIER_GRANTED":
    case "TEMP_MODIFIER_EXPIRED":
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

// **`colorDeVoz` se fue, y esto explica adónde** (plan 05, decisión D3, 2026-09-06).
//
// Vivía aquí una huella del `actorUserId` sobre CUATRO clases de Tailwind. Tenía dos defectos que
// no se arreglaban desde este fichero:
//
//   · **Cuatro tonos.** Con cinco personas en la mesa, dos compartían color y nadie podía
//     arreglarlo, porque no había nada que elegir.
//   · **La huella era del USUARIO.** Los dos personajes de un mismo jugador salían idénticos, que
//     es justamente lo que un color por personaje viene a distinguir.
//
// Y el elenco pintaba **cobre para todos** por su cuenta: dos cálculos para «¿de qué color es
// esta persona?». Ahora hay uno solo, en `apps/web/src/dominio/voces.ts` (`vozDePersonaje`), sobre
// ocho colores y con `Character.color` mandando cuando su jugador ha elegido.
//
// **No dejes aquí un envoltorio de compatibilidad.** Una función que reciba un `id` suelto vuelve
// a permitir colorear por el usuario sin que nadie lo note, que es el fallo que se acaba de quitar.
