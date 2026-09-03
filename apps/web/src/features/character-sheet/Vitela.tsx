import type { CSSProperties, ReactNode } from "react";

// Tarea H4 — **la hoja en vitela**. Cabecera en cromado (se opera), cuerpo en vitela (se lee),
// y la misma línea separa las dos pieles, los dos patrones de guardado y las dos formas de usar
// la hoja: arriba están los cinco números que se consultan en mitad de un turno y no se editan;
// abajo está todo lo que se decide, se teclea y se lee con calma.
//
// ## Qué se miró antes de dibujar
//
// **La hoja de personaje impresa de 5.ª edición.** Tres cosas se copian de ella y una se
// descarta a propósito:
//  · Cada valor vive dentro de un **recuadro con filete**, no sobre un rectángulo relleno de
//    otro color. El papel es continuo por debajo de todos los recuadros; lo que los separa es la
//    línea, no un cambio de fondo. Por eso `CAJA_DE_VITELA` no lleva ninguna clase `bg-`.
//  · El **rótulo del campo va en versalitas pequeñas y en sans**, deliberadamente más callado
//    que la cifra. Eso ya lo hacía esta hoja (`font-chrome text-chrome-xs uppercase
//    tracking-[0.14em]`) y se conserva tal cual: era lo correcto y no había que tocarlo.
//  · Los **números en una voz aparte**, monoespaciada, para que las columnas cuadren.
//  · Lo que NO se copia: la hoja impresa mete el rótulo *debajo* de la casilla. Ahí funciona
//    porque el papel no tiene estados; en pantalla, un rótulo debajo del valor se lee después
//    del dato que nombra y un lector de pantalla lo anuncia al revés.
//
// **La página del manual** (Player's Handbook de 5.ª edición; la referencia legible de sus
// decisiones es la hoja de estilos `5ePHB` de Homebrewery, que las reproduce con valores
// exactos). De ahí salen dos:
//  · **El papel es cálido y liso y el texto es oscuro**: `#EEE5CE` plano, sin textura
//    fotográfica ni sombra interior. Nuestro `--vellum` ya jugaba ese papel.
//  · **Cada encabezado de tercer nivel lleva un filete de metal debajo** (allí oro `#C0AD6A`;
//    aquí `--copper`, que es nuestro único metal cálido). Es exactamente lo que hace
//    `RotuloDeSeccion`: el filete no adorna, separa — y es lo que hace que una sucesión de
//    secciones se lea como un documento y no como un montón de párrafos en negrita.
//
// **El grabado.** Todo lo de aquí podría imprimirse en una tinta: filete, versalita, trama de
// líneas. Nada depende de un degradado de color ni de una sombra fuerte.
//
// ## Contraste
//
// Los dos degradados de abajo (`--vellum-laid`, `--vellum-vignette`) están **capados al 5 %**,
// y el motivo está escrito en `ui/tokens.css`: la prueba de contraste compone colores de
// *fondo*, y un degradado no es uno, así que una trama fuerte aquí degradaría en silencio una
// razón que la prueba seguiría dando por buena. Los peores pares, calculados sobre el peor
// píxel posible (texto sobre una línea de la trama, en la esquina más oscura de la viñeta):
// **4,94:1 en oscuro (`--muted`) y 4,71:1 en claro (`--copper-text`)**.

