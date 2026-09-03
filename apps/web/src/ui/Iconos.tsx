// Tarea Q1 — los iconos compartidos del chrome, dibujados.
//
// **Los iconos se dibujan** (regla vinculante de `docs/04-convenciones.md`): un glifo de fuente
// se pinta a todo color en unos sistemas y como un cuadrado vacío en otros, y nunca se parece al
// resto de la interfaz. La excepción declarada son los cinco glifos de `ui/Badge.tsx` y ninguno
// más — aquí vivían la marca de visto (el ejemplo que la propia regla prohíbe), el triángulo
// de aviso y el rombo del filete, los tres como carácter de fuente.
//
// Viven en un solo fichero porque la misma marca de visto estaba copiada en tres pantallas:
// tres dibujos a mano habrían divergido al primer retoque.
//
// Sobre el tamaño: `1em` en vez de una altura fija en píxeles. Estos tres van *dentro* de una
// línea de texto —no en un botón—, así que tienen que crecer y menguar con ella; una `h-4` se
// descuadra en cuanto el texto cambia de escala. `align` con un descenso pequeño los sienta
// sobre la línea base, que es donde el glifo que sustituyen estaba.

interface IconoProps {
  className?: string;
}

/**
 * Marco común: trazo, `currentColor`, `viewBox` de 24 y `aria-hidden`. El significado siempre lo
 * lleva el texto de al lado, así que un lector de pantalla no tiene nada que anunciar aquí — y
 * `focusable="false"` porque IE/Edge antiguos metían los SVG en el orden de tabulación.
 */
function Marco({
  children,
  className = "",
  ...resto
}: React.SVGProps<SVGSVGElement> & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={["inline-block shrink-0 align-[-0.125em]", className].join(" ")}
      // Después de los valores por defecto, para que un icono concreto pueda pisarlos —el rombo
      // relleno es el único que lo hace— y para que el `data-icono` que las pruebas buscan llegue.
      {...resto}
    >
      {children}
    </svg>
  );
}

/**
 * Confirmación: la marca de visto.
 *
 * No es adorno. «Copiado.», «Nombre actualizado.» y el aviso de la pantalla de entrada se pintan
 * en `--accent-text`, y **el color no puede ser la única señal** de que algo salió bien: la forma
 * del dibujo es la mitad del mensaje que no depende de ver el matiz.
 */
export function IconoConfirmacion({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="confirmacion">
      <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
    </Marco>
  );
}

/**
 * Quitar: el aspa, dibujada.
 *
 * Existía como el glifo de fuente **por** (U+00D7) dentro de un botón en la lista de condiciones,
 * y eso incumplía la regla de iconos dibujados delante de sus narices: la excepción declarada son
 * los cinco de `ui/Badge.tsx` y ninguno más. Lo encontró una auditoría el 2026-09-02, no una
 * prueba — la prueba de glifos ni siquiera llevaba ese carácter en su lista, así que **la regla
 * existía y nada la hacía cumplir**. Ahora sí: el carácter entró en `GLIFOS_PROHIBIDOS`.
 *
 * Se dimensiona en `1em` allá donde vive dentro de una línea de texto, como el resto de los que
 * acompañan a una palabra.
 */
export function IconoQuitar({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="quitar">
      <path d="M6 6 18 18M18 6 6 18" />
    </Marco>
  );
}

/**
 * Aviso: el triángulo con su admiración.
 *
 * Mismo trato que la confirmación, y por el mismo motivo: el mensaje de error de `ui/Field.tsx`
 * va en `--danger-text` y la forma es lo que lo distingue de una pista sin depender del color.
 * El punto va separado del trazo vertical, como en cualquier señal de tráfico: pegados se leen
 * como una sola barra a tamaño de texto.
 */
export function IconoAviso({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="aviso">
      <path d="M12 3.5 22 20.5H2Z" />
      <path d="M12 10v4.5" />
      <path d="M12 17.6h.01" />
    </Marco>
  );
}

/**
 * Rombo: el remate del filete de `ui/Ornament.tsx`.
 *
 * Este sí es puro adorno —no dice nada, solo cierra la línea—, y por eso es el único de los tres
 * que se dibuja relleno: a la altura de una línea de texto un rombo en trazo se convierte en una
 * mancha, y la versión maciza conserva la silueta que tenía el carácter al que sustituye.
 */
export function IconoRombo({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="rombo" fill="currentColor" strokeWidth={0}>
      <path d="M12 4 20 12 12 20 4 12Z" />
    </Marco>
  );
}
