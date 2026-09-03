import type { BorradorDeRegla } from "./formularios";

// Tarea F6 — plantillas clonables en el estado vacío.
//
// **Por qué existen.** El análisis de 224 590 recetas de IFTTT dice lo mismo que se ve en
// cualquier mesa: la gente **duplica la de otro** antes que escribir la suya. Una pantalla vacía
// con un botón «Nueva regla» pide un acto de creación desde cero; una pantalla vacía con cuatro
// reglas ya escritas pide un acto de edición, que es mucho más barato.
//
// **Son borradores, no reglas guardadas.** Al elegir una se abre el editor con las cajas ya
// puestas en sus carriles y **nada mandado al servidor todavía**: el DM ve la frase, cambia lo
// que quiera y guarda él. Clonar no es aceptar.
//
// **Y dejan huecos a propósito.** Una plantilla que apunta a una ficha no puede inventarse cuál
// —una regla fija su objetivo al armarse, y ese objetivo es de esta campaña y de ninguna otra—,
// así que el `entityId` queda vacío y la guía de F6 pide rellenarlo antes de guardar. Rellenarlo
// con la primera ficha que hubiera a mano sería elegir por el DM sin decírselo.

export interface PlantillaDeRegla {
  id: string;
  /** Cómo se llama la plantilla en la lista. No es el nombre de la regla que sale. */
  titulo: string;
  /** Para qué sirve, en una línea: es lo que decide si se clona ésta o la de al lado. */
  paraQue: string;
  borrador: BorradorDeRegla;
}

export const PLANTILLAS: PlantillaDeRegla[] = [
  {
    id: "revelar-al-empezar",
    titulo: "Al empezar la sesión, revelar algo — una sola vez",
    paraQue:
      "Lo que tenías preparado para el principio de la próxima sesión y no quieres acordarte de enseñar. La condición de «nunca se ha disparado» hace que pase una vez y no cada sesión.",
    borrador: {
      name: "Al empezar la sesión, revelar la pista",
      trigger: { kind: "SESSION_STARTED" },
      conditions: [{ kind: "NEVER_FIRED" }],
      effects: [{ kind: "REVEAL_ENTITY", entityId: "", visibility: "PLAYERS" }],
      mode: "AUTOMATIC",
      maxFires: null,
    },
  },
  {
    id: "marca-y-aviso",
    titulo: "Cuando se ponga una marca, avisar a los jugadores",
    paraQue:
      "Para que un cambio del mundo que ocurre entre bastidores llegue a la mesa. Cambia el nombre de la marca por el tuyo.",
    borrador: {
      name: "Avisar cuando caiga la marca",
      trigger: { kind: "FLAG_SET", key: "" },
      conditions: [],
      effects: [{ kind: "NOTIFY", audience: "PLAYERS", message: "" }],
      mode: "AUTOMATIC",
      maxFires: null,
    },
  },
  {
    id: "limpiar-al-cerrar",
    titulo: "Al cerrar la sesión, quitar una marca",
    paraQue:
      "La otra mitad de cualquier marca que se pone: si nadie la quita, se queda puesta para siempre. Ésta es la reversión que el editor te va a echar de menos.",
    borrador: {
      name: "Quitar la marca al cerrarse la sesión",
      trigger: { kind: "SESSION_CLOSED" },
      conditions: [],
      effects: [{ kind: "SET_FLAG", key: "", value: false }],
      mode: "AUTOMATIC",
      maxFires: null,
    },
  },
  {
    id: "veinte-natural",
    titulo: "Un 20 natural lanza una señal",
    paraQue:
      "Para colgar cosas de una tirada redonda sin tener que acordarte en la mesa. Va en modo propuesta: te llega a «Propuestas» y decides tú.",
    borrador: {
      name: "El 20 natural que se nota",
      trigger: { kind: "ABILITY_ROLL", outcome: "NATURAL_TWENTY" },
      conditions: [],
      effects: [{ kind: "RAISE_SIGNAL", key: "" }],
      mode: "PROPOSAL",
      maxFires: null,
    },
  },
];
