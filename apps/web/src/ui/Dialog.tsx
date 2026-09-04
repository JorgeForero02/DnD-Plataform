import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { IconoCerrar } from "./Iconos";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /**
   * Las tres anchuras de la maqueta, con sus nombres de siempre para no tocar 24 llamadas:
   * `sm` = estrecha (26rem) · `lg` = media (40rem) · `xl` = ancha (58rem).
   */
  size?: "sm" | "lg" | "xl";
  /** Debajo del título, en la voz de la interfaz. La maqueta lo trae como ranura propia. */
  subtitulo?: ReactNode;
  /** Pie fijo del cajón: los botones que confirman. No scrollea con el contenido. */
  acciones?: ReactNode;
  /** Vitela: para leer prosa del mundo, no para operar formularios. */
  pergamino?: boolean;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// **El cajón lateral, y por qué esto cambió de forma entera (Ola 0, 2026-09-04).**
//
// Hasta hoy esta primitiva era un CUADRO CENTRADO —`items-center justify-center`, `max-h-[85vh]`,
// un panel flotando en mitad de la pantalla— y la maqueta nunca lo fue: es un **cajón que entra
// por la derecha**, a altura completa, con `border-l` de cobre. La auditoría del 2026-09-04 lo
// puso en números: **24 pantallas heredaban el patrón equivocado**, y el efecto en la mesa es el
// que el autor describió — todo «interrumpe», porque un cuadro centrado tapa el sitio donde
// estabas en vez de ponerse a su lado.
//
// La diferencia no es estética. El reseño de la mesa (§4) define el estrato superpuesto como
// *«se abre encima, Escape cierra, y vuelves exactamente donde estabas»*: con un cajón, «donde
// estabas» **sigue visible** mientras el panel está abierto. Con un cuadro centrado, no.
//
// **Lo que NO cambia**, y es lo que estas líneas defienden desde 1.19: `role="dialog"`,
// `aria-modal`, el foco atrapado dentro, Escape que cierra, y el foco devuelto al control que lo
// abrió. Dialog.test.tsx ejercita las cuatro; quitar cualquiera de ellas rompe una aserción
// mientras el marcado sigue pintándose igual.
export function Dialog({
  open,
  onClose,
  title,
  children,
  size = "sm",
  subtitulo,
  acciones,
  pergamino = false,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const titleId = useId();

  // Fix round 1, Important 3: every consumer passes an inline arrow for onClose, so the
  // original `useEffect(..., [open, onClose])` tore the effect down and rebuilt it on every
  // parent re-render while the dialog was open — the cleanup yanked focus back to the trigger,
  // then the effect immediately refocused the dialog's first control. A user typing in the
  // second field of a dialog form lost focus to the first control on every keystroke that
  // re-rendered the parent. onClose now lives in a ref that's kept current on every render;
  // the effect itself depends on [open] only, so it mounts once per open/close cycle no matter
  // how many times the parent re-renders in between. Dialog.test.tsx — "keeps focus in place
  // across a parent re-render while open" — fails on the old deps array.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;

    const dialogEl = dialogRef.current;
    // **El foco entra en el CONTENIDO, no en la aspa.** El cajón añade un botón de cerrar en su
    // cabecera, que en orden del DOM va antes que todo lo demás; si el foco cayera ahí, abrir un
    // formulario dejaría el cursor sobre «Cerrar» y la primera pulsación de Enter cerraría el
    // panel que acabas de abrir. Se busca el primer foco del cuerpo y solo si no hay ninguno se
    // usa el aspa, y si tampoco, el propio cajón.
    const cuerpo = dialogEl?.querySelector<HTMLElement>("[data-dialog-cuerpo]");
    const first =
      cuerpo?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
      dialogEl?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
      dialogEl;
    first?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialogEl) return;

      const nodes = Array.from(dialogEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (nodes.length === 0) return;
      const firstEl = nodes[0];
      const lastEl = nodes[nodes.length - 1];

      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Focus returns to the trigger even if the dialog is unmounted rather than closed via
      // onClose (e.g. the parent conditionally rendering it away on some other state change).
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  // Los nombres de la maqueta y sus tres medidas literales
  // (`prototipo/src/ui/Dialog.tsx:88-92`). `sm`/`lg`/`xl` se conservan como llaves porque son
  // lo que escriben las 24 llamadas; lo que cambia es a cuánto miden.
  const ancho = { sm: "max-w-[26rem]", lg: "max-w-[40rem]", xl: "max-w-[58rem]" }[size];

  return (
    <div
      role="presentation"
      // El velo: `bg-[color:var(--veil)]` y no una clase de opacidad. `bg-bg/70` no compila en
      // este proyecto —los colores se declaran como `var(--bg)` sin `<alpha-value>` y Tailwind
      // descarta la utilidad entera—, así que durante meses los diálogos salieron SIN oscurecido
      // detrás. `--veil` es un token de verdad y sí se pinta.
      //
      // `justify-end` + `items-stretch`: el cajón se pega a la derecha y ocupa toda la altura.
      // Sin `p-s4`: un cajón no flota, se apoya en el borde.
      className="anim-surge fixed inset-0 z-40 flex items-stretch justify-end bg-[color:var(--veil)] backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={[
          "flex h-full w-full flex-col border-l border-copper font-chrome text-chrome-sm shadow-2xl outline-none",
          // `bg-vellum` / `text-vellum-ink` son los tokens que ya viste la vitela en `Panel`;
          // la TEXTURA (las dos manchas radiales de la maqueta) es de la capa visual y entra
          // con su carril.
          pergamino ? "bg-vellum font-world text-vellum-ink" : "bg-surface text-text",
          ancho,
        ].join(" ")}
      >
        <header className="flex items-start justify-between gap-s4 border-b border-muted px-s5 py-s4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className={`font-title text-chrome-lg ${pergamino ? "text-copper-text" : "text-text"}`}
            >
              {title}
            </h2>
            {subtitulo && <div className="mt-s1 text-chrome-xs text-muted">{subtitulo}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar (Escape)"
            className="shrink-0 rounded-radius-sm p-s1 text-muted transition-colors hover:text-text"
          >
            {/* Dibujado, nunca un glifo de fuente: regla vinculante de docs/04-convenciones.md. */}
            <IconoCerrar className="h-5 w-5" />
          </button>
        </header>

        {/* El cuerpo es lo único que scrollea. La cabecera y el pie se quedan quietos, que es
            justamente lo que un cuadro con `max-h-[85vh] overflow-y-auto` no podía dar: allí el
            título se iba hacia arriba al bajar por un formulario largo. */}
        <div data-dialog-cuerpo className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-s5 py-s4">
          {children}
        </div>

        {acciones && (
          <footer className="flex items-center justify-end gap-s2 border-t border-muted px-s5 py-s3">
            {acciones}
          </footer>
        )}
      </div>
    </div>
  );
}
