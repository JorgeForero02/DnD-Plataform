import type { DamageType } from "@dnd/shared";
import type { SheetResponse } from "./api";
import { fieldControlClass } from "../../ui/Field";
import { ListaDeTraza } from "./Traza";
import { nombreTipoDano, TIPOS_DE_DANO } from "./vocabulario";
import { PROSA_DE_HOJA } from "./Tarjeta";

// Tarea 2.5.1 + 2.5.4 — **el tipo de daño y la tirada de la que sale**, que el servidor pedía
// desde el 2026-09-04 y ninguna pantalla mandaba.
//
// La auditoría de la mesa (§8.2) lo resumió así: *«un dragón resistente al fuego nunca reduce
// nada»*. `changeHp` acepta `damageType`, `rollEventId`, `critical` y `reason`, y las dos
// pantallas que cambiaban puntos de golpe enviaban `{ delta }` a secas. Toda la pieza C de
// 2.5.1 —resistencias, vulnerabilidades e inmunidades, probada y desplegada— **no se ejecutaba
// jamás en una partida**, porque el único camino que la enciende es un `damageType` en el
// cuerpo de la petición.
//
// Estas piezas viven en su propio fichero, y no dentro de `PuntosDeGolpe.tsx`, porque **el otro
// sitio que cambia PG es la ficha del elenco** (`features/sessions/elenco/FichaDeElenco.tsx`),
// que es de otro carril: se exportan para que las monte sin volver a escribir el selector ni la
// traza. Dos copias del vocabulario de daño ya existen en esta aplicación y no dicen lo mismo;
// una tercera del selector sería el mismo error otra vez.

/**
 * El tipo de daño de un golpe. **`""` es «sin especificar»**, no un tipo: una curación, o el
 * ajuste a ojo del DM, no tienen tipo, y el esquema compartido lo declara opcional a propósito.
 *
 * **Es un desplegable y no radios con explicación**, que es lo que `docs/04-convenciones.md`
 * pide para las opciones con significado. La excepción está razonada: son **catorce** opciones
 * de una lista cerrada y sin matiz que explicar —«fuego» es fuego—, y catorce radios con su
 * frase ocupan la pantalla entera del panel que tiene que caber al lado de la cifra de PG. La
 * regla existe para que nadie esconda decisiones con consecuencias detrás de un `select`; aquí
 * la consecuencia se enseña **después**, en la traza que devuelve el servidor.
 */
export function SelectorDeTipoDeDano({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: DamageType | "";
  onChange: (v: DamageType | "") => void;
  disabled?: boolean;
}) {
  return (
    <select
      id={id}
      className={fieldControlClass + " w-40"}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as DamageType | "")}
    >
      <option value="">Sin especificar</option>
      {TIPOS_DE_DANO.map((t) => (
        <option key={t} value={t}>
          {/* El diccionario largo de esta feature: «relámpago», no «rayo». Ver la nota de
              `TIPOS_DE_DANO` en `vocabulario.ts` sobre por qué no se unifican hoy. */}
          {nombreTipoDano(t)}
        </option>
      ))}
    </select>
  );
}

/**
 * **Por qué el daño no fue el que se tecleó.**
 *
 * Solo se pinta cuando el servidor manda `damageTrace`, que es solo cuando de verdad redujo o
 * agravó algo. Los pasos se pintan con `ListaDeTraza`, la misma que explica la CA y los PG
 * máximos: la traza es la funcionalidad del producto, y tener dos formas de dibujarla sería
 * tener dos que acaban divergiendo.
 *
 * `notes` es prosa del statblock que **limita** la regla («de ataques no mágicos con armas que
 * no sean de plata»). El servidor no la interpreta y esta pantalla tampoco: la enseña para que
 * el DM decida.
 */
export function TrazaDeDano({ respuesta }: { respuesta: SheetResponse | undefined }) {
  const traza = respuesta?.damageTrace;
  if (!traza) return null;
  return (
    <div
      data-testid="traza-de-dano"
      className="mt-s2 rounded-radius-sm border border-copper bg-surface px-s3 py-s2"
    >
      <p className="font-chrome text-chrome-xs uppercase tracking-wide text-muted">
        De dónde sale el daño
      </p>
      <p className="font-data text-chrome-md text-text">{traza.total} de daño aplicado</p>
      <ListaDeTraza id="traza-de-dano" steps={traza.steps} />
      {traza.notes.length > 0 && (
        <ul className="mt-s2 space-y-0.5">
          {traza.notes.map((n, i) => (
            <li key={i} className={PROSA_DE_HOJA}>
              {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Cómo se lee una tirada citable en el desplegable: `1d20+5 = 18`, y si hubo natural, se dice. */
export function etiquetaDeTirada(t: {
  expression: string;
  total: number;
  natural?: "TWENTY" | "ONE";
}): string {
  const natural =
    t.natural === "TWENTY" ? " · 20 natural" : t.natural === "ONE" ? " · 1 natural" : "";
  return `${t.expression} = ${t.total}${natural}`;
}
