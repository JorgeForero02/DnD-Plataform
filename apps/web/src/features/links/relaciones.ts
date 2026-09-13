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
 * retroenlace: «vive en» leído al revés no es «vive en». Sin esta columna, la Torre Gris diría
 * que ella vive en Corvin.
 *
 * **El sujeto de `hacia` es siempre la ficha que se está leyendo**, igual que el sujeto de
 * `desde`. Esa regla no estaba escrita y por eso la tabla la incumplía en tres filas: «vive
 * aquí», «se encuentra aquí» y «la encarga» tenían por sujeto la ficha *de enfrente*, así que
 * la frase salía al revés en cuanto el panel la leía como leía a las demás —«la Torre Gris
 * está liderada por Corvin» y «la Torre Gris vive aquí Corvin» no pueden componerse igual—.
 * Corregidas a «es el hogar de», «alberga» y «está encargada por». Lo prueba
 * `relaciones.test.ts`, que ahora compone las 18 frases con las dos fichas y las compara.
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
  { desde: "vive en", hacia: "es el hogar de", origen: ["NPC"], destino: ["LOCATION"] },
  {
    desde: "se encuentra en",
    hacia: "alberga",
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
  { desde: "encarga", hacia: "está encargada por", origen: PERSONAS, destino: ["QUEST"] },
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

/**
 * **Los rótulos que cuelgan una ficha de su padre en el desglose del mundo** (Task 14 bis,
 * D-CF-64). Es la lista ÚNICA: `taller/mundo/arbolDelMundo.ts` la cruza con cada hilo y cuelga la
 * ficha de ORIGEN bajo la de DESTINO cuando el rótulo está aquí; todo lo demás es lateral y no
 * mueve nada (regla de `docs/04-convenciones.md`: «un árbol enseña un padre; los demás hilos van
 * en la ficha»).
 *
 * Los cinco son `desde` de `RELACIONES` —lo comprueba `relaciones.test.ts`— y no se inventa
 * ninguno: un rótulo que cuelga y que nadie puede escribir desde el selector sería un padre
 * secreto. **El árbol enseña CONTENCIÓN** —vivir en, estar en, formar parte de, pertenecer a,
 * ocurrir en—; «custodia» estuvo en la lista hasta la ronda 1 de la Task 14 bis y se quitó por
 * decisión del orquestador: custodiar es una relación lateral (quien custodia no está DENTRO de
 * lo custodiado), y colgaba al guardián bajo el cofre, al revés de los otros cinco.
 *
 * **El orden importa:** cuando un mismo par de fichas tiene dos hilos de jerarquía, el árbol
 * cuelga la hija UNA vez, por el primero de esta lista (`arbolDelMundo.ts`).
 */
export const ROTULOS_DE_JERARQUIA: readonly string[] = [
  "vive en",
  "se encuentra en",
  "forma parte de",
  "ocurrió en",
  "pertenece a",
] as const;

/** Si un rótulo, tal y como lo escribió el DM, cuelga la ficha de su padre. */
export function esRotuloDeJerarquia(label: string | null | undefined): boolean {
  const texto = label?.trim().toLowerCase();
  return Boolean(texto) && ROTULOS_DE_JERARQUIA.includes(texto as string);
}

/** Las relaciones con sentido para un par de tipos concreto. */
export function relacionesSugeridas(origen: EntityType, destino: EntityType): Relacion[] {
  return RELACIONES.filter((r) => r.origen.includes(origen) && r.destino.includes(destino));
}

/**
 * **Una frase, no una etiqueta.** Un enlace se lee ahora como una oración con sujeto, verbo y
 * complemento —«Maestre Kellan vive en la Torre Gris»— porque una lista de sustantivos sueltos
 * con un guion delante no dice qué es vecino de qué. Estas dos funciones devuelven el
 * **predicado**, cuyo sujeto es siempre la ficha abierta; el complemento es la ficha del otro
 * extremo, que es además el enlace que se pulsa.
 */
export interface LecturaDeEnlace {
  /** El predicado, con la ficha abierta como sujeto. */
  relacion: string;
  /**
   * La etiqueta tal y como la escribió el DM, **solo** cuando no se ha podido invertir. Se cita
   * en vez de adivinarse: inventar la inversa de una frase que nadie declaró sería mentir sobre
   * el mundo del DM.
   */
  literal?: string;
}

/** Sin etiqueta no hay relación que contar, pero el enlace existe y hay que poder leerlo. */
const SIN_ETIQUETA_SALIENTE = "enlaza con";
const SIN_ETIQUETA_ENTRANTE = "recibe un enlace de";

/** El enlace que esta ficha escribió: su etiqueta ya está en la voz correcta. */
export function lecturaSaliente(label: string | null | undefined): LecturaDeEnlace {
  const texto = label?.trim();
  return texto ? { relacion: texto } : { relacion: SIN_ETIQUETA_SALIENTE };
}

/**
 * El retroenlace: lo escribió la otra ficha, así que hay que darle la vuelta para que el sujeto
 * siga siendo la ficha abierta. Una etiqueta libre que no está en el catálogo no se invierte —
 * se dice que el enlace llega y se cita la frase original.
 */
export function lecturaEntrante(label: string | null | undefined): LecturaDeEnlace {
  const texto = label?.trim();
  if (!texto) return { relacion: SIN_ETIQUETA_ENTRANTE };
  const conocida = RELACIONES.find((r) => r.desde.toLowerCase() === texto.toLowerCase());
  return conocida
    ? { relacion: conocida.hacia }
    : { relacion: SIN_ETIQUETA_ENTRANTE, literal: texto };
}
