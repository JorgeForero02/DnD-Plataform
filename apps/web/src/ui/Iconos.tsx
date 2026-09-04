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

/**
 * Cerrar: el aspa del cajón.
 *
 * La trae la Ola 0 porque `ui/Dialog` la necesita el día que deja de ser un cuadro centrado y
 * pasa a ser cajón lateral — un cajón sin aspa solo se cierra con Escape, y eso no es un objeto
 * en pantalla. **Los 23 iconos de la maqueta entran con el carril de la capa visual**; este va
 * por delante porque una primitiva no puede esperar a su carril.
 */
export function IconoCerrar({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="cerrar">
      <path d="M6 6l12 12M18 6L6 18" />
    </Marco>
  );
}

/**
 * Flecha a la izquierda: volver.
 *
 * Igual que el aspa, la trae la Ola 0 porque la banda de la mesa la necesita para «Tus crónicas»
 * y una banda sin flecha de vuelta es una pantalla sin salida. Los 23 de la maqueta entran con la
 * capa visual.
 */
export function IconoFlechaIzquierda({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="flecha-izquierda">
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </Marco>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * C5 (2026-09-04) — los 23 dibujos de la maqueta.
 *
 * La auditoría del 2026-09-04 lo contó: **23 iconos en `prototipo/src/ui/icons.tsx`, 4 aquí**.
 * Estos son esos 23, copiados trazo a trazo de la maqueta, con dos ajustes que NO son
 * interpretación sino el marco que este fichero ya tenía:
 *
 *  · el `Marco` de arriba (`1em`, `strokeWidth` 2, `focusable="false"`, `data-icono`) en vez
 *    del `Base` de la maqueta (`strokeWidth` 1.6, sin tamaño): el tamaño en `em` es lo que
 *    hace que un icono crezca con el texto que acompaña, y `ui/__tests__/Iconos.test.tsx`
 *    comprueba `width="1em"`. Un segundo marco al lado del primero habría dado dos familias
 *    de iconos en el mismo fichero.
 *  · los nombres van en la forma larga de esta casa (`IconoFlechaDerecha`, no `IconFlechaDcha`),
 *    porque los seis que ya vivían aquí la usan y los otros carriles los importan por nombre.
 *
 * De la lista de la maqueta, «flechas» son dos dibujos —derecha e izquierda—, así que 23
 * conceptos son 24 componentes; `IconoCerrar` e `IconoFlechaIzquierda` ya los trajo la Ola 0 y
 * se quedan donde estaban, arriba, con el nombre con el que ya se importan.
 * ───────────────────────────────────────────────────────────────────────────── */

/** Escudo: defensa, clase de armadura, lo que protege. */
export function IconoEscudo({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="escudo">
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    </Marco>
  );
}

/** Espada: el ataque, el arma, la acción de golpear. */
export function IconoEspada({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="espada">
      <path d="M14.5 4L20 4l0 5.5-9 9-2.5.5.5-2.5 9-9z" />
      <path d="M4 20l4-4M6.5 13.5L3 17l4 4 3.5-3.5" />
    </Marco>
  );
}

/** Conjuro: la estrella de la magia. */
export function IconoConjuro({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="conjuro">
      <path d="M12 3l1.8 4.6L18.5 9l-4 3 1 5-3.5-2.7L8.5 17l1-5-4-3 4.7-1.4L12 3z" />
    </Marco>
  );
}

/** Poción: el consumible, el frasco. */
export function IconoPocion({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="pocion">
      <path d="M10 3h4M11 3v4.5L6.5 15a4 4 0 003.5 6h4a4 4 0 003.5-6L13 7.5V3" />
      <path d="M7.5 13h9" />
    </Marco>
  );
}

/** Corazón: los puntos de golpe. */
export function IconoCorazon({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="corazon">
      <path d="M12 20s-7-4.4-7-9.3A3.7 3.7 0 0112 8a3.7 3.7 0 017 2.7C19 15.6 12 20 12 20z" />
    </Marco>
  );
}

/** D20: la tirada. El dado de veinte caras visto de frente. */
export function IconoD20({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="d20">
      <path d="M12 3l8 5v8l-8 5-8-5V8l8-5z" />
      <path d="M12 3v18M4 8l8 5 8-5M12 3l-8 5m8-5l8 5" />
    </Marco>
  );
}

/** Ojo: visible, revelado, «la mesa lo sabe». */
export function IconoOjo({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="ojo">
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.6" />
    </Marco>
  );
}

/** Ojo tachado: oculto, «sigue oculto». */
export function IconoOjoTachado({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="ojo-tachado">
      <path d="M3 3l18 18" />
      <path d="M10.6 6.1A10.3 10.3 0 0112 6c6.5 0 10 6 10 6a17 17 0 01-3.3 4M6.3 6.4A17 17 0 002 12s3.5 6.5 10 6.5a10 10 0 004-.8" />
      <path d="M9.8 9.9a2.6 2.6 0 003.6 3.6" />
    </Marco>
  );
}

/** Libro: las reglas, el códice, lo que se consulta. */
export function IconoLibro({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="libro">
      <path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 016.5 18H20v3H6.5" />
    </Marco>
  );
}

/** Mochila: el inventario, lo que se lleva encima. */
export function IconoMochila({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="mochila">
      <path d="M6 9a6 6 0 0112 0v9a2 2 0 01-2 2H8a2 2 0 01-2-2z" />
      <path d="M9 9a3 3 0 016 0M9 14h6" />
    </Marco>
  );
}

/** Reloj: el reloj de campaña, la duración, lo que vence. */
export function IconoReloj({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="reloj">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Marco>
  );
}

/** Mundo: el códice del mundo, las fichas y sus hilos. */
export function IconoMundo({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="mundo">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.3 3.7 5.4 3.7 8.5S14.4 18.2 12 20.5C9.6 18.2 8.3 15.1 8.3 12S9.6 5.8 12 3.5z" />
    </Marco>
  );
}

/** Lupa: buscar. */
export function IconoLupa({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="lupa">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </Marco>
  );
}

/** Flecha a la derecha: avanzar, entrar, continuar. La izquierda vive arriba, con la Ola 0. */
export function IconoFlechaDerecha({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="flecha-derecha">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Marco>
  );
}

/** Más: añadir. */
export function IconoMas({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="mas">
      <path d="M12 5v14M5 12h14" />
    </Marco>
  );
}

/** Megáfono: narrar, anunciar a la mesa. */
export function IconoMegafono({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="megafono">
      <path d="M3 10v4a1 1 0 001 1h2l6 4V5L6 9H4a1 1 0 00-1 1z" />
      <path d="M16 8.5a4 4 0 010 7M18.5 6a7 7 0 010 12" />
    </Marco>
  );
}

/** Rayo: el daño, el efecto que salta, lo que se dispara. */
export function IconoRayo({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="rayo">
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </Marco>
  );
}

/** Garra: la criatura, el ataque natural. */
export function IconoGarra({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="garra">
      <path d="M4 4c3 5 4 9 4 16M9 3c2 5 2.5 9 2.5 17M15 3c-1 5-1 9 .5 17M20 5c-2 4-3.5 8-3.5 15" />
    </Marco>
  );
}

/** Calavera: la muerte, el cero puntos de golpe, el peligro. */
export function IconoCalavera({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="calavera">
      <path d="M12 3a8 8 0 00-5 14v3h10v-3a8 8 0 00-5-14z" />
      <circle cx="9" cy="12" r="1.4" />
      <circle cx="15" cy="12" r="1.4" />
      <path d="M12 15v2" />
    </Marco>
  );
}

/** Luna: la noche, el descanso largo, el tema oscuro. */
export function IconoLuna({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="luna">
      <path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" />
    </Marco>
  );
}

/** Sol: el día, el descanso, el tema claro. */
export function IconoSol({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="sol">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4" />
    </Marco>
  );
}

/** Pluma: escribir, la crónica, la ficha del mundo. */
export function IconoPluma({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="pluma">
      <path d="M20 4C10 6 6 12 5 20M20 4c-1 8-6 12-13 13M20 4l-5 1M8 15l-3 5" />
    </Marco>
  );
}
