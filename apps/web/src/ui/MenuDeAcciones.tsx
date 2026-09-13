import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { IconoMenu } from "./Iconos";

/**
 * **El menú «…» de una fila** (pulido 2026-09-12, C2: anexo #1). La regla de
 * `docs/04-convenciones.md` es «hasta `ACCIONES_VISIBLES` = 2 visibles, el resto en un menú
 * dibujado»: la fila de mandos del elenco (`MandosDeCombatiente.tsx`) tenía hasta siete botones
 * y se salía de la tarjeta. Este componente es genérico —no sabe qué acciones lista— para que el
 * menú «Acciones» del paso 3 (D-CF-50) lo reutilice sin escribir un segundo.
 *
 * **Teclado**: flechas arriba/abajo mueven el foco entre ítems (con vuelta al principio/final),
 * Home/End van al primero/último, Enter y Espacio seleccionan, Escape cierra y devuelve el foco
 * al botón que abrió el menú, y Tab lo cierra sin devolver el foco (el navegador ya lo está
 * moviendo a otro sitio). Un clic fuera del menú también lo cierra, sin devolver el foco —quien
 * hizo clic en otra parte ya decidió dónde quiere estar.
 *
 * **Se abre hacia donde hay sitio**: por defecto mide el hueco real entre el botón y los bordes
 * de la ventana; `medirSitio` es una costura de prueba (no una prop de producto) para que
 * `MenuDeAcciones.test.tsx` pueda forzar la rama «hacia arriba» sin un navegador real —`jsdom`
 * no maqueta, así que `getBoundingClientRect` siempre da ceros—. La medida real se comprueba en
 * un navegador de verdad, no aquí (ver `e2e/teclado.spec.ts`).
 */
export interface AccionDeMenu {
  id: string;
  rotulo: string;
  icono?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  /** Por qué está apagada, para quien no ve el estado visual: se lee con `aria-describedby`. */
  motivo?: string;
  /**
   * Qué significa de verdad la acción, cuando el rótulo solo no lo dice (p. ej. «Neutral» del
   * bando: el servidor lo trata como «no se ha dicho», no como «indiferente»). Se lee con
   * `aria-describedby`, esté o no apagado el ítem; si además hay `motivo`, se leen los dos.
   */
  descripcion?: string;
  tono?: "normal" | "peligro";
}

const ALTO_ESTIMADO_POR_ITEM = 36;