/**
 * **El borde rasgado.** La hoja está arrancada del cuaderno por arriba —justo por la costura
 * con el cromado— y limpia por los otros tres lados. Eso no es un capricho: una hoja arrancada
 * tiene **un** borde roto, y romper los cuatro convierte el gesto en un marco decorativo.
 *
 * Sustituye al polígono de dieciséis vértices de `ui/Panel.tsx`, que es la versión que el autor
 * describió como «no está mal pero puede ser mejor». Lo que fallaba allí, y lo que se corrige:
 *
 *  1. **Era periódico.** Sus vértices caían cada 6-7 % exactos, así que leía como una sierra.
 *     Aquí los pasos van de 10 a 52 px y no se repiten.
 *  2. **Era recto.** Un polígono solo tiene cuerdas. Un papel roto son **arcos**: la fibra cede
 *     en curva. Esta silueta es una cadena de cúbicas (Catmull-Rom) sobre los mismos puntos.
 *  3. **Tenía una sola amplitud.** Aquí conviven tramos casi lisos, mordiscos cortos y
 *     profundos, y un recorrido entre 2,3 y 14,6 px.
 *
 * **Es determinista.** Los puntos se generaron una vez con un generador con semilla fija y lo
 * que vive en el código es la cadena resultante, no un `Math.random` en tiempo de ejecución:
 * una captura de pantalla y una medición de contraste tienen que dar lo mismo en cada corrida.
 *
 * Se dibuja como una máscara del color de la mesa (`--bg`) **encima** de la vitela, no como un
 * `clip-path` sobre el contenedor. Con `clip-path` en unidades de caja el recorte se deforma
 * con la altura del elemento —y esta hoja mide miles de píxeles—, así que un desgarro de 16 px
 * se volvería invisible o gigante según cuántas secciones tuviera el personaje.
 */
const SILUETA_RASGADA =
  "M0 0 H1200 V13.2 C1194.4 13.1,1173.7 13.1,1166.5 12.4 C1159.2 11.7,1161.6 9.2,1156.5 9.2 C1151.4 9.2,1145.8 11.6,1135.8 12.5 C1125.9 13.4,1105.1 15.5,1096.9 14.6 C1088.7 13.7,1090.9 9.3,1086.8 7.2 C1082.6 5.2,1081.3 2.9,1071.9 2.3 C1062.5 1.7,1042.5 3.3,1030.3 3.3 C1018 3.3,1009.2 2.1,998.5 2.5 C987.9 2.9,979.7 5.1,966.5 5.5 C953.3 5.9,935.9 4.9,919.4 5 C902.9 5.1,883 5.6,867.4 5.9 C851.8 6.3,837.5 7.5,825.7 7.1 C813.9 6.7,808.2 4.2,796.6 3.5 C785 2.8,765.2 2.1,756.1 2.8 C747 3.5,751.6 6.9,742.1 7.5 C732.6 8.1,712.7 6.1,699.2 6.5 C685.8 6.9,673.9 10,661.4 10 C648.9 10,636.4 7.2,624 6.4 C611.6 5.6,599.6 4.7,587 5.1 C574.3 5.5,559.3 7.9,548.1 8.6 C537 9.3,526.8 9.1,519.9 9.5 C513 9.9,512.9 11.6,507 11.2 C501 10.8,492.3 7.4,484.4 6.9 C476.4 6.4,468.2 8.3,459 8.3 C449.8 8.3,438.6 7.1,429.4 7 C420.1 6.9,412.4 7.4,403.5 7.6 C394.5 7.8,385.2 9,375.6 8.4 C366 7.8,355.4 4.3,345.9 4.2 C336.5 4.2,328 6.9,319 8.1 C310 9.3,298 11.4,291.7 11.4 C285.4 11.5,288.1 8.2,281.1 8.4 C274.1 8.7,259.7 12.1,250 12.9 C240.2 13.7,229.2 13.2,222.5 13.2 C215.7 13.2,215.2 12.5,209.6 12.7 C203.9 12.9,198.6 14.9,188.5 14.6 C178.4 14.3,159.6 11.4,148.8 10.7 C138 10,129.9 11.6,123.9 10.4 C117.9 9.2,116.8 4.4,112.7 3.7 C108.7 3,108.7 5.4,99.7 6 C90.6 6.6,69.7 7.1,58.5 7.5 C47.3 7.9,42.2 8.1,32.5 8.2 C22.8 8.3,5.4 8,0 8 Z";

/** El mismo recorrido, sin la tapa: es la fibra que se ve al trasluz en el corte. */
const FIBRA_RASGADA = SILUETA_RASGADA.replace("M0 0 H1200 V13.2 ", "M1200 13.2 ").replace(" Z", "");

