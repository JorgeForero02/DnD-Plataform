import type { EntityType } from "@dnd/shared";

/**
 * Las relaciones que se sugieren al enlazar dos fichas.
 *
 * **Lo que se guarda es la frase en español, no una clave.** `EntityLink.label` es texto libre
 * de hasta 80 caracteres (`createEntityLinkSchema`) y ya hay campañas con etiquetas escritas a
 * mano; inventar aquí un enumerado `LIVES_IN` obligaría a migrar esos datos y a traducirlo en
 * pantalla, que es justo el fallo que la regla «ningún valor de enumeración llega a la
 * pantalla» prohíbe. Así que el catálogo sugiere frases, y quien quiera otra la escribe.
 *
 * `hacia` es la misma relación **leída desde el otro extremo**, que es lo que hace legible un
 * retroenlace: «vive en» leído al revés no es «vive en», es «vive aquí». Sin esta columna, la
 * Torre Gris diría que ella vive en Corvin.
 */
export interface Relacion {
  /** Lo que se guarda en `label`, leído desde la ficha de origen. */
  desde: string;
  /** La misma relación leída desde la ficha de destino. */
  hacia: string;
  /** Tipos de ficha para los que tiene sentido como origen. */
  origen: EntityType[];
  /** Tipos de ficha para los que tiene sentido como destino. */
  destino: EntityType[];
}

const PERSONAS: EntityType[] = ["NPC", "FACTION"];
const COSAS: EntityType[] = ["OBJECT", "DOCUMENT"];
const TODOS: EntityType[] = ["NPC", "LOCATION", "QUEST", "FACTION", "OBJECT", "EVENT", "DOCUMENT"];

export const RELACIONES: Relacion[] = [
  { desde: "vive en", hacia: "vive aquí", origen: ["NPC"], destino: ["LOCATION"] },
  {
    desde: "se encuentra en",
    hacia: "se encuentra aquí",
    origen: ["OBJECT", "DOCUMENT", "FACTION"],
    destino: ["LOCATION"],
  },
  { desde: "forma parte de", hacia: "contiene", origen: ["LOCATION"], destino: ["LOCATION"] },
  { desde: "conduce a", hacia: "se llega desde", origen: ["LOCATION"], destino: ["LOCATION"] },
  {
    desde: "pertenece a",
    hacia: "cuenta entre los suyos a",
    origen: ["NPC"],
    destino: ["FACTION"],
  },
  { desde: "lidera", hacia: "está liderada por", origen: ["NPC"], destino: ["FACTION"] },
  { desde: "sirve a", hacia: "es servido por", origen: ["NPC"], destino: PERSONAS },
  { desde: "protege a", hacia: "está protegido por", origen: PERSONAS, destino: ["NPC"] },
  { desde: "es aliado de", hacia: "es aliado de", origen: PERSONAS, destino: PERSONAS },
  { desde: "es enemigo de", hacia: "es enemigo de", origen: PERSONAS, destino: PERSONAS },
  {
    desde: "custodia",
    hacia: "está custodiado por",
    origen: PERSONAS,
    destino: ["OBJECT", "DOCUMENT", "LOCATION"],
  },
  { desde: "posee", hacia: "está en poder de", origen: PERSONAS, destino: COSAS },
  { desde: "creó", hacia: "fue creado por", origen: ["NPC"], destino: COSAS },
  { desde: "encarga", hacia: "la encarga", origen: PERSONAS, destino: ["QUEST"] },
  {
    desde: "participa en",
    hacia: "cuenta con la participación de",
    origen: PERSONAS,
    destino: ["QUEST", "EVENT"],
  },
  {
    desde: "ocurrió en",
    hacia: "fue escenario de",
    origen: ["EVENT", "QUEST"],
    destino: ["LOCATION"],
  },
  { desde: "recompensa de", hacia: "recompensa con", origen: COSAS, destino: ["QUEST"] },
  { desde: "menciona", hacia: "está mencionado en", origen: ["DOCUMENT"], destino: TODOS },
];

/** Las relaciones con sentido para un par de tipos concreto. */
export function relacionesSugeridas(origen: EntityType, destino: EntityType): Relacion[] {
  return RELACIONES.filter((r) => r.origen.includes(origen) && r.destino.includes(destino));
}

/**
 * Cómo se lee una etiqueta **desde el otro extremo**. Una etiqueta que no está en el catálogo
 * —texto libre de antes o de ahora— no se invierte a la fuerza: se enseña tal cual y se dice de
 * dónde viene, porque adivinar la inversa de una frase que nadie declaró sería mentir.
 */
export function etiquetaEntrante(label: string | null | undefined): string | null {
  const texto = label?.trim();
  if (!texto) return null;
  const conocida = RELACIONES.find((r) => r.desde.toLowerCase() === texto.toLowerCase());
  return conocida ? conocida.hacia : `enlazado como «${texto}»`;
}
