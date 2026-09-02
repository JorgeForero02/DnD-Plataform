import type { EntityType } from "@dnd/shared";

// **Cada cosa del mundo se crea preguntando lo suyo.**
//
// El formulario de creación era **el mismo para los siete tipos**: nombre, etiquetas,
// visibilidad y un cuadro de texto vacío. Así, un PNJ y un lugar eran indistinguibles salvo por
// la pestaña desde la que se abrieron, y el cuadro vacío no ayudaba a empezar ninguno de los dos.
// Lo señaló el autor: *«que dejen de llamarse fichas y se diferencien por lo que es»*.
//
// **Por qué una plantilla de texto y no campos estructurados.** `Entity.body` es
// `{ format: "markdown", text }` y punto — un solo cuadro. Partirlo en campos por tipo es una
// migración con datos y un cambio del contrato, y sobre todo **encierra al DM**: el día que
// quiera escribir de su PNJ algo que no cabe en las casillas que le dimos, no puede. La
// plantilla propone y no obliga: son encabezados de Markdown que se borran si estorban.
//
// Lo que sí cambia por tipo, además del texto: el rótulo, la frase de ayuda, el ejemplo del
// nombre y las etiquetas que se sugieren. Es la diferencia entre siete formularios y uno con
// siete sombreros.

export interface PlantillaDeTipo {
  /** Cómo se llama esto en singular, para las frases. Nunca «ficha». */
  singular: string;
  /** El artículo, porque el español lo pide y concatenar «un misión» es el fallo de siempre. */
  articulo: "un" | "una";
  /** Qué se pone en el nombre. Un ejemplo real dice más que «Nombre». */
  ejemploDeNombre: string;
  /** Una frase que explica para qué sirve este tipo. Va bajo el título del diálogo. */
  paraQue: string;
  /** El andamiaje que aparece en el cuadro de texto al crear. Se borra si molesta. */
  plantilla: string;
  /** Etiquetas que casi siempre se quieren aquí, ofrecidas de un clic. */
  etiquetasSugeridas: string[];
}

export const PLANTILLA_POR_TIPO: Record<EntityType, PlantillaDeTipo> = {
  NPC: {
    singular: "personaje del mundo",
    articulo: "un",
    ejemploDeNombre: "Maestre Kellan",
    paraQue:
      "Alguien a quien la mesa puede mirar a la cara. Lo que dice, lo que quiere y lo que esconde.",
    plantilla: [
      "## Qué se ve",
      "",
      "## Qué quiere",
      "",
      "## Qué esconde",
      "",
      "## Cómo habla",
      "",
    ].join("\n"),
    etiquetasSugeridas: ["aliado", "enemigo", "neutral", "comerciante", "noble"],
  },
  LOCATION: {
    singular: "lugar",
    articulo: "un",
    ejemploDeNombre: "El puerto de Sarnath",
    paraQue: "Un sitio al que se llega. Qué se ve, qué se oye y qué puede salir mal.",
    plantilla: [
      "## Al llegar",
      "",
      "## Qué hay dentro",
      "",
      "## Quién anda por aquí",
      "",
      "## Lo que no se ve a simple vista",
      "",
    ].join("\n"),
    etiquetasSugeridas: ["ciudad", "mazmorra", "taberna", "ruinas", "camino"],
  },
  QUEST: {
    singular: "misión",
    articulo: "una",
    ejemploDeNombre: "El cargamento que no llegó",
    paraQue: "Algo que hay que hacer. Quién lo pide, qué se gana y qué pasa si nadie lo hace.",
    plantilla: [
      "## Quién la encarga",
      "",
      "## Qué hay que hacer",
      "",
      "## Qué se gana",
      "",
      "## Qué pasa si nadie la hace",
      "",
    ].join("\n"),
    etiquetasSugeridas: ["principal", "secundaria", "urgente", "recompensa", "abierta"],
  },
  FACTION: {
    singular: "facción",
    articulo: "una",
    ejemploDeNombre: "La Hermandad Gris",
    paraQue:
      "Un grupo con intereses propios. Qué persigue, con quién se lleva mal y qué puede hacer por ti.",
    plantilla: [
      "## Qué persigue",
      "",
      "## Quién manda",
      "",
      "## Con quién se lleva mal",
      "",
      "## Qué puede hacer por la mesa (y qué les pedirá)",
      "",
    ].join("\n"),
    etiquetasSugeridas: ["gremio", "culto", "nobleza", "criminal", "militar"],
  },
  OBJECT: {
    singular: "objeto",
    articulo: "un",
    ejemploDeNombre: "El sello de cera de la Casa Vhael",
    paraQue: "Una cosa que se puede tener en la mano. Qué es, qué hace y de dónde salió.",
    plantilla: [
      "## Qué parece",
      "",
      "## Qué hace",
      "",
      "## De dónde salió",
      "",
      "## Quién lo quiere",
      "",
    ].join("\n"),
    etiquetasSugeridas: ["mágico", "mundano", "prueba", "tesoro", "llave"],
  },
  EVENT: {
    singular: "suceso",
    articulo: "un",
    ejemploDeNombre: "El incendio del puerto",
    paraQue: "Algo que pasó o va a pasar. Cuándo, a quién le afecta y qué deja detrás.",
    plantilla: [
      "## Qué pasa",
      "",
      "## Cuándo",
      "",
      "## A quién le afecta",
      "",
      "## Qué deja detrás",
      "",
    ].join("\n"),
    etiquetasSugeridas: ["pasado", "en curso", "por venir", "catástrofe", "festividad"],
  },
  DOCUMENT: {
    singular: "documento",
    articulo: "un",
    ejemploDeNombre: "La carta sin firmar",
    paraQue: "Un texto que la mesa puede leer: una carta, un contrato, una página arrancada.",
    plantilla: [
      "> Escribe aquí el texto tal y como los jugadores lo leerían.",
      "",
      "",
      "---",
      "",
      "## Notas del DM sobre este documento",
      "",
    ].join("\n"),
    etiquetasSugeridas: ["carta", "mapa", "contrato", "diario", "pista"],
  },
};

/** «un lugar», «una misión». Escrito una vez, porque concatenar en la pantalla ya falló antes. */
export function conArticulo(type: EntityType): string {
  const p = PLANTILLA_POR_TIPO[type];
  return `${p.articulo} ${p.singular}`;
}
