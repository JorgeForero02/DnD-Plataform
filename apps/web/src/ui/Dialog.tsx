import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** "lg" para formularios con texto largo (markdown + vista previa). */
  size?: "sm" | "lg";
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Task 1.19 — Dialog.test.tsx exercises the three behaviours load-bearing enough to name in
// the brief: focus moves into the dialog on open, Tab/Shift+Tab wrap inside it (the trap),
// Escape calls onClose, and focus returns to whatever triggered the dialog once it closes.
// Remove the useEffect below (or the keydown handler) and every one of those assertions fails
// while the dialog still renders its content — the trap is the whole point, not the markup.
export function Dialog({ open, onClose, title, children, size = "sm" }: DialogProps) {
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
    const focusables = dialogEl?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const first = focusables?.[0] ?? dialogEl;
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

  return (
    <div
      role="presentation"
      // No opacity modifier on the overlay: Tailwind's alpha channel syntax needs an
      // rgb()-shaped token, and the token rule here is "never a literal, never rgb()" — a
      // solid backdrop still separates the dialog from the page behind it.
      // Reseño 2026-09-02, tercera pasada — el velo era `bg-bg`, **opaco**: pintaba la pantalla
      // entera del color de la página, así que un diálogo no se leía como una capa sobre la
      // aplicación sino como otra pantalla. El autor lo describió exacto: "parecen abrir otra
      // pestaña". Un velo translúcido con desenfoque deja ver de dónde vienes, que es lo único
      // que un modal tiene que hacer bien. El panel es opaco por dentro, así que ni el
      // contraste del texto ni su medición cambian.
      // **El velo no se pintaba.** `bg-bg/75` es una clase de opacidad, y en este proyecto
      // ninguna compila: los colores se declaran como `var(--bg)` sin `<alpha-value>` y Tailwind
      // descarta la utilidad entera. O sea que los diálogos llevaban desde siempre **sin
      // oscurecido detrás** — solo el desenfoque —, que es justo lo que se arregló en el reseño
      // con el título «un modal que parece una capa». Nunca llegó a la pantalla.
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--veil)] p-s4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        // Fix round 1 (post-1.19b review): max-h + overflow-y-auto here, once, instead of
        // every consumer re-adding it at screen level. The overlays this primitive replaced
        // were `fixed inset-0 … overflow-y-auto py-8`, so tall content scrolled; this
        // centred-flex container had no overflow handling at all, and only one of the four
        // converted editors (EntityEditor.tsx, the one with LinksPanel/CommentThread nested
        // in it) had added its own fix — CharacterEditor and SessionEditor's Guardar/Cancelar
        // row could overflow a short viewport with nothing to scroll. 85vh leaves at least
        // ~7.5vh clear above and below even on the shortest realistic viewport.
        // Reseño 2026-09-02, segunda pasada: `size="lg"` para los formularios que llevan un
        // cuerpo en markdown con su vista previa. En 28rem no cabe una frase de manual sin
        // romperla tres veces, y escribir en una columna estrecha es exactamente lo que hace
        // que un DM prefiera otra herramienta.
        className={[
          // La elevación es lo que dice "esto está encima": borde de cobre —el acento del
          // marco— y una sombra de verdad. Sin ellas, un panel del color de las tarjetas sobre
          // un velo tenue sigue pareciendo parte de la página.
          "max-h-[85vh] w-full overflow-y-auto rounded-radius-sm border border-copper bg-surface p-s4 font-chrome text-chrome-sm text-text shadow-2xl",
          size === "lg" ? "max-w-2xl" : "max-w-md",
        ].join(" ")}
      >
        <h2 id={titleId} className="mb-3 text-chrome-md font-semibold">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