export function MenuDeAcciones({
  etiqueta,
  acciones,
  medirSitio,
}: {
  /** Rótulo accesible del botón que abre el menú, p. ej. «Más acciones sobre Klarg». */
  etiqueta: string;
  acciones: AccionDeMenu[];
  /** Costura de prueba: sustituye la medida real del hueco disponible. No se usa en producto. */
  medirSitio?: () => { abajo: number; arriba: number };
}) {
  const [abierto, setAbierto] = useState(false);
  const [direccion, setDireccion] = useState<"abajo" | "arriba">("abajo");
  const [activoPedido, setActivo] = useState(0);
  // Si la lista encoge con el menú abierto (p. ej. el bando desaparece al acabar el combate),
  // el índice activo no puede señalar a un ítem que ya no existe: se acota al pintar, sin efecto
  // ni segundo render.
  const activo = Math.min(activoPedido, Math.max(acciones.length - 1, 0));
  const botonRef = useRef<HTMLButtonElement>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();

  const medir =
    medirSitio ??
    (() => {
      const r = botonRef.current?.getBoundingClientRect();
      return r
        ? { abajo: window.innerHeight - r.bottom, arriba: r.top }
        : { abajo: Infinity, arriba: 0 };
    });

  const abrir = () => {
    const sitio = medir();
    setDireccion(
      sitio.abajo < acciones.length * ALTO_ESTIMADO_POR_ITEM && sitio.arriba > sitio.abajo
        ? "arriba"
        : "abajo",
    );
    setActivo(0);
    setAbierto(true);
  };

  const cerrar = (devolverFoco = true) => {
    setAbierto(false);
    if (devolverFoco) botonRef.current?.focus();
  };

  useEffect(() => {
    if (abierto) itemsRef.current[activo]?.focus();
  }, [abierto, activo]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!(e.target instanceof Node) || !contenedorRef.current?.contains(e.target)) {
        cerrar(false);
      }
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  const alTeclear = (e: React.KeyboardEvent) => {
    const n = acciones.length;
    if (e.key === "Escape") {
      e.preventDefault();
      // Que no suba: dentro de un `Dialog` (el menú «Acciones» del paso 3, D-CF-50) Escape
      // cierra el menú, no el cajón que lo contiene.
      e.stopPropagation();
      cerrar();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActivo((activo + 1) % n);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((activo - 1 + n) % n);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActivo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActivo(n - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      // El propio `<button>` de cada ítem ya responde a Enter/Espacio de forma nativa cuando
      // TIENE el foco del navegador — pero el que se mueve con las flechas es `activo`, no
      // necesariamente el foco real del DOM en todos los entornos de prueba, así que se dispara
      // el clic a mano sobre el ítem activo en vez de confiar en el comportamiento nativo.
      e.preventDefault();
      itemsRef.current[activo]?.click();
    } else if (e.key === "Tab") {
      cerrar(false);
    }
  };

  return (
    <div ref={contenedorRef} className="relative inline-block">
      <button
        ref={botonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? `${id}-menu` : undefined}
        aria-label={etiqueta}
        onClick={() => (abierto ? cerrar() : abrir())}
        className="rounded-radius-sm border border-muted p-1 text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <IconoMenu className="h-4 w-4" />
      </button>
      {abierto && (
        <ul
          id={`${id}-menu`}
          role="menu"
          aria-label={etiqueta}
          data-direccion={direccion}
          onKeyDown={alTeclear}
          className={[
            "absolute right-0 z-30 min-w-[11rem] rounded-radius-sm border border-muted bg-surface py-1 shadow-lg",
            direccion === "arriba" ? "bottom-full mb-1" : "top-full mt-1",
          ].join(" ")}
        >
          {acciones.map((a, i) => {
            // Descripción y motivo son independientes: la primera explica la acción siempre,
            // el segundo solo mientras está apagada. Si hay los dos, se leen los dos.
            const idDescripcion = a.descripcion ? `${id}-${a.id}-descripcion` : null;
            const idMotivo = a.disabled && a.motivo ? `${id}-${a.id}-motivo` : null;
            const describedBy = [idDescripcion, idMotivo].filter((x) => x !== null).join(" ");
            return (
              <li key={a.id} role="none">
                <button
                  ref={(el) => {
                    itemsRef.current[i] = el;
                  }}
                  type="button"
                  role="menuitem"
                  tabIndex={i === activo ? 0 : -1}
                  aria-disabled={a.disabled || undefined}
                  aria-describedby={describedBy || undefined}
                  onClick={() => {
                    if (a.disabled) return;
                    cerrar();
                    a.onSelect();
                  }}
                  className={[
                    "flex w-full items-center gap-s2 px-s3 py-1.5 text-left font-chrome text-chrome-sm",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                    a.disabled
                      ? "cursor-not-allowed text-muted"
                      : a.tono === "peligro"
                        ? "text-danger-text hover:bg-[color:var(--danger-tint)]"
                        : "text-text hover:bg-bg",
                  ].join(" ")}
                >
                  {a.icono && <span className="[&>svg]:size-4">{a.icono}</span>}
                  {a.rotulo}
                </button>
                {/* Fuera del botón a propósito: dentro entrarían en su nombre accesible, y el
                  nombre tiene que ser solo el rótulo («Marcar como Neutral»), no la frase. */}
                {idDescripcion && (
                  <span id={idDescripcion} className="sr-only">
                    {a.descripcion}
                  </span>
                )}
                {idMotivo && (
                  <span id={idMotivo} className="sr-only">
                    {a.motivo}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
