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
  /** El mismo nombre normalizado para comparar: sin espacios de sobra y en minúsculas. */
  clave: string;
}

function normalizar(nombre: string): string {
  return nombre.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
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
 * Casa las citas con las fichas de la campaña **por nombre**, ignorando mayúsculas y espacios de
 * sobra. Si dos fichas se llaman igual gana la primera de la lista, y esa ambigüedad se resuelve
 * a mano en el panel de enlaces: inventar un desempate sería adivinar.
 */
export function resolverCitas(
  citas: CitaDeFicha[],
  fichas: Entity[],
  excluirId?: string,
): CitasResueltas {
  const porNombre = new Map<string, Entity>();
  for (const ficha of fichas) {
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
