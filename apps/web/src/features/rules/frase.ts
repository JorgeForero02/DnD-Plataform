import type { RuleCondition, RuleEffect, RuleTrigger } from "@dnd/shared";
import {
  ARTICULO_PARTE,
  CARRIL_DE_PARTE,
  describirCondicion,
  describirDisparador,
  describirEfecto,
  type NombreDeFicha,
  type ParteDeRegla,
} from "./vocabulario";

// Tarea F1 — la regla, leída como una frase.
//
// **Por qué existe.** El DM del autor probó el editor por carriles y escribió «no entendí
// nada». Los carriles enseñan la *estructura* de la regla; no la enseñan *dicha*. Esto la dice:
// «Cuando empieza una sesión, si esta regla no se ha disparado nunca, entonces revelar «X».»
// Si la regla no se puede leer en voz alta y entenderse, el editor ha fallado.
//
// **De dónde sale cada palabra.** De `vocabulario.ts` y de ninguna otra parte: los conectores
// de `CARRIL_DE_PARTE` —los mismos rótulos que llevan los carriles—, el hueco que falta de
// `ARTICULO_PARTE`, y el cuerpo de cada pieza de `describirDisparador` / `describirCondicion` /
// `describirEfecto`, que son las mismas funciones que ya usaban la traza y el ensayo en seco.
// Si la frase y las cajas pudieran discrepar, esto estaría mal hecho: no hay un segundo
// diccionario que se pueda desincronizar del primero.
//
// **Esto describe lo que hace `rules-engine.service.ts`; no lo define** (docs/04-convenciones.md).
// Dos afirmaciones de la frase son afirmaciones sobre el servidor y están comprobadas contra él:
//   - **Las condiciones se encadenan con «y»** porque el motor las evalúa con `every`
//     (`engine.ts`): se cumplen todas o la regla no se dispara. Un «o» sería mentira.
//   - **La frase nombra el objetivo, nunca «lo del suceso»** —«revelar «La puerta de sal»», no
//     «revelar la entrada que se abrió»—, porque una regla **fija su objetivo al armarse y no
//     al dispararse**. Insinuar lo contrario sería mentir sobre una decisión de dominio cerrada.
//
// El módulo es puro y no sabe pintar: devuelve segmentos. Pintarlos es de `FraseDeRegla.tsx`.

/** Lo que hace falta para leer una regla: las tres partes, tal como están en el borrador. */
export interface ReglaEnFrase {
  trigger: RuleTrigger | null;
  conditions: RuleCondition[];
  effects: RuleEffect[];
}

export type SegmentoDeFrase =
  /** «Cuando», «si», «entonces». Va coloreado **y** en negrita: el color nunca decide solo. */
  | { tipo: "conector"; parte: ParteDeRegla; texto: string }
  /** Una caja del carril, dicha. `clave` es la misma que lleva la caja: por ahí se comparan. */
  | { tipo: "pieza"; parte: ParteDeRegla; clave: string; texto: string; efecto?: RuleEffect }
  /** La caja que falta, **dicha en palabras** en vez de callada. */
  | { tipo: "hueco"; parte: ParteDeRegla; texto: string }
  /** La puntuación que cose la frase. No dice nada por sí sola. */
  | { tipo: "nexo"; texto: string };

/** El conector, en minúscula cuando no abre la frase. Sale del rótulo del carril, no de un enum. */
function conector(parte: ParteDeRegla, inicial: boolean): SegmentoDeFrase {
  const rotulo = CARRIL_DE_PARTE[parte];
  return {
    tipo: "conector",
    parte,
    texto: inicial ? rotulo : rotulo.toLocaleLowerCase("es"),
  };
}

/** El espacio que separa el conector de lo que dice. Va como nexo para que **toda** la
 * separación de la frase viva en un solo sitio: así el texto que se lee es exactamente la
 * concatenación de los segmentos, sin espacios que ponga el pintor por su cuenta. */
function espacio(): SegmentoDeFrase {
  return { tipo: "nexo", texto: " " };
}

/** «— falta un suceso», «— falta una acción». El artículo lo pone `ARTICULO_PARTE`. */
function hueco(parte: ParteDeRegla): SegmentoDeFrase {
  return { tipo: "hueco", parte, texto: `— falta ${ARTICULO_PARTE[parte]}` };
}

/** Intercala «, » entre las piezas de un carril y « y » antes de la última. */
function enumerar(piezas: SegmentoDeFrase[]): SegmentoDeFrase[] {
  return piezas.flatMap((pieza, i) => {
    if (i === 0) return [pieza];
    const nexo: SegmentoDeFrase = { tipo: "nexo", texto: i === piezas.length - 1 ? " y " : ", " };
    return [nexo, pieza];
  });
}

/**
 * La regla entera, en segmentos, lista para leerse de izquierda a derecha.
 *
 * **El carril «Si» vacío no se dice**, y eso no es un olvido: una regla sin condiciones es una
 * regla completa —se dispara siempre que llegue su suceso—, así que anunciar ahí un hueco sería
 * pedir algo que el servidor no pide. Los otros dos huecos sí se dicen, porque sin suceso la
 * regla no despierta y sin acción no hace nada.
 */
export function segmentosDeFrase(
  regla: ReglaEnFrase,
  nombreFicha?: NombreDeFicha,
): SegmentoDeFrase[] {
  const segmentos: SegmentoDeFrase[] = [conector("SUCESO", true), espacio()];

  segmentos.push(
    regla.trigger
      ? {
          tipo: "pieza",
          parte: "SUCESO",
          clave: regla.trigger.kind,
          texto: describirDisparador(regla.trigger, nombreFicha),
        }
      : hueco("SUCESO"),
  );

  if (regla.conditions.length > 0) {
    segmentos.push({ tipo: "nexo", texto: ", " }, conector("ESTADO", false), espacio());
    segmentos.push(
      ...enumerar(
        regla.conditions.map((condicion) => ({
          tipo: "pieza" as const,
          parte: "ESTADO" as const,
          clave: condicion.kind,
          texto: describirCondicion(condicion),
        })),
      ),
    );
  }

  segmentos.push({ tipo: "nexo", texto: ", " }, conector("ACCION", false), espacio());
  segmentos.push(
    ...(regla.effects.length > 0
      ? enumerar(
          regla.effects.map((efecto) => ({
            tipo: "pieza" as const,
            parte: "ACCION" as const,
            clave: efecto.kind,
            texto: describirEfecto(efecto, nombreFicha),
            efecto,
          })),
        )
      : [hueco("ACCION")]),
  );

  segmentos.push({ tipo: "nexo", texto: "." });
  return segmentos;
}
