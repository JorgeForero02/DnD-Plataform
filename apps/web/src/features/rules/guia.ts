import { CARRIL_DE_PARTE, NOMBRE_PARTE, type ParteDeRegla } from "./vocabulario";
import type { BorradorDeRegla } from "./formularios";

// Tarea F6 — el tutorial, y por qué no es un tour.
//
// **Nada de tour de bienvenida.** Los cinco globos numerados que se ven una vez al entrar no se
// recuerdan y se saltan: quien los ve todavía no tiene delante el problema que resuelven, y
// cuando lo tiene, el tour ya pasó y no vuelve. Aquí no hay ninguno.
//
// **Burbujas contextuales que no se pueden cerrar y se cierran solas al hacer la acción.** Es el
// único patrón que sobrevivió en las herramientas que lo intentaron tres veces. No se pueden
// cerrar porque una ayuda con aspa se cierra por reflejo antes de leerla; se cierran solas
// porque el único final honesto de una instrucción es que la acción esté hecha. Aquí eso es
// literal: **este módulo no guarda nada**. No hay estado de «ya lo vi», no hay `localStorage`, no
// hay paso actual. El paso se **deriva** del borrador cada vez que se pinta, así que hacer la
// acción lo cambia por definición y deshacerla lo trae de vuelta — que es lo que hace falta
// cuando alguien quita una caja y se queda otra vez sin saber qué toca.
//
// **Y va como línea de pie, no como globo que tapa.** Un globo anclado a un control ocupa
// justo el sitio donde hay que trabajar. La pinta la pinta `PieDeGuia.tsx`.
//
// El vocabulario sale de `vocabulario.ts` y de ninguna otra parte: el carril se nombra con
// `CARRIL_DE_PARTE` y el grupo de la paleta con `NOMBRE_PARTE`, que son exactamente las palabras
// que llevan escritas en pantalla. Escribir aquí «Efectos» en vez de «Acciones» sería inventar
// un segundo nombre para lo mismo — el fallo que `docs/04-convenciones.md` prohíbe por haber
// aparecido tres veces en una mañana.

export interface PasoDeGuia {
  /** Estable: identifica el paso para una prueba, y no llega nunca a la pantalla. */
  id: string;
  /** La instrucción, en imperativo y con una sola acción dentro. */
  texto: string;
  /** El carril al que apunta, si apunta a alguno — lo usa el pie para colorearse. */
  parte?: ParteDeRegla;
  /** Cierto solo en el último paso: ya no queda nada que hacer. */
  completo?: boolean;
}

/**
 * Qué toca ahora. Uno solo: una lista de cinco cosas por hacer es otra vez la pantalla que el DM
 * del autor no entendió.
 *
 * El orden es el de la frase — primero el suceso, después la acción, después los huecos de las
 * cajas, y el nombre al final —, y no es arbitrario: hasta que no hay suceso y acción no hay
 * regla de la que hablar, y los huecos que faltan solo se pueden nombrar cuando ya existe la
 * caja que los tiene.
 */
export function pasoDeGuia(borrador: BorradorDeRegla, problemas: string[]): PasoDeGuia {
  if (borrador.trigger === null) {
    return {
      id: "SUCESO",
      parte: "SUCESO",
      texto: `Arrastra una pieza de ${NOMBRE_PARTE.SUCESO} al carril «${CARRIL_DE_PARTE.SUCESO}» para empezar la regla. Si prefieres no arrastrar, púlsala y cae sola.`,
    };
  }

  if (borrador.effects.length === 0) {
    return {
      id: "ACCION",
      parte: "ACCION",
      texto: `Arrastra una pieza de ${NOMBRE_PARTE.ACCION} al carril «${CARRIL_DE_PARTE.ACCION}» para terminar la regla.`,
    };
  }

  // Los huecos que quedan dentro de las cajas ya colocadas. `revisarBorrador` los cuenta en
  // español y por carriles; aquí se toma el primero y punto: uno cada vez.
  const huecos = problemas.filter((problema) => problema.startsWith("Carril"));
  if (huecos.length > 0) {
    return { id: "HUECO", texto: `Falta un dato dentro de una caja. ${huecos[0]}` };
  }

  if (borrador.name.trim() === "") {
    return {
      id: "NOMBRE",
      texto: "Ponle un nombre a la regla: es como la vas a reconocer en la lista.",
    };
  }

  return {
    id: "COMPLETA",
    completo: true,
    texto: "La regla ya está completa. Pulsa «Guardar regla» cuando quieras.",
  };
}
