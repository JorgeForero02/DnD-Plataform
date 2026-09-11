import type { Entity } from "../../entities/api";

// **`[[nombre]]`: enlazar mientras se escribe, no en otra pantalla.**
//
// La auditoría del 2026-09-04 lo marcó ALTA: «Sin enlaces `[[nombre]]` al escribir: Markdown puro
// sin wikilinks; los enlaces se crean aparte, a mano». La maqueta lo promete en el marcador de
// posición de su cuadro de texto: *«Puedes usar Markdown y enlazar otras fichas con
// `[[nombre]]`»*.
//
// Aquí vive solo la parte pura: sacar los nombres del texto y casarlos con las fichas de la
// campaña. Crear los enlaces es cosa de `EscribirFicha`, y los crea con la puerta de API que ya
// existe (`features/links/api.ts`) — no hay una segunda.
//
// **Dos cosas que este mecanismo NO hace, dichas aquí para que nadie las suponga:**
//
//  1. **No borra enlaces.** Quitar un `[[nombre]]` del texto no deshace el enlace: quitarlo es un
//     gesto explícito, y vive en el panel de enlaces con su propio permiso —`canRemove` lo decide
//     el servidor por fila, y en un retroenlace depende de la ficha de enfrente, no de esta—.
//     Un borrado automático al editar prosa sería exactamente la clase de efecto invisible que
//     este proyecto no admite.
//  2. **No deja rastro en el registro.** `links.service.ts` crea el enlace y **nunca escribe
//     `ENTITY_LINKED`**, aunque el motor de reglas ofrezca ese suceso en su vocabulario. Eso es
//     del servidor y no se arregla desde aquí: está en el informe de este carril.

/** Nombre citado entre dobles corchetes, con el texto tal cual lo escribió el DM. */
export interface CitaDeFicha {
  /** El nombre tal y como aparece en la prosa. */
  texto: string;
  /**
   * El mismo nombre pasado por `normalizar`: sin espacios de sobra, en minúsculas y **sin
   * diacríticos**, así que «Bahía» y «bahia» comparten clave. Sirve para comparar y para nada
   * más — lo que se enseña es `texto`.
   */
  clave: string;
}

/**
 * La clave con la que se compara un nombre: sin espacios de sobra, en minúsculas y **sin
 * diacríticos**.
 *
 * Plegar los acentos es deliberado y se decidió el 2026-09-07 (ficha P4): en un mundo escrito en
 * español, el DM teclea `[[bahia]]` y la ficha «Bahía» se anunciaba como inexistente. Casar de
 * más aquí tiende el enlace que pidió; casar de menos lo pierde en silencio.
 *
 * Se pliega el **rango de marcas combinantes**, no `\p{Diacritic}`: esa clase incluye también
 * `^` y `` ` `` como caracteres sueltos, y borrarlos de un nombre de ficha sería un efecto que
 * nadie pidió. Es la misma forma que ya usa `claveDeConcentracion` en
 * `apps/web/src/features/character-sheet/vocabulario.ts`.
 *
 * **Se normaliza para comparar, nunca para mostrar**: `CitaDeFicha.texto` conserva lo que el DM
 * tecleó, porque el aviso de pantalla señala su prosa y no una versión aplanada de ella.
 */
function normalizar(nombre: string): string {
  return nombre
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

/**
 * Los `[[nombre]]` de un texto, sin repetidos y en el orden en que aparecen.
 *
 * Deliberadamente tolerante y corto de miras: no acepta saltos de línea dentro de los corchetes
 * —un `[[` suelto en un párrafo no debe tragarse media ficha— ni `|` con alias, que es una
 * convención de otras wikis que aquí no se ha decidido.
 */
export function citasDelTexto(texto: string): CitaDeFicha[] {
  const encontradas = new Map<string, CitaDeFicha>();
  for (const coincidencia of texto.matchAll(/\[\[([^[\]\n]+)\]\]/g)) {
    const bruto = coincidencia[1].trim();
    if (!bruto) continue;
    const clave = normalizar(bruto);
    if (!encontradas.has(clave)) encontradas.set(clave, { texto: bruto, clave });
  }
  return [...encontradas.values()];
}

export interface CitasResueltas {
  /** Las citas que sí son una ficha de esta campaña. */
  encontradas: { cita: CitaDeFicha; fichaDestino: Entity }[];
  /** Las que no lo son: se nombran en pantalla en vez de desaparecer en silencio. */
  sinFicha: CitaDeFicha[];
  /**
   * Las que resuelven a la **propia ficha**. Tienen lista propia porque antes se caían por el
   * hueco entre las otras dos —ni enlazadas ni «sin ficha»— y el aviso de pantalla no decía
   * nada de ellas. Está bien no enlazar una ficha consigo misma; está mal callarlo.
   */
  aSiMisma: CitaDeFicha[];
}

/**
 * Casa las citas con las fichas de la campaña **por nombre**, ignorando mayúsculas, espacios de
 * sobra y **acentos** — `normalizar` decide qué cuenta como el mismo nombre.
 *
 * Cuando dos fichas caen en la misma clave **gana la más reciente por `createdAt`; a igual
 * `createdAt`, por `id`** (orden lexicográfico, solo para que el resultado no dependa de en qué
 * orden llegó la lista) — y la otra queda inalcanzable desde cualquier `[[…]]`. Eso ya pasaba con
 * dos nombres idénticos; desde que se pliegan los acentos (D-P4-1) pasa también con «Bahía» y
 * «Bahia», que es el precio declarado de esa decisión y no un caso raro. La ambigüedad se
 * resuelve a mano en el panel de enlaces: inventar un desempate mejor sería adivinar.
 */
export function resolverCitas(
  citas: CitaDeFicha[],
  fichas: Entity[],
  excluirId?: string,
): CitasResueltas {
  // Gana la ficha más reciente cuando dos comparten nombre normalizado, y eso lo decide esta
  // función, no quien la llama: se ordena aquí por `createdAt` desc antes de quedarse con la
  // primera. El servidor ya manda las fichas en ese orden (`entities.service.ts`,
  // `orderBy: { createdAt: "desc" }`), pero apoyarse en eso sin más acopla el desempate a un
  // detalle de otro módulo que podría cambiar sin avisar aquí.
  //
  // Fix round 1 (9b, Important): a igual `createdAt` (dos fichas creadas en el mismo instante,
  // o dos fixtures de prueba que no se molestan en variarlo) un `sort` estable deja el segundo
  // desempate en manos de en qué orden llegó `fichas` — que es justo lo que este cambio existe
  // para no depender. `id` como segunda clave (orden lexicográfico; no tiene significado, solo
  // hace falta que sea el mismo siempre) hace que el resultado ya no dependa del orden de
  // llegada en ningún caso.
  const porCreacionDesc = [...fichas].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  const porNombre = new Map<string, Entity>();
  for (const ficha of porCreacionDesc) {
    const clave = normalizar(ficha.name);
    if (!porNombre.has(clave)) porNombre.set(clave, ficha);
  }
  const encontradas: { cita: CitaDeFicha; fichaDestino: Entity }[] = [];
  const sinFicha: CitaDeFicha[] = [];
  const aSiMisma: CitaDeFicha[] = [];
  for (const cita of citas) {
    const ficha = porNombre.get(cita.clave);
    if (!ficha) sinFicha.push(cita);
    // Una ficha que se cita a sí misma no se enlaza consigo misma — y se dice.
    else if (ficha.id === excluirId) aSiMisma.push(cita);
    else encontradas.push({ cita, fichaDestino: ficha });
  }
  return { encontradas, sinFicha, aSiMisma };
}