function BordeRasgado() {
  return (
    <svg
      aria-hidden="true"
      data-borde="rasgado"
      viewBox="0 0 1200 16"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={SILUETA_RASGADA} fill="var(--bg)" />
      <path
        d={FIBRA_RASGADA}
        fill="none"
        stroke="var(--copper)"
        strokeOpacity="0.55"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * El papel: las líneas de forma que un papel verjurado conserva del molde, y una viñeta que
 * oscurece el borde exterior como cuando una hoja se levanta de la mesa. **Ninguna de las dos
 * llega al 5 %**, y el motivo está en `ui/tokens.css` junto a los valores.
 *
 * No hay grano ni textura fotográfica: un ruido por encima de un texto es exactamente la
 * textura que estorba a la lectura que la regla prohíbe, y además no se imprime.
 */
const PAPEL_DE_VITELA: CSSProperties = {
  backgroundImage: [
    "repeating-linear-gradient(to bottom, var(--vellum-laid) 0 1px, transparent 1px 5px)",
    "radial-gradient(130% 100% at 50% 0%, transparent 52%, var(--vellum-vignette) 100%)",
  ].join(", "),
};

/**
 * La superficie de vitela sobre la que se lee la hoja.
 *
 * El filete de cobre va en **tres** lados, no en cuatro: arriba no hay filete porque arriba está
 * el desgarro, y una hoja arrancada no conserva su borde impreso justo por donde se rompió.
 */
export function HojaDeVitela({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-piel="vitela"
      className={[
        "relative border-x border-b border-copper bg-vellum",
        "shadow-[0_22px_48px_-30px_var(--sheet-shadow)]",
        className,
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={PAPEL_DE_VITELA}
      />
      <BordeRasgado />
      <div className="relative px-s4 pb-s6 pt-s6 sm:px-s5">{children}</div>
    </div>
  );
}

/**
 * El rótulo de una sección de la hoja, con el filete de metal debajo.
 *
 * Es la decisión que la página del manual toma para sus encabezados de tercer nivel, y hace un
 * trabajo concreto: **el filete separa**, así que el rótulo deja de necesitar la negrita para
 * distinguirse de lo que viene detrás. Antes esto era `font-chrome text-chrome-sm font-semibold`
 * —el mismo tamaño que el texto que encabezaba, distinguiéndose solo por el grosor—, que es
 * justo cómo se acaba leyendo un documento como si fuera una lista.
 */
export function RotuloDeSeccion({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      data-rotulo="seccion"
      className={[
        "mb-s3 border-b border-copper pb-1 font-title text-world-lg leading-tight text-text",
        className,
      ].join(" ")}
    >
      {children}
    </p>
  );
}

/**
 * Un recuadro de la hoja: filete y nada más. **Sin fondo propio**, porque en la hoja impresa el
 * papel es continuo por debajo de todas las casillas y lo que las separa es la línea. Rellenar
 * cada casilla de otro color sería devolver el cromado al cuerpo por la puerta de atrás.
 */
export const CAJA_DE_VITELA = "rounded-radius-sm border border-copper px-s3 py-s3";

/**
 * El rótulo de una casilla: versalitas pequeñas, en la voz de instrumento, deliberadamente más
 * callado que la cifra que nombra.
 *
 * **Existía ya, copiado a mano en nueve sitios.** La maqueta de Figma lo usa en cada una de sus
 * casillas —cabecera, características, tarjetas pequeñas, tabla de ataques— y adoptarla
 * multiplicaba las copias; se saca aquí para que el día que cambie, cambie una vez.
 */
export const ROTULO_DE_CASILLA =
  "font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted";

/** La voz del texto corrido de la hoja: la serif del mundo, 15 px, interlineado de lectura. */
export const PROSA_DE_VITELA =
  "font-world text-[length:var(--text-world-sm)] leading-relaxed text-muted";
