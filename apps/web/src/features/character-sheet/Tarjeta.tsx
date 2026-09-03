import type { ReactNode } from "react";

// **La hoja de personaje, en tarjetas con cabecera** — la forma de la maqueta, adoptada entera
// y no a trozos (2026-09-03).
//
// Sustituye a `Vitela.tsx`, que vestía el cuerpo de la hoja de papel: superficie `--vellum`,
// serif del mundo, filetes de cobre y un desgarro dibujado arriba. La vitela no se ha tirado del
// producto —la sigue llevando lo que se lee de corrido, que es para lo que sirve: la historia del
// personaje (`Panel tone="vellum"`) y las fichas del mundo—. Lo que se retira es su uso **en una
// hoja de consulta llena de cifras**, que es el sitio donde no funcionaba: cien números, dieciocho
// filas de habilidades y una tabla no son un texto que se lea de corrido, y el papel les ponía
// encima una voz de lectura, una viñeta y un interlineado que solo los separaba más.
//
// La decisión la pidió el autor dos veces —«en el prototipo está mejor», «plasma todo el diseño
// del prototipo»— y es reversible: la vitela sigue viva en `ui/Panel.tsx` y en el tema Lectura.
//
// ## Qué es una tarjeta aquí
//
// Filete, cabecera con su nombre, y el cuerpo debajo. Tres cosas que la banda a todo lo ancho con
// un filete —lo que había— no hacía:
//
//  1. **Delimita.** Una banda separada solo por una línea horizontal no dice dónde acaba: lo que
//     viene detrás parece seguir dentro. Un recuadro sí.
//  2. **Cabe en dos columnas.** Doce bandas a todo lo ancho son doce pantallas; doce tarjetas de
//     media anchura son media hoja.
//  3. **Nombra sin gritar.** El nombre vive en su propia banda, más callada que el contenido, en
//     vez de competir con él en negrita a la misma altura.
//
// El `data-rotulo="seccion"` de la cabecera es el mismo gancho que ya medía `e2e/hoja.spec.ts`
// para el rótulo de sección: cambia la piel, no lo que se mide.

/**
 * Una tarjeta de la hoja: cabecera con su nombre y el cuerpo debajo.
 *
 * `etiqueta` es el nombre accesible de la región, y por defecto es el título en minúsculas —los
 * recorridos y las unitarias buscan la región por ese nombre («salvaciones», «habilidades»), así
 * que se pasa explícito cuando el título visible y el nombre de la región no coinciden.
 */
export function TarjetaDeHoja({
  titulo,
  etiqueta,
  accion,
  children,
  className = "",
  cuerpo = "p-s3",
}: {
  titulo: string;
  etiqueta?: string;
  /** Lo que va a la derecha de la cabecera: un botón, una cifra. Nunca el contenido. */
  accion?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Las clases del cuerpo, para la tarjeta que quiere pegar su contenido al filete (una tabla). */
  cuerpo?: string;
}) {
  return (
    <section
      aria-label={etiqueta ?? titulo.toLowerCase()}
      className={`rounded-radius-md border border-muted bg-surface ${className}`}
    >
      <header className="flex items-center justify-between gap-s2 border-b border-muted px-s3 py-s2">
        <h3 data-rotulo="seccion" className="font-chrome text-chrome-sm font-semibold text-muted">
          {titulo}
        </h3>
        {accion}
      </header>
      <div className={cuerpo}>{children}</div>
    </section>
  );
}

/**
 * Un recuadro dentro de una tarjeta: la casilla de una característica, una tarjeta pequeña de la
 * fila de abajo. Lleva su propio relleno **igual** que el de la tarjeta que lo contiene, y lo que
 * lo separa es el filete: es lo que hace la maqueta, y es lo que hacía la hoja impresa con la
 * diferencia de que allí el papel era continuo y aquí la superficie también.
 */
export const CAJA_DE_HOJA = "rounded-radius-sm border border-muted bg-surface px-s3 py-s2";

/**
 * El rótulo de una casilla: versalitas pequeñas, deliberadamente más calladas que la cifra.
 * Venía de `Vitela.tsx` sin un solo cambio — era lo correcto y la maqueta lo hace igual.
 */
export const ROTULO_DE_CASILLA =
  "font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted";

/**
 * La voz del texto explicativo de la hoja.
 *
 * **Era la serif del mundo a 15 px con interlineado de lectura; ahora es la sans de interfaz.**
 * No es una tipografía nueva —las cuatro voces del producto siguen siendo las mismas—: es que
 * esta pantalla es instrumento y no lectura, y la serif la usa el mundo. La maqueta lo hace así
 * en cada línea de su hoja.
 */
export const PROSA_DE_HOJA = "font-chrome text-chrome-xs leading-relaxed text-muted";
